import config from '../utils/appConfig';

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
  const tenant = config.EXPO_PUBLIC_TENANT?.trim() || 'thecongress';
  TENANT = tenant;

  const name = config.APP_NAME || 'Blue Ocean';
  const primaryColor = config.PRIMARY_COLOR || '#B99C5A';
  const logo = config.APP_LOGO || require('../assets/images/icon.png');
  AppConfig = { name, primaryColor, logo };
}

export async function getTenant(): Promise<string> {
  return config.EXPO_PUBLIC_TENANT?.trim() || 'thecongress';
}

export async function getAppConfig(): Promise<TenantSettings> {
  const name = config.APP_NAME || 'Blue Ocean';
  const primaryColor = config.PRIMARY_COLOR || '#B99C5A';
  const logo = config.APP_LOGO || require('../assets/images/icon.png');
  return { name, primaryColor, logo };
}
