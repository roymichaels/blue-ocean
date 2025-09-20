import type { WakuMessage } from '@/types/waku';
import type { Store } from '@/types';
import { normalizeMessage } from '../lib/normalizeMessage';
import { buildTopic } from '@/utils/wakuTopics';

const getTransportCrypto = () => (typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : undefined);

type NearStoresModule = typeof import('@/features/stores/services/nearStores');
let nearStoresModule: NearStoresModule | null = null;
async function getStoreServices(): Promise<NearStoresModule> {
  if (!nearStoresModule) {
    nearStoresModule = await import('@/features/stores/services/nearStores');
  }
  return nearStoresModule;
}

type EnsureNearWalletFn = typeof import('@/utils/ensureNearWallet').default;
let ensureNearWalletFn: EnsureNearWalletFn | null = null;
async function loadEnsureNearWallet(): Promise<EnsureNearWalletFn> {
  if (!ensureNearWalletFn) {
    const mod = await import('@/utils/ensureNearWallet');
    ensureNearWalletFn = mod.default;
  }
  return ensureNearWalletFn;
}

type PublishFn = typeof import('@/services/waku').publish;
type MakeSignedMessageFn = typeof import('@/utils/wakuSigning').makeSignedWakuMessage;
let wakuDeps: { publish: PublishFn; makeSignedWakuMessage: MakeSignedMessageFn } | null = null;
async function loadWakuDeps(): Promise<{ publish: PublishFn; makeSignedWakuMessage: MakeSignedMessageFn }> {
  if (!wakuDeps) {
    const [wakuModule, signingModule] = await Promise.all([
      import('@/services/waku'),
      import('@/utils/wakuSigning'),
    ]);
    wakuDeps = {
      publish: wakuModule.publish,
      makeSignedWakuMessage: signingModule.makeSignedWakuMessage,
    };
  }
  return wakuDeps;
}

// TODO:TODO-111 Extend StoresAgent to track multi-tenant metrics and avoid namespace collisions for shared storefronts.
// TODO:REC-211 Publish reputation score updates via analytics topic so UI dashboards can react in real time.
interface Metrics {
  reviewSum: number;
  reviewCount: number;
  reliability: number;
  score: number;
}

class StoresAgent {
  private reputation: Record<string, Metrics> = {};
  private subscribers: Set<(id: string, score: number) => void> = new Set();

  private async ensureWallet(): Promise<{ address: string; publicKey: string }> {
    const ensureWallet = await loadEnsureNearWallet();
    return ensureWallet('Please connect your NEAR wallet to manage stores.');
  }

  private getNamespace(store: Store): string {
    const owner = typeof store.owner === 'string' ? store.owner.trim() : '';
    return owner || 'default';
  }

  private async persistStore(store: Store): Promise<Store> {
    const services = await getStoreServices();
    const record = this.toRecord(store);
    const namespace = this.getNamespace(record);
    const existing = await services.selectStore(namespace, record.id);
    if (existing) {
      await services.updateStore(record, namespace);
    } else {
      await services.addStore(record, namespace);
    }
    return record;
  }

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
    const services = await getStoreServices();
    const store = await services.selectStore(storeId);
    if (store) {
      try {
        await this.persistStore({ ...store, reputation: newScore });
        const confirmed = await services.selectStore(storeId);
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
    const services = await getStoreServices();
    const stores = await services.listStores('default');
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
        await this.persistStore({ ...store, reputation: newScore });
        const confirmed = await services.selectStore(id);
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

  async add(item: Store): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Store>('Store', item);
    const record = await this.persistStore({
      createdAt: normalized.createdAt || new Date().toISOString(),
      ...normalized,
    });
    await this.broadcastCreated(record);
  }

  async update(item: Store): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Store>('Store', item);
    await this.persistStore(normalized);
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    const services = await getStoreServices();
    await services.removeStore(id);
  }

  /**
   * Returns a defensive copy of a store by id.
   */
  async selectStore(id: string): Promise<Store | null> {
    const services = await getStoreServices();
    const store = await services.selectStore(id);
    return store ? JSON.parse(JSON.stringify(store)) : null;
  }

  /**
   * Returns defensive copies of all stores.
   */
  async getStores(): Promise<Store[]> {
    const services = await getStoreServices();
    const list = await services.listStores('default');
    return list.map((s) => JSON.parse(JSON.stringify(s)));
  }

  private async broadcastCreated(store: Store): Promise<void> {
    try {
      const { publish, makeSignedWakuMessage } = await loadWakuDeps();
      const transportCrypto = getTransportCrypto();
      const nonce = transportCrypto && typeof transportCrypto.randomUUID === 'function'
        ? transportCrypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const msg: WakuMessage<Store> = await makeSignedWakuMessage('store.created', store, 'store-owner', {
        ts: Date.now(),
        nonce,
      });
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
