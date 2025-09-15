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
});
