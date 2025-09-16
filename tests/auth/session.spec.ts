import { requestScopes, validateToken, assertCheckoutScope } from '@/services/session';
import { scopedTokensFlag } from '@/config/featureFlags';

const mockHasAdminScope = jest.fn<Promise<boolean>, [string, string]>();
const mockChainAdapter = {
  getAccountId: jest.fn<string | null, []>(),
};

jest.mock('@/agents/settings-agent', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      hasAdminScope: mockHasAdminScope,
    }),
  },
}));

jest.mock('@/services/chain', () => ({
  chainAdapter: mockChainAdapter,
}));

describe('session scope validation', () => {
  const signer = (msg: string) => `sig:${msg}`;

  beforeEach(() => {
    mockHasAdminScope.mockReset();
    mockHasAdminScope.mockResolvedValue(false);
    mockChainAdapter.getAccountId.mockReset();
    mockChainAdapter.getAccountId.mockReturnValue(null);
  });

  afterEach(() => {
    scopedTokensFlag.rollback = false;
    delete (globalThis as any).__DEVICE_INFO__;
  });

  it('rejects invalid scope requests', () => {
    expect(() => requestScopes(['foo'], signer)).toThrow('{E_SCOPE}');
  });

  it('accepts checkout scope tokens', () => {
    const { token } = requestScopes(['checkout'], signer);
    expect(() => validateToken(token, ['checkout'])).not.toThrow();
  });

  it('throws on validating with unknown scopes', () => {
    const { token } = requestScopes(['read'], signer);
    expect(() => validateToken(token, ['foo'])).toThrow('{E_SCOPE}');
  });

  it('throws when required scope not granted', () => {
    const { token } = requestScopes(['read'], signer);
    expect(() => validateToken(token, ['write'])).toThrow('{E_SCOPE}');
  });

  it('enforces checkout scope when rollback disabled', () => {
    const { token } = requestScopes(['write'], signer);
    expect(() => assertCheckoutScope(token)).toThrow('{E_SCOPE}');
  });

  it('allows legacy write scope when checkout rollback enabled', () => {
    scopedTokensFlag.rollback = true;
    const { token } = requestScopes(['write'], signer);
    expect(() => assertCheckoutScope(token)).not.toThrow();
  });

  it('throws when token missing', () => {
    expect(() => validateToken('nope', ['read'])).toThrow('{E_EXPIRED}');
  });

  it('throws when token expired', () => {
    const { token } = requestScopes(['read'], signer, -1);
    expect(() => validateToken(token, ['read'])).toThrow('{E_EXPIRED}');
  });

  it('allows small clock skew before treating token as expired', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const { token, exp } = requestScopes(['read'], signer, 1000);
    // 30s past expiration should still be tolerated
    jest.setSystemTime(exp + 30_000);
    expect(() => validateToken(token, ['read'])).not.toThrow();
    // Beyond the 1m tolerance the token is expired
    jest.setSystemTime(exp + 120_000);
    expect(() => validateToken(token, ['read'])).toThrow('{E_EXPIRED}');
    jest.useRealTimers();
  });

  it('rejects tokens when device hash changes', () => {
    (globalThis as any).__DEVICE_INFO__ = 'device-a';
    const { token } = requestScopes(['read'], signer);
    (globalThis as any).__DEVICE_INFO__ = 'device-b';
    expect(() => validateToken(token, ['read'])).toThrow('{E_DEVICE_MISMATCH}');
  });

  it('rejects admin scope requests for non-admin wallets', async () => {
    mockChainAdapter.getAccountId.mockReturnValue('user.testnet');
    await expect(
      requestScopes(['admin:settings'], async (payload) => `sig:${payload}`),
    ).rejects.toThrow('{E_SCOPE}');
    expect(mockHasAdminScope).toHaveBeenCalledWith('user.testnet', 'admin:settings');
  });

  it('rejects admin scope requests without a connected wallet', async () => {
    await expect(
      requestScopes(['admin:settings'], async (payload) => `sig:${payload}`),
    ).rejects.toThrow('{E_SCOPE}');
    expect(mockHasAdminScope).not.toHaveBeenCalled();
  });
});
