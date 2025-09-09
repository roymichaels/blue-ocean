import { KeyPair } from 'near-api-js';

interface RecoveryOptions {
  backupKey?: string;
  socialRecovery?: () => Promise<string>;
}

/**
 * Recover a key either from a provided backup key string or via a
 * social recovery function. Only one method is required. If both are
 * supplied the backup key takes precedence.
 */
export async function recoverKey(options: RecoveryOptions): Promise<KeyPair> {
  if (options.backupKey) {
    return KeyPair.fromString(options.backupKey);
  }
  if (options.socialRecovery) {
    const key = await options.socialRecovery();
    return KeyPair.fromString(key);
  }
  throw new Error('No recovery method provided');
}

export default recoverKey;
