import { Store } from '@/types';
import { assertNearChain } from '@/services/chain';
import {
  addStore,
  updateStore,
  removeStore,
  selectStore as fetchStore,
  listStores as fetchStores,
} from '@/features/stores/services/nearStores';
import { normalizeMessage } from '../lib/normalizeMessage';
import { publish } from '@/services/waku';
import { buildTopic } from '@/utils/wakuTopics';
import { getPrivateKey, getPublicKeyHex } from '@/services/localIdentity';
import { sign } from '@noble/ed25519';
import { canonicalJson } from '@/utils/serialization';
import type { WakuMessage } from '@/types/waku';
import ensureNearWallet from '@/utils/ensureNearWallet';

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

  private toRecord(item: Store) {
    const { id, name, owner, nftId, reputation = 0, plan, createdAt } = item;
    return { id, name, owner, nftId, reputation, plan, createdAt } as Store;
  }

  private calculateScore(id: string): number {
    const m = this.reputation[id];
    const avg = m.reviewCount > 0 ? m.reviewSum / m.reviewCount : 0;
    return (avg + m.reliability * 5) / 2;
  }


  async recordReview(storeId: string, rating: number) {
    if (!this.reputation[storeId]) {
      this.reputation[storeId] = { reviewSum: 0, reviewCount: 0, reliability: 0, score: 0 };
    }
    const m = this.reputation[storeId];
    m.reviewSum += rating;
    m.reviewCount += 1;
    const newScore = this.calculateScore(storeId);
    const store = await fetchStore(storeId);
    if (store) {
      try {
        await updateStore(this.toRecord({ ...store, reputation: newScore }));
        const confirmed = await fetchStore(storeId);
        if (confirmed) {
          m.score = confirmed.reputation || newScore;
          this.subscribers.forEach((cb) => cb(storeId, m.score));
        }
      } catch {
        m.reviewSum -= rating;
        m.reviewCount -= 1;
      }
    }
  }

  async updateReputationByOwner(owner: string, reliability: number): Promise<void> {
    const stores = await fetchStores('default');
    const store = stores.find((s) => s.owner === owner);
    if (store) {
      const id = store.id;
      if (!this.reputation[id]) {
        this.reputation[id] = { reviewSum: 0, reviewCount: 0, reliability: 0, score: 0 };
      }
      const prev = this.reputation[id].reliability;
      this.reputation[id].reliability = reliability;
      const newScore = this.calculateScore(id);
      try {
        await updateStore(this.toRecord({ ...store, reputation: newScore }));
        const confirmed = await fetchStore(id);
        if (confirmed) {
          this.reputation[id].score = confirmed.reputation || newScore;
          this.subscribers.forEach((cb) => cb(id, this.reputation[id].score));
        }
      } catch {
        this.reputation[id].reliability = prev;
      }
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

  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to manage stores.');
  }

  async add(item: Store): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Store>('Store', item);
    const record = this.toRecord({
      createdAt: normalized.createdAt || new Date().toISOString(),
      ...normalized,
    });
    await addStore(record);
    await this.broadcastCreated(record);
  }

  async update(item: Store): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Store>('Store', item);
    const rec = this.toRecord(normalized);
    await updateStore(rec);
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    await removeStore(id);
  }

  /**
   * Returns a defensive copy of a store by id.
   */
  async selectStore(id: string): Promise<Store | null> {
    const store = await fetchStore(id);
    return store ? JSON.parse(JSON.stringify(store)) : null;
  }

  /**
   * Returns defensive copies of all stores.
   */
  async getStores(): Promise<Store[]> {
    const list = await fetchStores('default');
    return list.map((s) => JSON.parse(JSON.stringify(s)));
  }

  private async broadcastCreated(store: Store): Promise<void> {
    try {
      const msg = await makeSignedMessage('store.created', store);
      await publish(buildTopic('stores', '1'), msg);
    } catch {
      // non-fatal
    }
  }
}

const storesAgent = new StoresAgent();

export const getStores = (): Promise<Store[]> => storesAgent.getStores();
export const selectStore = (id: string): Promise<Store | null> =>
  storesAgent.selectStore(id);

export default storesAgent;

async function makeSignedMessage(type: string, payload: any): Promise<WakuMessage<any>> {
  const priv = await getPrivateKey();
  const pub = await getPublicKeyHex();
  const msg: WakuMessage<any> = {
    type,
    payload,
    sender: { publicKey: pub, role: 'store-owner' },
    signature: '',
  };
  const toSign = new TextEncoder().encode(
    canonicalJson({ type: msg.type, payload: msg.payload, sender: msg.sender }),
  );
  const sig = await sign(toSign, priv);
  msg.signature = Buffer.from(sig).toString('hex');
  return msg;
}
