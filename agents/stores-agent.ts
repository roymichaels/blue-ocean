import { Store } from '@/types';
import { assertNearChain } from '@services/chain';
import {
  setStore,
  getStore,
  listStores,
  removeStore,
} from '@features/stores/services/nearStores';
import ensureNearWallet from '@/utils/ensureNearWallet';
import { normalizeMessage } from '../lib/normalizeMessage';

assertNearChain();

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
    await ensureNearWallet('Please connect your NEAR wallet to manage stores.');
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
    const normalized = normalizeMessage<Store>('Store', item);
    await setStore(normalized.id, this.toRecord(normalized));
  }

  async update(item: Store): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Store>('Store', item);
    await setStore(normalized.id, this.toRecord(normalized));
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    await removeStore(id, id);
  }

  /**
   * Returns a defensive copy of a store by id.
   */
  async selectStore(id: string): Promise<Store | null> {
    const store = await getStore(id, id);
    return store ? JSON.parse(JSON.stringify(store)) : null;
  }

  /**
   * Returns defensive copies of all stores.
   */
  async getStores(): Promise<Store[]> {
    const list = await listStores('default');
    return list.map((s) => JSON.parse(JSON.stringify(s)));
  }
}

const storesAgent = new StoresAgent();

export const getStores = (): Promise<Store[]> => storesAgent.getStores();
export const selectStore = (id: string): Promise<Store | null> =>
  storesAgent.selectStore(id);

export default storesAgent;
