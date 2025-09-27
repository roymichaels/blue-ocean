// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import { notImplemented } from '@/services/nearStub';

export interface RecoveryOptions {
  backupKey?: string;
  socialRecovery?: () => Promise<string>;
}

export async function recoverKey(_options: RecoveryOptions): Promise<never> {
  return notImplemented('recoverKey');
}

export default recoverKey;
