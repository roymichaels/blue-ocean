import fs from 'fs';
import path from 'path';
import { config as load } from 'dotenv';

export function loadVaultEnv(): void {
  // `process.cwd` is only available in Node.js environments. When running in
  // browsers (e.g. Expo Web) `process` is polyfilled without `cwd`, which was
  // causing a runtime TypeError. Bail out early when `process.cwd` is missing
  // so that client bundles don't attempt to access the filesystem.
  if (typeof process === 'undefined' || typeof process.cwd !== 'function') {
    return;
  }

  const vaultPath = process.env.VAULT_ENV || path.join(process.cwd(), '.env.vault');
  if (fs.existsSync(vaultPath)) {
    load({ path: vaultPath });
  }
}

export default loadVaultEnv;
