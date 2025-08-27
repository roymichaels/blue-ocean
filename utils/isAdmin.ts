import nearAuth from '../services/nearAuth';
import SettingsAgent from '../agents/settings-agent';

export default async function isAdmin(): Promise<boolean> {
  const address = nearAuth.getAccountId();
  if (!address) return false;
  const admins = await SettingsAgent.getInstance().getAdmins();
  return admins.includes(address);
}
