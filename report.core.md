# Angle 1 TODO Coverage

| File | TODO IDs | Notes |
| --- | --- | --- |
| `services/orders.ts` | TODO:CORE-001, TODO:CORE-003, TODO:CORE-004, TODO:CORE-005, TODO:CORE-007, TODO:CORE-010, TODO:CORE-011, TODO:CORE-012, TODO:CORE-013, TODO:CORE-014, TODO:CORE-015, TODO:CORE-016, TODO:CORE-020, TODO:CORE-021 | Consolidate the Angle 1 orders pipeline: wrap escrow deploys, enforce KYC and nonce guards, mirror lifecycle analytics, route orchestrator hooks, and adopt tenant-scoped topics with ts/nonce propagation. |
| `utils/buildOrderTimeline.ts` | TODO:CORE-002 | Replace the provisional timeline builder once cross-network fulfillment milestones are finalized. |
| `utils/nonceStore.ts` | TODO:CORE-004, TODO:CORE-006, TODO:CORE-008, TODO:CORE-009 | Move nonce tracking to the shared anti-replay ledger, persist tenant reservations, and broadcast releases so multi-device checkouts stay in sync. |
| `agents/orders-agent.ts` | TODO:CORE-006, TODO:CORE-009, TODO:CORE-011, TODO:CORE-016, TODO:CORE-017, TODO:CORE-018 | Extend the shared timeline builder, emit purchase proofs, and wire refund/cancel flows plus Waku ack/resync hooks once the reliability layer lands. |
| `agents/notifications-agent.ts` | TODO:CORE-010, TODO:CORE-019, TODO:CORE-020 | Broadcast tenant-scoped notifications and emit queue telemetry into the analytics pipeline after the metrics schema stabilizes. |
| `agents/products-agent.ts` | TODO:CORE-020 | Mirror product updates into the stock analytics stream when the topic contract is finalized. |
| `agents/delivery-agent.ts` | TODO:CORE-022 | Verify remote order existence before emitting delivery updates once the coordination spec is ready. |
| `services/waku.ts` | TODO:CORE-020, TODO:CORE-022, TODO:CORE-023 | Adopt tenant-scoped topics, insert the orders pipeline handshake before node start, and derive per-tenant shared keys. |
| `utils/wakuTopics.ts` | TODO:CORE-020 | Expand `buildTopic` to accept tenant-scoped domains everywhere. |
| `schemas/waku/order.status.ts`, `schemas/waku/order.purchaseProof.ts` | TODO:CORE-021 | Enforce ts/nonce fields and skew checks on Waku order messages. |
