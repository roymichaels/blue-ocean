import { requestScopes, validateToken, refreshToken, sessionEvents } from '@/services/session';

describe('session token lifecycle', () => {
  const signer = (msg: string) => `sig:${msg}`;

  it('refreshToken rotates token and extends expiry', async () => {
    const { token, exp } = requestScopes(['read'], signer, 50);
    const events: any[] = [];
    sessionEvents.once('token.rotated', (e) => events.push(e));

    // simulate background refresh before expiry
    await new Promise((r) => setTimeout(r, 10));
    const next = refreshToken(token, signer, 50);

    expect(events[0]).toEqual({ old: token, token: next.token });
    expect(next.exp).toBeGreaterThan(exp);
    expect(() => validateToken(next.token, ['read'])).not.toThrow();
  });

  it('revoked token fails validation with {E_EXPIRED}', async () => {
    const { token } = requestScopes(['read'], signer, 1000);
    await new Promise((r) => setTimeout(r, 10));
    const next = refreshToken(token, signer, 1000);

    expect(next.token).not.toBe(token);
    expect(() => validateToken(next.token, ['read'])).not.toThrow();
    expect(() => validateToken(token, ['read'])).toThrow('{E_EXPIRED}');
  });
});
