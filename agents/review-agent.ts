import { Review } from '../types';
import { assertNearChain } from '../services/chain';
import { addReview, getReviews } from '@/features/reviews/services/nearReviews';
import ordersAgent from './orders-agent';
import productsAgent from './products-agent';
import storesAgent from './stores-agent';
import ensureNearWallet from '../utils/ensureNearWallet';
import { normalizeMessage } from '../lib/normalizeMessage';

assertNearChain();

const TOPIC = '/blue-ocean/reviews/1';

class ReviewAgent {
  private subscribers: Set<(r: Review) => void> = new Set();

  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to manage reviews.');
  }

  async add(review: Review): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Review>('Review', review);

    if (!normalized.orderId) {
      throw new Error('Order reference required');
    }

    const order = await ordersAgent.get(normalized.orderId);
    const validOrder =
      order &&
      order.userId === normalized.userId &&
      order.status === 'delivered' &&
      order.items.some((i) => i.productId === normalized.productId);
    if (!validOrder) {
      throw new Error('Only completed orders can be reviewed');
    }

    const existing = await getReviews(normalized.productId);
    if (existing.some((r) => r.userId === normalized.userId)) {
      throw new Error('Duplicate review');
    }

    await addReview(normalized);
    this.subscribers.forEach((cb) => cb(normalized));
    const product = await productsAgent.get(normalized.productId);
    if (product) {
      await storesAgent.recordReview(product.storeId, normalized.rating);
    }
  }

  async getByProduct(productId: string): Promise<Review[]> {
    return await getReviews(productId);
  }

  subscribe(cb: (r: Review) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (r: Review) => void) {
    this.subscribers.delete(cb);
  }
}

export default new ReviewAgent();
export { TOPIC };
