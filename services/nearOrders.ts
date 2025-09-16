import { getValue, setValue, listValues, removeValue } from './nearKvStore';
import { Order } from '../types';
import { assertNearChain } from './chain';
import { requireStoreId } from '@blue-ocean/utils';
import { canonicalJson } from '@/utils/serialization';
import { createWarmCache } from '@/services/warmCache';
import type { DiffMessage } from '@/services/warmCache';
import { errorLog } from '@/utils/logger';

assertNearChain();

const ADDRESS = 'orders';
const ORDER_CACHE_TOPIC = '/blue-ocean/orders/1';

function inferStoreId(order: Order | undefined): string | null {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) return null;
  const storeId = order.items[0]?.product?.storeId;
  if (!storeId) return null;
  try {
    return requireStoreId(storeId);
  } catch {
    return storeId;
  }
}

function matchesStore(order: Order | undefined, sid: string): boolean {
  const inferred = inferStoreId(order);
  return !!inferred && inferred === sid;
}

async function hydrateOrderLake(): Promise<Array<DiffMessage<Order>>> {
  try {
    const entries = await listValues(ADDRESS);
    const diffs: Array<DiffMessage<Order>> = [];
    for (const entry of entries) {
      try {
        const parsed = JSON.parse(entry.value) as Order & { rev?: number; version?: number };
        const parts = entry.key.split(':');
        const id = parsed.id || parts[parts.length - 1] || entry.key;
        if (!id) continue;
        const tsSource =
          (parsed.updatedAt && new Date(parsed.updatedAt).getTime()) ||
          (parsed.createdAt && new Date(parsed.createdAt).getTime()) ||
          Date.now();
        const ts = Number.isFinite(tsSource) ? tsSource : Date.now();
        const rev =
          (typeof parsed.rev === 'number' && parsed.rev) ||
          (typeof parsed.version === 'number' && parsed.version) ||
          1;
        diffs.push({ id, rev, op: 'set', value: parsed, ts });
      } catch (err) {
        errorLog('Invalid order snapshot', err);
      }
    }
    return diffs;
  } catch (err) {
    errorLog('Failed to hydrate orders from NEAR Lake', err);
    return [];
  }
}

const orderCache = createWarmCache<Order>(ORDER_CACHE_TOPIC, {
  hydrateLake: hydrateOrderLake,
});

export const ordersWarmCache = {
  getById(id: string) {
    return orderCache.getById(id);
  },
  subscribe(
    filter: (id: string, value: Order | undefined) => boolean,
    cb: (id: string, value: Order | undefined) => void,
  ) {
    return orderCache.subscribe(filter, cb);
  },
  onSynced(cb: () => void) {
    return orderCache.onSynced(cb);
  },
};

export async function getOrder(storeId: string, id: string): Promise<Order | null> {
  const sid = requireStoreId(storeId);
  try {
    const cached = ordersWarmCache.getById(id);
    if (cached && matchesStore(cached, sid)) return cached;
  } catch {}
  const res = await getValue(ADDRESS, `${ADDRESS}:${sid}:${id}`);
  return res ? (JSON.parse(res) as Order) : null;
}

export async function setOrder(storeId: string, order: Order) {
  const sid = requireStoreId(storeId);
  await setValue(ADDRESS, `${ADDRESS}:${sid}:${order.id}`, canonicalJson(order));
}

export async function removeOrder(storeId: string, id: string) {
  const sid = requireStoreId(storeId);
  await removeValue(ADDRESS, `${ADDRESS}:${sid}:${id}`);
}
export async function listOrders(storeId: string): Promise<Order[]> {
  const sid = requireStoreId(storeId);
  try {
    const cached = orderCache.values().filter((order) => matchesStore(order, sid));
    if (cached.length > 0) return cached;
  } catch {}
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${ADDRESS}:${sid}:`))
    .map((i) => JSON.parse(i.value) as Order);
}
export async function listOrdersBySeller(
  storeId: string,
  sellerAddress: string,
): Promise<Order[]> {
  const sid = requireStoreId(storeId);
  try {
    const cached = orderCache
      .values()
      .filter((order) => matchesStore(order, sid) && order.sellerAddress === sellerAddress);
    if (cached.length > 0) return cached;
  } catch {}
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${ADDRESS}:${sid}:`))
    .map((i) => JSON.parse(i.value) as Order)
    .filter((o) => o.sellerAddress === sellerAddress);
}

export { E_STALE_DATA, E_SYNC_LAG } from '@/services/warmCache';
