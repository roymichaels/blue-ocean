import { getConfig } from '../utils/config';

export let TENANT = 'thecongress';

export interface TenantSettings {
  name: string;
  primaryColor: string;
  logo: any;
}

export let AppConfig: TenantSettings = {
  name: 'Blue Ocean',
  primaryColor: '#B99C5A',
  logo: require('../assets/images/icon.png'),
};

export async function loadTenantSettings(): Promise<void> {
  const tenant = (await getConfig('EXPO_PUBLIC_TENANT'))?.trim() || 'thecongress';
  TENANT = tenant;

  const name = (await getConfig('APP_NAME')) || 'Blue Ocean';
  const primaryColor = (await getConfig('PRIMARY_COLOR')) || '#B99C5A';
  const logo = (await getConfig('APP_LOGO')) || require('../assets/images/icon.png');
  AppConfig = { name, primaryColor, logo };
}

export async function getTenant(): Promise<string> {
  const v = await getConfig('EXPO_PUBLIC_TENANT');
  return v?.trim() || 'thecongress';
}

export async function getAppConfig(): Promise<TenantSettings> {
  const name = (await getConfig('APP_NAME')) || 'Blue Ocean';
  const primaryColor = (await getConfig('PRIMARY_COLOR')) || '#B99C5A';
  const logo = (await getConfig('APP_LOGO')) || require('../assets/images/icon.png');
  return { name, primaryColor, logo };
}
