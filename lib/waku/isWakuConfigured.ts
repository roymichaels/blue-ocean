import { requireConfig } from '../../utils/env';

export async function isWakuConfigured(): Promise<boolean> {
  const enabled = await requireConfig('EXPO_PUBLIC_USE_WAKU').catch(() => 'false');
  const secret = await requireConfig('EXPO_PUBLIC_WAKU_SECRET').catch(() => '');
  return enabled === 'true' && !!secret;
}

