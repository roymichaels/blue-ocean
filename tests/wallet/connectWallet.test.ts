const mockSignIn = jest.fn();
const mockGetAccountId = jest.fn();
const mockGetPublicKey = jest.fn();

jest.mock('@waku/sdk', () => ({}), { virtual: true });

jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => ({ sign: jest.fn() }),
}));

jest.mock('@/services/session', () => ({
  requestScopes: jest.fn(),
  refreshToken: jest.fn(),
  validateToken: jest.fn(),
  getSession: jest.fn(),
}));

jest.mock('@/features/auth/services/nearAuth', () => ({
  signIn: mockSignIn,
  getAccountId: mockGetAccountId,
  getPublicKey: mockGetPublicKey,
}));

import { connectWallet } from '@/auth/wallet';

describe('connectWallet', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignIn.mockResolvedValue(undefined);
    mockGetAccountId.mockReset();
    mockGetPublicKey.mockReset();
  });

  it('returns existing wallet connection without prompting sign-in', async () => {
    mockGetAccountId.mockReturnValue('alice.testnet');
    mockGetPublicKey.mockReturnValue('ed25519:alice');

    const result = await connectWallet();

    expect(result).toEqual({ address: 'alice.testnet', publicKey: 'ed25519:alice' });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('triggers sign-in when wallet details missing', async () => {
    mockGetAccountId
      .mockReturnValueOnce(null)
      .mockReturnValue('bob.testnet');
    mockGetPublicKey
      .mockReturnValueOnce(null)
      .mockReturnValue('ed25519:bob');

    const result = await connectWallet();

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ address: 'bob.testnet', publicKey: 'ed25519:bob' });
  });

  it('throws when wallet remains unavailable after sign-in', async () => {
    mockGetAccountId.mockReturnValue(null);
    mockGetPublicKey.mockReturnValue(null);

    await expect(connectWallet()).rejects.toThrow('Wallet public key unavailable');
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });
});
