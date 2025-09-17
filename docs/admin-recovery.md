# Admin recovery flow

Blue Ocean tenants can bootstrap a secondary administrator without exposing the master seed phrase. The recovery channel relies on signed Waku messages, rate limiting, and a short-lived grant that is bound to the requesting device.

## Overview

1. **Generate a recovery packet** – The security desk issues a `{ tenantId, codeId, code, deviceId, targetPublicKey }` payload. The packet is encoded as a deeplink/QR code and persists in the agent KV store at `recovery:codes:<codeId>` until it expires.
2. **Request recovery** – The requester scans the packet inside the app’s **Recover admin access** screen (`/auth/recover-admin`). The UI signs an `admin.recovery.request` Waku message and broadcasts it to `/blue-ocean/users/<tenantId>`.
3. **Verify approvals** – Each active administrator receives the request through the `AdminAgent`. They approve via an `admin.recovery.verify` message. The agent requires `k ≥ 2` unique approvals, enforces timestamp/nonce replay protection, and rate limits invalid attempts.
4. **Grant issuance** – Once the threshold is met the agent creates an `AdminGrant` entry, publishes `admin.recoveryGranted`, and emits an in-app event. The grant is device-bound, expires quickly (10 minutes by default), and is purged after use.
5. **Revocation** – Admins can revoke outstanding grants which publishes `admin.recoveryRevoked` and clears state after the retention window.

## Topics

| Event | Topic | Payload highlights |
| --- | --- | --- |
| Recovery request | `/blue-ocean/admin.recovery.request/<tenant>` | `codeId`, `deviceId`, `requestedBy`, `approvalsRequired` |
| Verification | `/blue-ocean/admin.recovery.verify/<tenant>` | `codeId`, `approver`, `approvals` |
| Attempt (failure/lockout) | `/blue-ocean/admin.recoveryAttempt/<tenant>` | `codeId`, `deviceId`, `reason` |
| Grant issued | `/blue-ocean/admin.recoveryGranted/<tenant>` | `grantId`, `codeId`, `expiresAt`, `approvedBy` |
| Grant revoked | `/blue-ocean/admin.recoveryRevoked/<tenant>` | `grantId`, `codeId`, `revokedAt` |

All topics are dual-written with tenant scopes so downstream relays can subscribe per deployment.

## Rate limiting

* Device-scoped window: 5 failed attempts in 10 minutes triggers a 30-minute lockout.
* Code lockout: persisted alongside the code record so restarts honour previous failures.
* Timestamp/nonce: the agent rejects messages older than two minutes or repeated nonces to avoid Waku history replays.

## Testing

* `tests/auth/adminRecovery.test.ts` covers code generation, request/verify flows, rate limiting, and replay handling.
* `tests/waku/recoveryHistory.test.ts` replays stored events to guarantee idempotency.

Use `yarn jest --config tests/jest.unit.config.js --testPathPattern=auth/adminRecovery.test.ts` to re-run the suite locally.
