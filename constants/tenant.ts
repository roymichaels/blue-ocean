import { getConfig } from '../utils/config';

export async function getTenant(): Promise<string> {
  const v = await getConfig('EXPO_PUBLIC_TENANT');
  return v?.trim() || 'thecongress';
}

export async function getAppConfig(): Promise<{
  name: string;
  primaryColor: string;
  logo: any;
}> {
  const name = (await getConfig('APP_NAME')) || 'Blue Ocean';
  const primaryColor = (await getConfig('PRIMARY_COLOR')) || '#B99C5A';
  const logo = (await getConfig('APP_LOGO')) || require('../assets/images/icon.png');
  return { name, primaryColor, logo };
}

export type TenantSettings = Awaited<ReturnType<typeof getAppConfig>>;
