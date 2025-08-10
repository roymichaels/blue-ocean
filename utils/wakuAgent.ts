import { Buffer } from 'buffer';
import TonWeb from 'tonweb';
import { decryptWakuPayload } from '../lib/waku/wakuCrypto';
import { getNode, subscribe, unsubscribe } from '../lib/waku/nodeSingleton';

const tonweb = new TonWeb();

export interface WakuAgentOptions<T> {
  /** Waku content topic to subscribe to */
  topic?: string;
  /** Replay history from the store when starting */
  replayHistory?: boolean;
  /** Extract the domain object from a parsed Waku message */
  extractItem?: (msg: any) => T | undefined;
  /** Called whenever an item is stored */
  onUpdate?: (item: T) => void;
  /** Additional validation */
  validateMessage?: (msg: any) => boolean | Promise<boolean>;
  /** Require TON signatures on incoming messages */
  requireSignature?: boolean;
  /** Maximum number of entries to keep in the hash cache */
  hashCacheSize?: number;
  /** Time-to-live for hash cache entries in milliseconds */
  hashCacheTTL?: number;
}

/**
 * Simple in-memory agent that can broadcast updates over Waku.
 * The actual Waku send function is provided by subclasses.
 */
export default class WakuAgent<T extends { id: string }> {
  protected store: Map<string, T> = new Map();
  private node: any | null = null;
  private decoder: any | null = null;
  private handler: ((msg: any) => Promise<void>) | null = null;
  private readyPromise: Promise<void> | null = null;
  /** Exposed promise for external consumers */
  public ready: Promise<void> | null = null;
  protected hashCache: Map<string, number> = new Map();
  private hashCacheSize!: number;
  private hashCacheTTL!: number;

  constructor(
    private sendFn: (item: T, requireSignature?: boolean) => Promise<void>,
    private options: WakuAgentOptions<T> = {},
  ) {
    this.hashCacheSize = this.options.hashCacheSize ?? 1000;
    this.hashCacheTTL = this.options.hashCacheTTL ?? 5 * 60 * 1000; // default 5 minutes
    if (this.options.topic) {
      this.readyPromise = this.init();
      this.ready = this.readyPromise;
    }
  }

  async whenReady(): Promise<void> {
    if (!this.readyPromise) {
      if (this.options.topic) {
        this.readyPromise = this.init();
        this.ready = this.readyPromise;
      } else {
        return;
      }
    } else if (!this.node) {
      this.readyPromise = this.init();
      this.ready = this.readyPromise;
    }
    await this.readyPromise;
  }

  getAll(): T[] {
    return Array.from(this.store.values());
  }

  get(id: string): T | undefined {
    return this.store.get(id);
  }

  async add(item: T): Promise<void> {
    this.store.set(item.id, item);
    await this.broadcast(item);
    this.options.onUpdate?.(item);
  }

  async update(item: T): Promise<void> {
    this.store.set(item.id, item);
    await this.broadcast(item);
    this.options.onUpdate?.(item);
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }

  clearHashCache(): void {
    this.hashCache.clear();
  }

  private async init() {
    try {
      this.node = await getNode();
      if (!this.options.topic) return;
      this.handler = async (msg: any) => {
        if (!msg.payload) return;
        const decoded = new TextDecoder().decode(msg.payload);
        const plaintext = await decryptWakuPayload(decoded);
        await this.processPayload(plaintext);
      };
      this.decoder = await subscribe(this.options.topic, this.handler);

      if (this.options.replayHistory) {
        try {
          await this.node.store.queryWithOrderedCallback(
            [this.decoder],
            this.handler,
            { pageSize: 100 },
          );
        } catch (e) {
          console.error('Failed to replay Waku history', e);
        }
      }
    } catch (e) {
      console.error('Failed initializing WakuAgent', e);
      throw e; // allow callers to handle initialization errors
    }
  }

  async processPayload(payload: string): Promise<void> {
    try {
      this.pruneHashCache();
      if (this.hashCache.has(payload)) return;
      const parsed = JSON.parse(payload);
      const { signature, sender, ...unsigned } = parsed as any;

      if (this.options.requireSignature !== false) {
        if (!signature || !sender?.publicKey || !sender?.address) return;

        const message = JSON.stringify(unsigned);
        const msgBytes = Buffer.from(message, 'utf8');
        const sigBytes = Buffer.from(signature, 'base64');
        const pubKeyBytes = Buffer.from(sender.publicKey, 'hex');

        const isValid = TonWeb.utils.nacl.sign.detached.verify(
          msgBytes,
          sigBytes,
          pubKeyBytes,
        );
        if (!isValid) {
          console.error('Invalid TON signature');
          return;
        }

        const WalletClass = tonweb.wallet.all[tonweb.wallet.defaultVersion];
        const wallet = new WalletClass(tonweb.provider, {
          publicKey: pubKeyBytes,
          wc: 0,
        });
        const derived = (await wallet.getAddress()).toString(true, true, true);
        if (derived !== sender.address) {
          console.error('Signature address mismatch');
          return;
        }
      }

      if (
        this.options.validateMessage &&
        !(await this.options.validateMessage(parsed))
      )
        return;

      const hashKey = payload;
      if (this.hashCache.has(hashKey)) return;

      const item = this.options.extractItem
        ? this.options.extractItem(parsed)
        : (parsed as T);
      if (item && item.id) {
        this.store.set(item.id, item);

        this.hashCache.set(hashKey, Date.now());
        this.pruneHashCache();
        this.options.onUpdate?.(item);
      }
    } catch (e) {
      console.error('Invalid Waku message:', e);
    }
  }

  protected async broadcast(item: T) {
    try {
      await this.sendFn(item, this.options.requireSignature !== false);
    } catch (e) {
      console.error('Failed to broadcast Waku message', e);
      throw e;
    }
  }

  async stop() {
    if (this.options.topic && this.handler) {
      try {
        await unsubscribe(this.options.topic, this.handler);
      } catch {}
    }
    this.decoder = null;
    this.handler = null;
    this.node = null;
  }

  private pruneHashCache() {
    const now = Date.now();
    // Remove expired entries
    for (const [key, ts] of this.hashCache) {
      if (now - ts > this.hashCacheTTL) {
        this.hashCache.delete(key);
      } else {
        break;
      }
    }
    // Enforce max size
    while (this.hashCache.size > this.hashCacheSize) {
      const oldestKey = this.hashCache.keys().next().value;
      if (!oldestKey) break;
      this.hashCache.delete(oldestKey);
    }
  }
}
