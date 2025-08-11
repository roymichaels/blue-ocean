import { getAdmins } from './tonSettings';

export async function isChatConfigured(): Promise<boolean> {
  const admins = await getAdmins();
  return admins.length > 0;
}
