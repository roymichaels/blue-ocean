import config from '../utils/appConfig';

export async function isChatConfigured(): Promise<boolean> {
  const adminKey = config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY || '';
  const settings = config.TON_SETTINGS_ADDRESS || '';
  const users = config.TON_USERS_ADDRESS || '';
  return !!(adminKey && settings && users);
}
