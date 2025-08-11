import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSettings } from '../services/tonSettings';

export let TENANT = 'thecongress';

export interface TenantSettings {
  appName: string;
  primaryColor: string;
  logoCid: string;
  fiatKey?: string;
}

export let AppConfig: TenantSettings = {
  appName: 'Blue Ocean',
  primaryColor: '#B99C5A',
  logoCid: '',
};

export async function loadTenantSettings(): Promise<void> {
  const TENANT_KEY = 'app_tenant_id';
  const NAME_KEY = 'app_name';
  const COLOR_KEY = 'app_theme_primary';
  const LOGO_KEY = 'app_logo';
  const FIAT_KEY = 'app_fiat_key';

  try {
    const [t, name, color, logo, fiat] = await AsyncStorage.multiGet([
      TENANT_KEY,
      NAME_KEY,
      COLOR_KEY,
      LOGO_KEY,
      FIAT_KEY,
    ]);

    if (t?.[1]) TENANT = t[1];
    AppConfig = {
      appName: name?.[1] || AppConfig.appName,
      primaryColor: color?.[1] || AppConfig.primaryColor,
      logoCid: logo?.[1] || AppConfig.logoCid,
      fiatKey: fiat?.[1] || undefined,
    };

    const remote = await fetchSettings();
    TENANT = remote.tenantId;
    AppConfig = {
      appName: remote.appName,
      primaryColor: remote.theme.primary,
      logoCid: remote.brand.logoCid,
      fiatKey: remote.fiatKey,
    };

    await AsyncStorage.multiSet([
      [TENANT_KEY, remote.tenantId],
      [NAME_KEY, remote.appName],
      [COLOR_KEY, remote.theme.primary],
      [LOGO_KEY, remote.brand.logoCid],
      [FIAT_KEY, remote.fiatKey ?? ''],
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
