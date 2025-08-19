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
  store['admins'] = JSON.stringify(admins);
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
    rpcUrl: store['rpcUrl'] ?? '',
    rpcFallbackUrls: store['rpcFallbackUrls']
      ? JSON.parse(store['rpcFallbackUrls'])
      : [],
    wakuBootstrap: store['wakuBootstrap']
      ? JSON.parse(store['wakuBootstrap'])
      : [],
  };
}

export const subscribeToSettingsWrites = jest
  .fn()
  .mockResolvedValue(() => {});

export const __store = store;
