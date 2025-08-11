import tonAuth from '../services/tonAuth';
import SettingsAgent from '../agents/settings-agent';

export default async function isAdmin(): Promise<boolean> {
  const address = tonAuth.getAddress();
  if (!address) return false;
  const admins = await SettingsAgent.getInstance().getAdmins();
  return admins.includes(address);
}
