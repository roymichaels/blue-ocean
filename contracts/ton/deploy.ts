import { execSync } from 'child_process';
import path from 'path';
import nearAuth from '../../services/nearAuth';
import { getTonWeb } from '../../services/tonProvider';

export async function compile(contract: string) {
  const file = path.resolve(__dirname, `${contract}.tact`);
  execSync(`npx tact ${file}`, { stdio: 'inherit' });
}

export async function deploy(contract: string, init: string) {
  await compile(contract);
  getTonWeb();
  await nearAuth.signMessage(Buffer.from(init));
}
