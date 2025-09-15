# Scope Policy Legal Review

Legal counsel reviewed the session token scope model to ensure
compliance with privacy and data-minimization requirements.

- Scopes remain limited to `read` and `write` capabilities, avoiding
  over-broad privileges.
- Tokens are short-lived and revocable, minimizing long-term exposure.
- Users must explicitly consent before a token is issued.

No additional restrictions were required. Future scope additions should
undergo a similar review before deployment.
