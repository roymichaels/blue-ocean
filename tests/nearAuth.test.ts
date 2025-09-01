import * as nearAuth from '@/features/auth/services/nearAuth';

describe('nearAuth.signMessage', () => {
  it('delegates to wallet signMessage', async () => {
    const mockWallet = {
      signMessage: jest.fn().mockResolvedValue({ signature: 'abc' }),
    };
    (nearAuth as any).selector = { wallet: async () => mockWallet } as any;
    (nearAuth as any).modal = {} as any;
    const res = await nearAuth.signMessage('hello');
    expect(mockWallet.signMessage).toHaveBeenCalled();
    expect(res).toBe('abc');
    (nearAuth as any).selector = null;
    (nearAuth as any).modal = null;
  });
});
