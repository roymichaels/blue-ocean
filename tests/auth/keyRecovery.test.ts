import { recoverKey } from '@/services/wallet';
import { STUB_MESSAGE } from '@/services/nearStub';

describe('wallet key recovery', () => {
  it('throws while NEAR integration is stubbed out', async () => {
    await expect(recoverKey({ backupKey: 'unused' })).rejects.toThrow(STUB_MESSAGE);
    await expect(recoverKey({ socialRecovery: async () => 'unused' })).rejects.toThrow(
      STUB_MESSAGE,
    );
  });
});
