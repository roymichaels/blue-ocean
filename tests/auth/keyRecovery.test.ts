import { recoverKey } from '@/services/wallet';
import { KeyPair } from 'near-api-js';

describe('wallet key recovery', () => {
  it('recovers key from backup string', async () => {
    const original = KeyPair.fromRandom('ed25519');
    const recovered = await recoverKey({ backupKey: original.toString() });
    expect(recovered.toString()).toBe(original.toString());
  });

  it('recovers key using social recovery function', async () => {
    const expected = KeyPair.fromRandom('ed25519');
    const recovered = await recoverKey({
      socialRecovery: async () => expected.toString(),
    });
    expect(recovered.toString()).toBe(expected.toString());
  });
});
