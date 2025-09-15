import { requestScopes, validateToken } from '@/services/session';

describe('session scope validation', () => {
  const signer = (msg: string) => `sig:${msg}`;

  it('rejects invalid scope requests', () => {
    expect(() => requestScopes(['foo'], signer)).toThrow('{E_SCOPE}');
  });

  it('throws on validating with unknown scopes', () => {
    const { token } = requestScopes(['read'], signer);
    expect(() => validateToken(token, ['foo'])).toThrow('{E_SCOPE}');
  });

  it('throws when required scope not granted', () => {
    const { token } = requestScopes(['read'], signer);
    expect(() => validateToken(token, ['write'])).toThrow('{E_SCOPE}');
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
});
