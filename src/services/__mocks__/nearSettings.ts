import { canonicalJson } from '@/utils/serialization';
import { ALL_ADMIN_SCOPES } from '@/types';
import type { AdminScope } from '@/types';

const store: Record<string, string> = {};

export async function getSetting(key: string): Promise<string | null> {
  return store[key] ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  store[key] = value;
}

export async function getAdmins(): Promise<string[]> {
  return store['admins'] ? JSON.parse(store['admins']) : [];
}

export async function setAdmins(admins: string[]): Promise<void> {
  store['admins'] = canonicalJson(admins);
  const scopes: Record<string, AdminScope[]> = {};
  admins.forEach((a) => {
    scopes[a] = ALL_ADMIN_SCOPES;
  });
  store['adminScopes'] = canonicalJson(scopes);
}

export async function getAdminScopes(): Promise<Record<string, AdminScope[]>> {
  return store['adminScopes'] ? JSON.parse(store['adminScopes']) : {};
}

export async function setAdminScopes(scopes: Record<string, AdminScope[]>): Promise<void> {
  store['adminScopes'] = canonicalJson(scopes);
}

export async function fetchSettings() {
  return {
    tenantId: store['tenantId'] ?? 'blue-ocean',
    appName: store['appName'] ?? 'Blue Ocean',
    theme: { primary: store['theme.primary'] ?? '#B99C5A' },
    brand: { logoCid: store['brand.logoCid'] ?? '' },
    fiatKey: store['fiatKey'],
    feeAddress: store['feeAddress'] ?? '',
    feeBps: store['feeBps'] ? Number(store['feeBps']) : 0,
    admins: store['admins'] ? JSON.parse(store['admins']) : [],
    adminScopes: store['adminScopes'] ? JSON.parse(store['adminScopes']) : {},
    rpcUrl: store['rpcUrl'] ?? '',
    rpcFallbackUrls: store['rpcFallbackUrls']
      ? JSON.parse(store['rpcFallbackUrls'])
      : [],
    paymentFactoryAddress: store['paymentFactoryAddress'],
  };
}

export const subscribeToSettingsWrites = jest
  .fn()
  .mockResolvedValue(() => {});

export const __store = store;
