import { Buffer } from 'buffer';
import { isWakuConfigured } from '../lib/waku/isWakuConfigured';
import { decryptWakuPayload } from '../lib/waku/wakuCrypto';

export interface WakuAgentOptions<T> {
  /** Waku content topic to subscribe to */
  topic?: string;
  /** Replay history from the store when starting */
  replayHistory?: boolean;
  /** Extract the domain object from a parsed Waku message */
  extractItem?: (msg: any) => T | undefined;
  /** Called whenever an item is stored */
  onUpdate?: (item: T) => void;
  /** Allowed sender roles */
  allowedRoles?: string[];
  /** Additional validation */
  validateMessage?: (msg: any) => boolean | Promise<boolean>;
}

/**
 * Simple in-memory agent that can broadcast updates over Waku.
 * The actual Waku send function is provided by subclasses.
 */
export default class WakuAgent<T extends { id: string }> {
  protected store: Map<string, T> = new Map();
  private node: any | null = null;
  private decoder: any | null = null;
  private readyPromise: Promise<void> | null = null;
  protected hashCache: Set<string> = new Set();

  constructor(
    private sendFn: (item: T) => Promise<void>,
    private options: WakuAgentOptions<T> = {}
  ) {
    if (this.options.topic) {
      this.readyPromise = this.init();
    }
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

  ready(): Promise<void> {
    return this.readyPromise || Promise.resolve();
  }

  private async init() {
    if (!(await isWakuConfigured())) return;
    try {
      const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
      this.node = await createLightNode({ defaultBootstrap: true });
      await this.node.start();
      await waitForRemotePeer(this.node, [Protocols.Store, Protocols.LightPush]);
      if (!this.options.topic) return;
      this.decoder = this.node.createDecoder({ contentTopic: this.options.topic });
      const handler = async (msg: any) => {
        if (!msg.payload) return;
        const decoded = new TextDecoder().decode(msg.payload);
        const plaintext = await decryptWakuPayload(decoded);
        await this.processPayload(plaintext);
      };
      await this.node.filter!.subscribe(this.decoder, handler);

      if (this.options.replayHistory) {
        try {
          await this.node.store.queryWithOrderedCallback([this.decoder], handler, { pageSize: 100 });
        } catch (e) {
          console.error('Failed to replay Waku history', e);
        }
      }
    } catch (e) {
      console.error('Failed initializing WakuAgent', e);
    }
  }

  async processPayload(payload: string): Promise<void> {
    try {
      const parsed = JSON.parse(payload);
      if (!parsed.sender?.publicKey || !parsed.signature || !parsed.sender?.role) return;

      if (this.options.allowedRoles && !this.options.allowedRoles.includes(parsed.sender.role)) return;

      const { verify, etc: edBytes } = await import('@noble/ed25519');
      const { sha256 } = await import('@noble/hashes/sha256');
      const verifyObj = { ...parsed } as any;
      delete (verifyObj as any).signature;
      const hash = sha256(new TextEncoder().encode(JSON.stringify(verifyObj)));
      const hashHex = Buffer.from(hash).toString('hex');
      if (this.hashCache.has(hashHex)) return;
      const ok = await verify(edBytes.hexToBytes(parsed.signature), hash, edBytes.hexToBytes(parsed.sender.publicKey));
      if (!ok) return;

      if (this.options.validateMessage && !(await this.options.validateMessage(parsed))) return;

      const item = this.options.extractItem ? this.options.extractItem(parsed) : (parsed as T);
      if (item && item.id) {
        this.store.set(item.id, item);
        this.hashCache.add(hashHex);
        this.options.onUpdate?.(item);
      }
    } catch (e) {
      console.error('Invalid Waku message:', e);
    }
  }

  protected async broadcast(item: T) {
    try {
      if (await isWakuConfigured()) {
        await this.sendFn(item);
      }
    } catch (e) {
      console.error('Failed to broadcast Waku message', e);
    }
  }

  async stop() {
    if (this.decoder && this.node?.filter) {
      try {
        await this.node.filter.unsubscribe(this.decoder);
      } catch {}
    }
    await this.node?.stop();
    this.node = null;
    this.decoder = null;
  }
}

