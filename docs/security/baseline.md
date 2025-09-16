# Security Baseline (MVP)

- Pseudonymous identities; tenant-controlled KYC policy
- PIN-2FA (6 digits) for admin actions + checkout; bcrypt hash in secure storage
- Scoped session tokens (`checkout`, `admin:*`), rotate ≤60m
- Waku messages: signed, `ts` ±5m, `nonce` anti-replay (TTL 10m), encrypted payload
- Least privilege; rate-limit sensitive flows
- No centralized telemetry; anonymous, minimal events over Waku
