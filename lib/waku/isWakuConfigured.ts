import config from '../../utils/appConfig';

export async function isWakuConfigured(): Promise<boolean> {
  return !!config.EXPO_PUBLIC_WAKU_SECRET;
}

