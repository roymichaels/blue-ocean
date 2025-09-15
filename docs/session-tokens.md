# Session Tokens API

Blue Ocean uses short-lived session tokens to authorize actions with fine-grained scopes.
Tokens are created by signing a scope request with a user's wallet. Keys and signatures are
never stored; only the resulting token string is kept in memory.

## Issue Token

`requestScopes(scopes, signer, ttlMs?)`

The wallet signs the following payload (`ScopeRequestPayload`):

```ts
{
  scopes: string[]; // requested capabilities
  exp: number;      // Unix ms expiration
}
```

The signature becomes the session token. The response contains:

```json
{
  "token": "string",
  "scopes": ["read"],
  "exp": 1700000000000
}
```

## Refresh Token

`refreshToken(token, signer, ttlMs?)` rotates an existing token and emits a `{token.rotated}` event:

```json
{
  "old": "previousToken",
  "token": "newToken"
}
```

Clients should replace the old token with the new value and discard the previous signature.

## Errors

- `{E_SCOPE}` – unknown or insufficient scope requested/validated.
- `{E_EXPIRED}` – token missing or expired.

Wallet signatures must be generated using privacy-first key usage: the signing key is kept in
memory only for the duration of the operation and is never persisted to disk.
