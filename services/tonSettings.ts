import { getValue, setValue, listValues } from './tonKvStore';
import config from '../utils/appConfig';

const ADDRESS =
  config.TON_SETTINGS_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export async function getSetting(key: string): Promise<string | null> {
  return await getValue(ADDRESS, key);
}

export async function setSetting(key: string, value: string) {
  return await setValue(ADDRESS, key, value);
}

export async function listSettings(): Promise<{ key: string; value: string }[]> {
  return await listValues(ADDRESS);
}
