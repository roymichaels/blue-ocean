import config from '../utils/appConfig';

export async function isChatConfigured(): Promise<boolean> {
  const admin = config.EXPO_PUBLIC_ADMIN_USERNAME || '';
  const secret = config.EXPO_PUBLIC_CHAT_SECRET || '';
  return !!(admin && secret);
}
