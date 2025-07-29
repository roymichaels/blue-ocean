import { requireConfig } from '../utils/env';

export async function isChatConfigured(): Promise<boolean> {
  const admin = await requireConfig('EXPO_PUBLIC_ADMIN_USERNAME').catch(() => '');
  const secret = await requireConfig('EXPO_PUBLIC_CHAT_SECRET').catch(() => '');
  return !!(admin && secret);
}
