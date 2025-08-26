import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Order } from '../types';
import config from '../utils/appConfig';

const ADDRESS =
  config.TON_ORDERS_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export async function getOrder(storeId: string = '', id: string): Promise<Order | null> {
  const res = await getValue(ADDRESS, `${storeId}:${id}`);
  return res ? (JSON.parse(res) as Order) : null;
}

export async function setOrder(storeId: string = '', order: Order) {
  await setValue(ADDRESS, `${storeId}:${order.id}`, JSON.stringify(order));
}

export async function removeOrder(storeId: string = '', id: string) {
  await removeValue(ADDRESS, `${storeId}:${id}`);
}

export async function listOrders(storeId: string = ''): Promise<Order[]> {
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${storeId}:`))
    .map((i) => JSON.parse(i.value) as Order);
}

export async function listOrdersBySeller(
  storeId: string = '',
  sellerAddress: string,
): Promise<Order[]> {
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${storeId}:`))
    .map((i) => JSON.parse(i.value) as Order)
    .filter((o) => o.sellerAddress === sellerAddress);
}
