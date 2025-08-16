import { Product } from '../types';
import {
  setProduct,
  getProduct,
  listProducts,
  removeProduct,
} from '../services/tonProducts';
import { getStore } from '../services/tonStores';
import ensureTonWallet from '../utils/ensureTonWallet';
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
import { getPrivateKey, getPublicKeyHex } from '../services/localIdentity';
import { sign } from '@noble/ed25519';
import type { WakuMessage } from '../types/waku';
import { errorLog } from '../utils/logger';
import { productUpdatedSchema } from '../schemas/waku/product.updated';

const PRODUCT_TOPIC = '/blue-ocean/products/1';

interface ProductSummary {
  rating: number;
  reviews: number;
}

class ProductsAgent {
  private cache: Map<string, Product> = new Map();
  private summaries: Map<string, ProductSummary> = new Map();
  private node: LightNode | null = null;

  constructor() {
    void this.subscribe();
  }

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

  private async subscribe() {
    const n = await this.ensureNode();
    if (!n) return;
    const decoder = createDecoder(PRODUCT_TOPIC);
    const handler = async (wakuMsg: any) => {
      if (!wakuMsg.payload) return;
      try {
        const raw = JSON.parse(bytesToUtf8(wakuMsg.payload));
        const signed = await verifyBeforeWrite(raw, productUpdatedSchema);
        if (!signed) return;
        const prod = signed.payload;
        this.cache.set(prod.id, prod);
        this.summaries.set(prod.id, {
          rating: prod.rating,
          reviews: prod.reviews,
        });
      } catch (err) {
        errorLog('Failed to process product update', err);
      }
    };
    (n.relay as any).addObserver(handler, [decoder]);
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
      const encoder = createEncoder({ contentTopic: PRODUCT_TOPIC });
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
    const store = await getStore(storeId);
    if (!store || store.owner !== address) {
      throw new Error('Only the store owner can manage products');
    }
  }

  async add(item: Product): Promise<void> {
    await this.assertStoreOwner(item.storeId);
    await setProduct(item);
    this.cache.set(item.id, item);
    this.summaries.set(item.id, { rating: item.rating, reviews: item.reviews });
    await this.broadcast(item);
  }

  async update(item: Product): Promise<void> {
    await this.assertStoreOwner(item.storeId);
    await setProduct(item);
    this.cache.set(item.id, item);
    this.summaries.set(item.id, { rating: item.rating, reviews: item.reviews });
    await this.broadcast(item);
  }

  async remove(id: string): Promise<void> {
    const prod = await getProduct(id);
    if (!prod) return;
    await this.assertStoreOwner(prod.storeId);
    await removeProduct(id);
    this.cache.delete(id);
    this.summaries.delete(id);
  }

  async get(id: string): Promise<Product | null> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const prod = await getProduct(id);
    if (prod) {
      this.cache.set(id, prod);
      this.summaries.set(id, { rating: prod.rating, reviews: prod.reviews });
    }
    return prod;
  }

  async getAll(): Promise<Product[]> {
    if (this.cache.size > 0) return Array.from(this.cache.values());
    const prods = await listProducts();
    prods.forEach((p) => {
      this.cache.set(p.id, p);
      this.summaries.set(p.id, { rating: p.rating, reviews: p.reviews });
    });
    return prods;
  }

  async getSummary(id: string): Promise<ProductSummary> {
    const cached = this.summaries.get(id);
    if (cached) return cached;
    const prod = await this.get(id);
    return prod ? { rating: prod.rating, reviews: prod.reviews } : { rating: 0, reviews: 0 };
  }

  async decrementStock(productId: string, quantity: number): Promise<void> {
    const prod = await getProduct(productId);
    if (!prod) return;
    await this.assertStoreOwner(prod.storeId);
    const newStock = Math.max((prod.stock || 0) - quantity, 0);
    await setProduct({ ...prod, stock: newStock });
  }
}

export default new ProductsAgent();
