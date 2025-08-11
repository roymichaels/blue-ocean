import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Store } from '../types';
import config from '../utils/appConfig';

const ADDRESS =
  config.TON_STORES_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export async function getStore(id: string): Promise<Store | null> {
  const res = await getValue(ADDRESS, id);
  return res ? (JSON.parse(res) as Store) : null;
}

export async function setStore(store: Store) {
  await setValue(ADDRESS, store.id, JSON.stringify(store));
}

export async function removeStore(id: string) {
  await removeValue(ADDRESS, id);
}

export async function listStores(): Promise<Store[]> {
  const items = await listValues(ADDRESS);
  return items.map((i) => JSON.parse(i.value) as Store);
}
