import { Review } from '../types';
import tonAuth from '../services/tonAuth';
import { addReview, getReviews } from '../services/tonReviews';

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
