import { Review } from '../types';
import { assertNearChain } from '@/services/chain';
import { addReview, getReviews } from '@/features/reviews/services/nearReviews';
import ordersAgent from './orders-agent';
import { selectProduct } from './products-agent';
import storesAgent from './stores-agent';
import ensureNearWallet from '../utils/ensureNearWallet';
import { normalizeMessage } from '../lib/normalizeMessage';
import AgentError from '@/types/AgentError';

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
      throw new AgentError('ORDER_REFERENCE_REQUIRED', 'Order reference required', 'review-agent');
    }

    const order = await ordersAgent.get(normalized.orderId);
    const validOrder =
      order &&
      order.userId === normalized.userId &&
      order.status === 'delivered' &&
      order.items.some((i) => i.productId === normalized.productId);
    if (!validOrder) {
      throw new AgentError('INVALID_ORDER_STATE', 'Only completed orders can be reviewed', 'review-agent');
    }

    const existing = await getReviews(normalized.productId);
    if (existing.some((r) => r.userId === normalized.userId)) {
      throw new AgentError('DUPLICATE_REVIEW', 'Duplicate review', 'review-agent');
    }

    await addReview(review);
    this.subscribers.forEach((cb) => cb(review));
    const product = await selectProduct(review.productId);

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
