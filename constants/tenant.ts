import { requireConfig } from '../utils/env';

export const TENANT: string = (await requireConfig('EXPO_PUBLIC_TENANT')).trim() || 'thecongress';

export const tenantSettings = {
  thecongress: {
    name: 'The Congress',
    primaryColor: '#000000',
    logo: require('../assets/images/icon.png'),
  },
  thebull: {
    name: 'The Bull',
    primaryColor: '#ff0000',
    logo: require('../assets/images/icon.png'),
  },
} as const;

export type TenantName = keyof typeof tenantSettings;

export const AppConfig = tenantSettings[TENANT as TenantName];
