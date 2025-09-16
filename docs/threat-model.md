# Threat Model

Understanding likely attacks helps harden Blue Ocean's peer-to-peer agents.

## Assets
- Admin private keys
- Message integrity and authenticity
- User data and consent grants

## Attack Vectors
- Key compromise through theft or insecure storage
- Replay attacks on signed messages
- Man-in-the-middle interception of Waku traffic
- Phishing via misleading scope approval prompts
- Denial of service from malicious peers
- Token theft or reuse via compromised device storage

## Mitigations
- All messages are signed and optionally encrypted
- Secure key storage practices (see [Auth Key Storage Best Practices](auth-keys.md))
- Nonces or message hashes to detect replay
- Known peer lists and encrypted transports
- Rate limiting and exponential backoff
- Wallet-signed, scope-limited session tokens rotate frequently; checkout
  scope isolates payment privileges and limits blast radius

## Operational Risks

- Device secure storage may fail to persist session tokens consistently. The
  rollback flag for scoped checkout tokens provides a rapid mitigation path
  while clients re-issue fresh wallet signatures.

## WCAG-Compliant Consent Prompts

Scope approvals should be transparent and accessible:

- Present clear descriptions for each requested scope
- Meet WCAG 2.1 AA requirements: keyboard access, focus indicators, and sufficient contrast
- Announce scope changes for screen readers
- Require explicit opt-in and avoid dark patterns

These guidelines reduce social engineering risk while supporting users of assistive technologies.
