import config from '../utils/appConfig';
import { getAdmins } from './tonSettings';

export async function isChatConfigured(): Promise<boolean> {
  const admins = await getAdmins();
  const settings = config.TON_SETTINGS_ADDRESS || '';
  const users = config.TON_USERS_ADDRESS || '';
  return admins.length > 0 && !!settings && !!users;
}
