import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Store } from '../types';
import config from '../utils/appConfig';

const ADDRESS =
  config.TON_STORES_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export async function getStore(storeId: string = '', id: string): Promise<Store | null> {
  const res = await getValue(ADDRESS, `${storeId}:${id}`);
  return res ? (JSON.parse(res) as Store) : null;
}

export async function setStore(storeId: string = '', store: Store) {
  await setValue(ADDRESS, `${storeId}:${store.id}`, JSON.stringify(store));
}

export async function removeStore(storeId: string = '', id: string) {
  await removeValue(ADDRESS, `${storeId}:${id}`);
}

export async function listStores(storeId: string = ''): Promise<Store[]> {
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${storeId}:`))
    .map((i) => JSON.parse(i.value) as Store);
}
