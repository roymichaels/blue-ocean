import type { WakuMessage } from '@/types/waku';
import type { Store } from '@/types';
import { normalizeMessage } from '../lib/normalizeMessage';
import { buildTopic } from '@/utils/wakuTopics';
import storeRepository from '@/services/storeRepository';

const getTransportCrypto = () =>
  typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : undefined;

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

type StoreRemovalPayload = { id: string; store: Store | null };

type StoreChangeType = 'store.created' | 'store.updated';

class StoresAgent {
  private reputation: Record<string, Metrics> = {};
  private subscribers: Set<(id: string, score: number) => void> = new Set();

  constructor() {
    storeRepository.on('store.created', ({ store }) => {
      void this.broadcastStoreChange('store.created', store);
    });
    storeRepository.on('store.updated', ({ store }) => {
      void this.broadcastStoreChange('store.updated', store);
    });
    storeRepository.on('store.removed', ({ id, store }) => {
      delete this.reputation[id];
      void this.broadcastStoreRemoval({ id, store });
    });
  }

  private async ensureWallet(): Promise<{ address: string; publicKey: string }> {
    const ensureWallet = await loadEnsureNearWallet();
    return ensureWallet('Please connect your NEAR wallet to manage stores.');
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
    const store = await storeRepository.select(storeId);
    if (store) {
      try {
        const result = await storeRepository.save({ ...store, reputation: newScore });
        const confirmed = result.store.reputation ?? newScore;
        m.score = confirmed;
        this.subscribers.forEach((cb) => cb(storeId, confirmed));
      } catch {
        m.reviewSum -= rating;
        m.reviewCount -= 1;
      }
    }
  }

  async updateReputationByOwner(owner: string, reliability: number): Promise<void> {
    const store = await storeRepository.findByOwner(owner);
    if (store) {
      const id = store.id;
      if (!this.reputation[id]) {
        this.reputation[id] = { reviewSum: 0, reviewCount: 0, reliability: 0, score: 0 };
      }
      const prev = this.reputation[id].reliability;
      this.reputation[id].reliability = reliability;
      const newScore = this.calculateScore(id);
      try {
        const result = await storeRepository.save({ ...store, reputation: newScore });
        const confirmed = result.store.reputation ?? newScore;
        this.reputation[id].score = confirmed;
        this.subscribers.forEach((cb) => cb(id, confirmed));
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
    await storeRepository.save({
      createdAt: normalized.createdAt || new Date().toISOString(),
      ...normalized,
    });
  }

  async update(item: Store): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Store>('Store', item);
    await storeRepository.save(normalized);
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    await storeRepository.remove(id);
  }

  /**
   * Returns a defensive copy of a store by id.
   */
  async selectStore(id: string): Promise<Store | null> {
    return storeRepository.select(id);
  }

  /**
   * Returns defensive copies of all stores.
   */
  async getStores(): Promise<Store[]> {
    return storeRepository.list('default');
  }

  private async broadcastStoreChange(type: StoreChangeType, store: Store): Promise<void> {
    try {
      const { publish, makeSignedWakuMessage } = await loadWakuDeps();
      const transportCrypto = getTransportCrypto();
      const nonce =
        transportCrypto && typeof transportCrypto.randomUUID === 'function'
          ? transportCrypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const msg: WakuMessage<Store> = await makeSignedWakuMessage(type, store, 'store-owner', {
        ts: Date.now(),
        nonce,
      });
      await publish(buildTopic('stores', '1'), msg);
    } catch {
      // non-fatal
    }
  }

  private async broadcastStoreRemoval(payload: StoreRemovalPayload): Promise<void> {
    try {
      const { publish, makeSignedWakuMessage } = await loadWakuDeps();
      const transportCrypto = getTransportCrypto();
      const nonce =
        transportCrypto && typeof transportCrypto.randomUUID === 'function'
          ? transportCrypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const msg: WakuMessage<StoreRemovalPayload> = await makeSignedWakuMessage(
        'store.removed',
        payload,
        'store-owner',
        {
          ts: Date.now(),
          nonce,
        },
      );
      await publish(buildTopic('stores', '1'), msg);
    } catch {
      // non-fatal
    }
  }
}

const storesAgent = new StoresAgent();

export const getStores = (): Promise<Store[]> => storesAgent.getStores();
export const selectStore = (id: string): Promise<Store | null> => storesAgent.selectStore(id);

export default storesAgent;
