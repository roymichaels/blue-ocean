import config from '../../utils/appConfig';

export async function isWakuConfigured(): Promise<boolean> {
  const enabled = config.EXPO_PUBLIC_USE_WAKU || 'false';
  const secret = config.EXPO_PUBLIC_WAKU_SECRET || '';
  return enabled === 'true' && !!secret;
}

