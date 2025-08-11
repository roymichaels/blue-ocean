import { Review } from '../types';
import tonAuth from '../services/tonAuth';
import { addReview, getReviews } from '../services/tonReviews';
import ordersAgent from './orders-agent';

const TOPIC = '/congress/reviews/1';

class ReviewAgent {
  private subscribers: Set<(r: Review) => void> = new Set();

  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage reviews.');
    }
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
