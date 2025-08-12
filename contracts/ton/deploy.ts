import { execSync } from 'child_process';
import path from 'path';
import { getTonConnect } from '../../services/tonAuth';
import { getTonWeb } from '../../services/tonProvider';

export async function compile(contract: string) {
  const file = path.resolve(__dirname, `${contract}.tact`);
  execSync(`npx tact ${file}`, { stdio: 'inherit' });
}

export async function deploy(contract: string, init: string) {
  await compile(contract);
  getTonWeb();
  const tonConnect = getTonConnect();
  if (!tonConnect) throw new Error('TonConnect not initialized');
  await tonConnect.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 60,
    messages: [
      {
        address: init,
        amount: '0',
      },
    ],
  });
}
