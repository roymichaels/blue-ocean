# Waku Topics (1 = v1)
// TODO:TODO-118 Document retention and pruning strategy for each topic to align with data minimization policies.
// TODO:REC-218 Provide end-to-end encryption walkthroughs for new topic families to accelerate feature onboarding.

- `/blue-ocean/users/1` — users + roles + KYC status
- `/blue-ocean/stores/1` — store metadata
- `/blue-ocean/products/1` — catalog
- `/blue-ocean/orders/1` — order events
- `/blue-ocean/notifications/1` — user/system notifications
- `/blue-ocean/reviews/1` — reviews (flagged in MVP)
- `/blue-ocean/analytics/1` — anonymous funnel (opt-out)
- `/blue-ocean/chat/1/<roomId>` — encrypted chat (flagged)

**Envelope**
```json
{
  "type": "<domain.event>",
  "payload": { "... domain fields ...", "ts": 1700000000000, "nonce": "hex24" },
  "sender": { "publicKey": "<hex>", "role": "admin|seller|buyer" },
  "signature": "0x..."
}
```
