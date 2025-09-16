# Scope Policy Legal Review

Legal counsel reviewed the session token scope model to ensure
compliance with privacy and data-minimization requirements.

- Scopes remain limited to `read`, `write`, and the newly introduced
  `checkout` capability, avoiding over-broad privileges.
- Tokens are short-lived and revocable, minimizing long-term exposure.
- Users must explicitly consent before a token is issued.

The checkout scope was approved on the condition that it is wallet-signed,
rotated on refresh, and can be disabled quickly through
`EXPO_PUBLIC_SCOPED_TOKENS_ROLLBACK` if ecosystem partners encounter issues.

No additional restrictions were required. Future scope additions should
undergo a similar review before deployment.
