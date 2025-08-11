import { getValue, setValue, listValues } from './tonKvStore';
import config from '../utils/appConfig';

const ADDRESS =
  config.TON_SETTINGS_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export interface TonSettings {
  tenantId: string;
  appName: string;
  theme: { primary: string };
  brand: { logoCid: string };
  fiatKey?: string;
  admins: string[];
}

export async function getSetting(key: string): Promise<string | null> {
  return await getValue(ADDRESS, key);
}

export async function setSetting(key: string, value: string) {
  return await setValue(ADDRESS, key, value);
}

export async function listSettings(): Promise<{ key: string; value: string }[]> {
  return await listValues(ADDRESS);
}

export async function fetchSettings(): Promise<TonSettings> {
  const entries = await listSettings();
  const map: Record<string, string> = {};
  for (const { key, value } of entries) {
    map[key] = value;
  }
  return {
    tenantId: map['tenantId'] ?? 'thecongress',
    appName: map['appName'] ?? 'Blue Ocean',
    theme: { primary: map['theme.primary'] ?? '#B99C5A' },
    brand: { logoCid: map['brand.logoCid'] ?? '' },
    fiatKey: map['fiatKey'],
    admins: map['admins'] ? JSON.parse(map['admins']) : [],
  };
}

export async function getAdmins(): Promise<string[]> {
  const raw = await getSetting('admins');
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function setAdmins(admins: string[]): Promise<void> {
  await setSetting('admins', JSON.stringify(admins));
}
