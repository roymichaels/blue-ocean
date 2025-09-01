import { Store } from '@/types';
import { assertTonChain } from '@/services/chain';
import {
  setStore,
  getStore,
  listStores,
  removeStore,
} from '@/features/stores/services/tonStores';
import ensureTonWallet from '@/utils/ensureTonWallet';

assertTonChain();

interface Metrics {
  reviewSum: number;
  reviewCount: number;
  reliability: number;
  score: number;
}

class StoresAgent {
  private reputation: Record<string, Metrics> = {};
  private subscribers: Set<(id: string, score: number) => void> = new Set();

  private async ensureWallet() {
    await ensureTonWallet('Please connect your TON wallet to manage stores.');
  }

  private toRecord(item: Store) {
    const { id, name, owner, nftId, reputation = 0 } = item;
    return { id, name, owner, nftId, reputation };
  }

  private computeScore(id: string) {
    const m = this.reputation[id];
    const avg = m.reviewCount > 0 ? m.reviewSum / m.reviewCount : 0;
    m.score = (avg + m.reliability * 5) / 2;
    this.subscribers.forEach((cb) => cb(id, m.score));
  }

  async recordReview(storeId: string, rating: number) {
    if (!this.reputation[storeId]) {
      this.reputation[storeId] = { reviewSum: 0, reviewCount: 0, reliability: 0, score: 0 };
    }
    const m = this.reputation[storeId];
    m.reviewSum += rating;
    m.reviewCount += 1;
    this.computeScore(storeId);
    const store = await getStore(storeId, storeId);
    if (store) {
      await setStore(storeId, this.toRecord({ ...store, reputation: m.score }));
    }
  }

  async updateReputationByOwner(owner: string, reliability: number): Promise<void> {
    const stores = await listStores('default');
    const store = stores.find((s) => s.owner === owner);
    if (store) {
      const id = store.id;
      if (!this.reputation[id]) {
        this.reputation[id] = { reviewSum: 0, reviewCount: 0, reliability: 0, score: 0 };
      }
      this.reputation[id].reliability = reliability;
      this.computeScore(id);
      await setStore('default', this.toRecord({ ...store, reputation: this.reputation[id].score }));
    }
  }

  getReputationScore(id: string): number {
    return this.reputation[id]?.score || 0;
  }

  subscribe(cb: (id: string, score: number) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (id: string, score: number) => void) {
    this.subscribers.delete(cb);
  }

  async add(item: Store): Promise<void> {
    await this.ensureWallet();
    await setStore(item.id, this.toRecord(item));
  }

  async update(item: Store): Promise<void> {
    await this.ensureWallet();
    await setStore(item.id, this.toRecord(item));
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    await removeStore(id, id);
  }

  async get(id: string): Promise<Store | null> {
    return await getStore(id, id);
  }

  async getAll(): Promise<Store[]> {
    return await listStores('default');
  }
}

export default new StoresAgent();
