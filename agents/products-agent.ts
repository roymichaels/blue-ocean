import { Product } from '@/types';
import { assertNearChain } from '@/services/chain';
import { canonicalJson } from '@/utils/serialization';
import {
  setProduct,
  getProduct,
  listProducts,
  removeProduct,
  getProducts as fetchProducts,
  getVersion,
} from '@/features/products/services/nearProducts';
import { getStore } from '@/features/stores/services/nearStores';
import ensureNearWallet from '@/utils/ensureNearWallet';
import type { LightNode } from '@waku/sdk';
import { getClient } from '@/utils/transport';
import { verifyBeforeWrite } from '@/utils/verifyMessageSignature';
import { productUpdatedSchema } from '../schemas/waku/product.updated';
import { errorLog } from '@/utils/logger';
import { buildTopic } from '@/utils/wakuTopics';
import { normalizeMessage } from '../lib/normalizeMessage';
import AgentError from '@/types/AgentError';
import isAdmin from '@/utils/isAdmin';
import { makeSignedWakuMessage } from '@/utils/wakuSigning';
import { randomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';

import {
  getProductCache,
  setProductCache,
  clearProductCache,
} from '@/features/products/services/productCache';

const buildProductTopic = (storeId: string) => buildTopic('products', storeId);
const PAGE_SIZE = 50;

assertNearChain();

// TODO:TODO-108 Separate ProductAgent concerns for cache hydration, Waku broadcasts, and persistence to simplify reasoning.
// TODO:REC-208 Adopt incremental diff sync for product updates to minimize payload sizes over Waku relays.
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
      const { createLightNode, waitForRemotePeer, Protocols } = await getClient();
      const node = await createLightNode({} as any);
      await node.start();
      await waitForRemotePeer(node, [Protocols.Relay]);
      this.node = node;
      return node;
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
    const client = await getClient();
    const topic = buildProductTopic(storeId);
    const decoder = client.createDecoder(topic);
    const handler = async (wakuMsg: any) => {
      if (!wakuMsg.payload) return;
      try {
        const raw = JSON.parse(client.bytesToUtf8(wakuMsg.payload));
        const signed = await verifyBeforeWrite(raw, productUpdatedSchema, undefined, topic);
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
      const batch = await fetchProducts('default', slice);
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
      // TODO:CORE-020 Angle 1 - Mirror product updates into the stock analytics stream once the topic contract is finalized.
      const ts = Date.now();
      const nonce = Buffer.from(randomBytes(12)).toString('hex');
      const msg = await makeSignedWakuMessage(
        'product.updated',
        { product, ts, nonce },
        'store-owner',
        { ts, nonce },
      );
      const client = await getClient();
      const encoder = client.createEncoder({
        contentTopic: buildProductTopic(product.storeId),
      });
      await n.lightPush.send(encoder, {
        payload: client.utf8ToBytes(canonicalJson(msg)),
      });
    } catch (err) {
      errorLog('Failed to broadcast product update', err);
    }
  }

  private async ensureWallet() {
    const { address, publicKey } = await ensureNearWallet(
      'Please connect your NEAR wallet to manage products.',
    );
    return { address, publicKey };
  }

  private async assertStoreOwner(storeId: string) {
    const { address } = await this.ensureWallet();
    const store = await getStore(storeId, storeId);
    const admin = await isAdmin();
    if (!store || store.owner !== address || !admin) {
      throw new AgentError(
        'UNAUTHORIZED',
        'Only approved admins can manage products',
        'products-agent',
      );
    }
  }

  async add(item: Product): Promise<void> {
    const normalized = normalizeMessage<Product>('Product', item);
    await this.assertStoreOwner(normalized.storeId);
    await setProduct(normalized.storeId, normalized);
    this.cache.set(normalized.id, normalized);
    this.summaries.set(normalized.id, {
      rating: normalized.rating,
      reviews: normalized.reviews,
    });
    await this.subscribeStore(normalized.storeId);
    await this.broadcast(normalized);
  }

  async update(item: Product): Promise<void> {
    const normalized = normalizeMessage<Product>('Product', item);
    await this.assertStoreOwner(normalized.storeId);
    await setProduct(normalized.storeId, normalized);
    this.cache.set(normalized.id, normalized);
    this.summaries.set(normalized.id, {
      rating: normalized.rating,
      reviews: normalized.reviews,
    });
    await this.subscribeStore(normalized.storeId);
    await this.broadcast(normalized);
  }

  async remove(id: string): Promise<void> {
    const prod = this.cache.get(id);
    if (!prod) return;
    await this.assertStoreOwner(prod.storeId);
    await removeProduct(prod.storeId, id);
    this.cache.delete(id);
    this.summaries.delete(id);
  }

  /**
   * Returns a defensive copy of the requested product.
   * Mutating the result will not affect the internal cache.
   */
  async selectProduct(id: string): Promise<Product | null> {
    await this.ensureCache();
    const cached = this.cache.get(id);
    if (cached) return JSON.parse(JSON.stringify(cached));
    const prod = await getProduct('default', id);
    if (prod) {
      this.cache.set(id, prod);
      this.summaries.set(id, { rating: prod.rating, reviews: prod.reviews });
      return JSON.parse(JSON.stringify(prod));
    }
    return null;
  }

  /**
   * Returns a new array containing defensive copies of all cached products.
   */
  async getProducts(): Promise<Product[]> {
    await this.ensureCache();
    return Array.from(this.cache.values()).map((p) =>
      JSON.parse(JSON.stringify(p)),
    );
  }

  /**
   * Returns an immutable summary object for the given product id.
   */
  async getSummary(id: string): Promise<ProductSummary> {
    const cached = this.summaries.get(id);
    if (cached) return { ...cached };
    const prod = await this.selectProduct(id);
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

const productsAgent = new ProductsAgent();

/**
 * Selector returning a defensive copy of all products.
 */
export const getProducts = (): Promise<Product[]> => productsAgent.getProducts();

/**
 * Selector returning a defensive copy of a product by id.
 */
export const selectProduct = (id: string): Promise<Product | null> =>
  productsAgent.selectProduct(id);

export default productsAgent;
