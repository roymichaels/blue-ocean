import { getConfig } from '../utils/config';

export const TENANT: string = (await getConfig('EXPO_PUBLIC_TENANT'))?.trim() || 'thecongress';

export const AppConfig = {
  name: (await getConfig('APP_NAME')) || 'Blue Ocean',
  primaryColor: (await getConfig('PRIMARY_COLOR')) || '#B99C5A',
  logo: (await getConfig('APP_LOGO')) || require('../assets/images/icon.png'),
};

export type TenantSettings = typeof AppConfig;
