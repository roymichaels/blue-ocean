import { chainAdapter } from '@/services/chain';
import SettingsAgent from '@/agents/settings-agent';
import type { AdminScope } from '@/types';

export default async function isAdmin(scope?: AdminScope): Promise<boolean> {
  const address = chainAdapter.getAccountId();
  if (!address) return false;
  if (scope) {
    return await SettingsAgent.getInstance().hasAdminScope(address, scope);
  }
  const admins = await SettingsAgent.getInstance().getAdmins();
  return admins.includes(address);
}
