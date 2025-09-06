import { chainAdapter } from '@/services/chain';
import SettingsAgent from '../agents/settings-agent';

export default async function isAdmin(): Promise<boolean> {
  const address = chainAdapter.getAccountId();
  if (!address) return false;
  const admins = await SettingsAgent.getInstance().getAdmins();
  return admins.includes(address);
}
