export const TENANT = process.env.EXPO_PUBLIC_TENANT || 'thecongress';

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
