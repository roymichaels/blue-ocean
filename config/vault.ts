import fs from 'fs';
import path from 'path';
import { config as load } from 'dotenv';

export function loadVaultEnv(): void {
  const vaultPath = process.env.VAULT_ENV || path.join(process.cwd(), '.env.vault');
  if (fs.existsSync(vaultPath)) {
    load({ path: vaultPath });
  }
}

export default loadVaultEnv;
