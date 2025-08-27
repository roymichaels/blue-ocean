import chain from './chain';

let getAdmins: (() => Promise<string[]>) | undefined;

if (chain === 'ton') {
  ({ getAdmins } = require('./tonSettings'));
}

export async function isChatConfigured(): Promise<boolean> {
  if (!getAdmins) return false;
  const admins = await getAdmins();
  return admins.length > 0;
}
