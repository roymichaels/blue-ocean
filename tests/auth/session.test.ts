import { requestScopes, validateToken, refreshToken, sessionEvents } from '@/services/session';

describe('session tokens', () => {
  const signer = (msg: string) => `sig:${msg}`;

  it('rejects invalid scopes', () => {
    expect(() => requestScopes(['foo'], signer)).toThrow('{E_SCOPE}');
  });

  it('throws when token expired', () => {
    const { token } = requestScopes(['read'], signer, -1);
    expect(() => validateToken(token, ['read'])).toThrow('{E_EXPIRED}');
  });

  it('rotates token on refresh', () => {
    const { token } = requestScopes(['read'], signer, 1000);
    const events: any[] = [];
    sessionEvents.once('token.rotated', (e) => events.push(e));
    const next = refreshToken(token, signer, 1000);
    expect(events[0]).toEqual({ old: token, token: next.token });
    expect(() => validateToken(token, ['read'])).toThrow('{E_EXPIRED}');
    expect(() => validateToken(next.token, ['read'])).not.toThrow();
  });
});
