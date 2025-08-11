import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Order } from '../types';
import config from '../utils/appConfig';

const ADDRESS =
  config.TON_ORDERS_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export async function getOrder(id: string): Promise<Order | null> {
  const res = await getValue(ADDRESS, id);
  return res ? (JSON.parse(res) as Order) : null;
}

export async function setOrder(order: Order) {
  await setValue(ADDRESS, order.id, JSON.stringify(order));
}

export async function removeOrder(id: string) {
  await removeValue(ADDRESS, id);
}

export async function listOrders(): Promise<Order[]> {
  const items = await listValues(ADDRESS);
  return items.map((i) => JSON.parse(i.value) as Order);
}

export async function listOrdersBySeller(sellerAddress: string): Promise<Order[]> {
  const items = await listValues(ADDRESS);
  return items
    .map((i) => JSON.parse(i.value) as Order)
    .filter((o) => o.sellerAddress === sellerAddress);
}
