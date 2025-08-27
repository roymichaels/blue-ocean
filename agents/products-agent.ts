import { Product } from '../types';
import { assertTonChain } from '../services/chain';
import {
  setProduct,
  getProduct,
  listProducts,
  removeProduct,
  getProducts,
  getVersion,
} from '../services/tonProducts';
import { getStore } from '../services/tonStores';
import ensureTonWallet from '../utils/ensureTonWallet';

assertTonChain();
import {
  LightNode,
  createLightNode,
  waitForRemotePeer,
  createEncoder,
  createDecoder,
  Protocols,
  utf8ToBytes,
  bytesToUtf8,
} from '@waku/sdk';
import { getWakuBootstrapNodes } from '../utils/appConfig';
import { verifyBeforeWrite } from '../utils/verifyBeforeWrite';
import { productUpdatedSchema } from '../schemas/waku/product.updated';
import { getPrivateKey, getPublicKeyHex } from '../services/localIdentity';
import { sign } from '@noble/ed25519';
import type { WakuMessage } from '../types/waku';
import { errorLog } from '../utils/logger';
import { buildTopic } from '../utils/wakuTopics';

import {
  getProductCache,
  setProductCache,
  clearProductCache,
} from '../services/productCache';

const buildProductTopic = (storeId: string) => buildTopic('products', storeId);
const PAGE_SIZE = 50;

interface ProductSummary {
  rating: number;
  reviews: number;
}

class ProductsAgent {
  private cache: Map<string, Product> = new Map();
  private summaries: Map<string, ProductSummary> = new Map();
  private node: LightNode | null = null;
  private version = 0;
  private loading: Promise<void> | null = null;
  private subscribedStores: Set<string> = new Set();

  constructor() {}

  private async ensureNode(): Promise<LightNode | null> {
    if (this.node) return this.node;
    try {
      const bootstrap = getWakuBootstrapNodes();
      if (bootstrap.length === 0) return null;
      this.node = await createLightNode({ libp2p: { bootstrap } as any });
      await this.node.start();
      await waitForRemotePeer(this.node, [Protocols.Relay]);
      return this.node;
    } catch (err) {
      errorLog('Failed to start Waku node', err);
      this.node = null;
      return null;
    }
  }

  private async subscribeStore(storeId: string) {
    if (this.subscribedStores.has(storeId)) return;
    const n = await this.ensureNode();
    if (!n) return;
    const decoder = createDecoder(buildProductTopic(storeId));
    const handler = async (wakuMsg: any) => {
      if (!wakuMsg.payload) return;
      try {
        const raw = JSON.parse(bytesToUtf8(wakuMsg.payload));
        const signed = await verifyBeforeWrite(raw, productUpdatedSchema);
        if (!signed) return;
        void this.invalidateCache();
      } catch (err) {
        errorLog('Failed to process product update', err);
      }
    };
    (n.relay as any).addObserver(handler, [decoder]);
    this.subscribedStores.add(storeId);
  }

  private async invalidateCache() {
    this.cache.clear();
    this.summaries.clear();
    this.version = 0;
    await clearProductCache();
  }

  private async loadFromIndex(index: string[]): Promise<void> {
    for (let i = 0; i < index.length; i += PAGE_SIZE) {
      const slice = index.slice(i, i + PAGE_SIZE);
      const batch = await getProducts('default', slice);
      batch.forEach((p) => {
        this.cache.set(p.id, p);
        this.summaries.set(p.id, { rating: p.rating, reviews: p.reviews });
      });
    }
  }

  private async ensureCache(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const chainVersion = await getVersion();
      if (this.cache.size > 0 && this.version === chainVersion) {
        this.loading = null;
        return;
      }
      const cached = await getProductCache();
      if (cached && cached.version === chainVersion) {
        await this.loadFromIndex(cached.index);
        this.version = chainVersion;
      } else {
        await this.invalidateCache();
        const products = await listProducts('default');
        const ids = products.map((p) => p.id);
        await this.loadFromIndex(ids);
        await setProductCache({ version: chainVersion, index: ids });
        this.version = chainVersion;
      }
      this.loading = null;
    })();
    await this.loading;
  }

  private async broadcast(product: Product) {
    const n = await this.ensureNode();
    if (!n) return;
    try {
      const priv = await getPrivateKey();
      const pub = await getPublicKeyHex();
      const msg: WakuMessage<Product> = {
        type: 'product.updated',
        payload: product,
        sender: { publicKey: pub },
        signature: '',
      };
      const msgBytes = new TextEncoder().encode(
        JSON.stringify({ type: msg.type, payload: msg.payload, sender: msg.sender }),
      );
      const sig = await sign(msgBytes, priv);
      msg.signature = Buffer.from(sig).toString('hex');
      const encoder = createEncoder({ contentTopic: buildProductTopic(product.storeId) });
      await n.lightPush.send(encoder, {
        payload: utf8ToBytes(JSON.stringify(msg)),
      });
    } catch (err) {
      errorLog('Failed to broadcast product update', err);
    }
  }

  private async ensureWallet() {
    const { address } = await ensureTonWallet(
      'Please connect your TON wallet to manage products.',
    );
    return { address };
  }

  private async assertStoreOwner(storeId: string) {
    const { address } = await this.ensureWallet();
    const store = await getStore(storeId, storeId);
    if (!store || store.owner !== address) {
      throw new Error('Only the store owner can manage products');
    }
  }

  async add(item: Product): Promise<void> {
    await this.assertStoreOwner(item.storeId);
    await setProduct(item.storeId, item);
    this.cache.set(item.id, item);
    this.summaries.set(item.id, { rating: item.rating, reviews: item.reviews });
    await this.subscribeStore(item.storeId);
    await this.broadcast(item);
  }

  async update(item: Product): Promise<void> {
    await this.assertStoreOwner(item.storeId);
    await setProduct(item.storeId, item);
    this.cache.set(item.id, item);
    this.summaries.set(item.id, { rating: item.rating, reviews: item.reviews });
    await this.subscribeStore(item.storeId);
    await this.broadcast(item);
  }

  async remove(id: string): Promise<void> {
    const prod = this.cache.get(id);
    if (!prod) return;
    await this.assertStoreOwner(prod.storeId);
    await removeProduct(prod.storeId, id);
    this.cache.delete(id);
    this.summaries.delete(id);
  }

  async get(id: string): Promise<Product | null> {
    await this.ensureCache();
    const cached = this.cache.get(id);
    if (cached) return cached;
    const prod = await getProduct('default', id);
    if (prod) {
      this.cache.set(id, prod);
      this.summaries.set(id, { rating: prod.rating, reviews: prod.reviews });
    }
    return prod;
  }

  async getAll(): Promise<Product[]> {
    await this.ensureCache();
    return Array.from(this.cache.values());
  }

  async getSummary(id: string): Promise<ProductSummary> {
    const cached = this.summaries.get(id);
    if (cached) return cached;
    const prod = await this.get(id);
    return prod ? { rating: prod.rating, reviews: prod.reviews } : { rating: 0, reviews: 0 };
  }

  async decrementStock(productId: string, quantity: number): Promise<void> {
    const prod = this.cache.get(productId) || (await getProduct('default', productId));
    if (!prod) return;
    await this.assertStoreOwner(prod.storeId);
    const newStock = Math.max((prod.stock || 0) - quantity, 0);
    await setProduct(prod.storeId, { ...prod, stock: newStock });
  }
}

export default new ProductsAgent();
