import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSettings } from '../services/tonSettings';

export let TENANT = 'thecongress';

export interface TenantSettings {
  appName: string;
  primaryColor: string;
  logoCid: string;
  fiatKey?: string;
  feeAddress?: string;
  feeBps?: number;
  admins?: string[];
}

export let AppConfig: TenantSettings = {
  appName: 'Blue Ocean',
  primaryColor: '#B99C5A',
  logoCid: '',
  feeAddress: '',
  feeBps: 0,
  admins: [],
};

export async function loadTenantSettings(): Promise<void> {
  const TENANT_KEY = 'app_tenant_id';
  const NAME_KEY = 'app_name';
  const COLOR_KEY = 'app_theme_primary';
  const LOGO_KEY = 'app_logo';
  const FIAT_KEY = 'app_fiat_key';
  const FEE_ADDR_KEY = 'app_fee_address';
  const FEE_BPS_KEY = 'app_fee_bps';
  const ADMINS_KEY = 'app_admins';

  try {
    const [t, name, color, logo, fiat, feeAddr, feeBps, admins] =
      await AsyncStorage.multiGet([
        TENANT_KEY,
        NAME_KEY,
        COLOR_KEY,
        LOGO_KEY,
        FIAT_KEY,
        FEE_ADDR_KEY,
        FEE_BPS_KEY,
        ADMINS_KEY,
      ]);

    if (t?.[1]) TENANT = t[1];
    AppConfig = {
      appName: name?.[1] || AppConfig.appName,
      primaryColor: color?.[1] || AppConfig.primaryColor,
      logoCid: logo?.[1] || AppConfig.logoCid,
      fiatKey: fiat?.[1] || undefined,
      feeAddress: feeAddr?.[1] || '',
      feeBps: feeBps?.[1] ? parseInt(feeBps[1]) : 0,
      admins: admins?.[1] ? JSON.parse(admins[1]) : [],
    };

    const remote = await fetchSettings();
    TENANT = remote.tenantId;
    AppConfig = {
      appName: remote.appName,
      primaryColor: remote.theme.primary,
      logoCid: remote.brand.logoCid,
      fiatKey: remote.fiatKey,
      feeAddress: remote.feeAddress ?? '',
      feeBps: remote.feeBps ?? 0,
      admins: remote.admins ?? [],
    };

    await AsyncStorage.multiSet([
      [TENANT_KEY, remote.tenantId],
      [NAME_KEY, remote.appName],
      [COLOR_KEY, remote.theme.primary],
      [LOGO_KEY, remote.brand.logoCid],
      [FIAT_KEY, remote.fiatKey ?? ''],
      [FEE_ADDR_KEY, remote.feeAddress ?? ''],
      [FEE_BPS_KEY, String(remote.feeBps ?? 0)],
      [ADMINS_KEY, JSON.stringify(remote.admins ?? [])],
    ]);
  } catch (e) {
    console.error('Error loading tenant settings:', e);
  }
}

export async function getTenant(): Promise<string> {
  if (!TENANT) {
    await loadTenantSettings();
  }
  return TENANT;
}

export async function getAppConfig(): Promise<TenantSettings> {
  if (!AppConfig) {
    await loadTenantSettings();
  }
  return AppConfig;
}

export async function getFeeSettings(): Promise<{
  feeAddress: string;
  feeBps: number;
}> {
  if (!AppConfig.feeAddress && !AppConfig.feeBps) {
    await loadTenantSettings();
  }
  return {
    feeAddress: AppConfig.feeAddress || '',
    feeBps: AppConfig.feeBps || 0,
  };
}

export async function getAdmins(): Promise<string[]> {
  if (!AppConfig.admins || AppConfig.admins.length === 0) {
    await loadTenantSettings();
  }
  return AppConfig.admins || [];
}
