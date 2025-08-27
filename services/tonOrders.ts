import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Order } from '../types';
import { requireEnv } from '../utils/appConfig';
import { assertTonChain } from './chain';
import { requireStoreId } from '@blue-ocean/utils';

assertTonChain();

const ADDRESS = requireEnv('TON_ORDERS_ADDRESS');

export async function getOrder(storeId: string, id: string): Promise<Order | null> {
  const sid = requireStoreId(storeId);
  const res = await getValue(ADDRESS, `${sid}:${id}`);
  return res ? (JSON.parse(res) as Order) : null;
}

export async function setOrder(storeId: string, order: Order) {
  const sid = requireStoreId(storeId);
  await setValue(ADDRESS, `${sid}:${order.id}`, JSON.stringify(order));
}

export async function removeOrder(storeId: string, id: string) {
  const sid = requireStoreId(storeId);
  await removeValue(ADDRESS, `${sid}:${id}`);
}
export async function listOrders(storeId: string): Promise<Order[]> {
  const sid = requireStoreId(storeId);
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${sid}:`))
    .map((i) => JSON.parse(i.value) as Order);
}
export async function listOrdersBySeller(
  storeId: string,
  sellerAddress: string,
): Promise<Order[]> {
  const sid = requireStoreId(storeId);
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${sid}:`))
    .map((i) => JSON.parse(i.value) as Order)
    .filter((o) => o.sellerAddress === sellerAddress);
}
