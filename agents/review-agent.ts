import { Review } from '../types';
import { assertTonChain } from '../services/chain';
import { addReview, getReviews } from '@/features/reviews/services/tonReviews';
import ordersAgent from './orders-agent';
import productsAgent from './products-agent';
import storesAgent from './stores-agent';
import ensureTonWallet from '../utils/ensureTonWallet';

assertTonChain();

const TOPIC = '/blue-ocean/reviews/1';

class ReviewAgent {
  private subscribers: Set<(r: Review) => void> = new Set();

  private async ensureWallet() {
    await ensureTonWallet('Please connect your TON wallet to manage reviews.');
  }

  async add(review: Review): Promise<void> {
    await this.ensureWallet();

    if (!review.orderId) {
      throw new Error('Order reference required');
    }

    const order = await ordersAgent.get(review.orderId);
    const validOrder =
      order &&
      order.userId === review.userId &&
      order.status === 'delivered' &&
      order.items.some((i) => i.productId === review.productId);
    if (!validOrder) {
      throw new Error('Only completed orders can be reviewed');
    }

    const existing = await getReviews(review.productId);
    if (existing.some((r) => r.userId === review.userId)) {
      throw new Error('Duplicate review');
    }

    await addReview(review);
    this.subscribers.forEach((cb) => cb(review));
    const product = await productsAgent.get(review.productId);
    if (product) {
      await storesAgent.recordReview(product.storeId, review.rating);
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
