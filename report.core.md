<<<<<<< HEAD
﻿# Angle 1 - Core Product Logic (Checkout + Orders) - TODO Coverage

> This file is generated during scaffolding. Keep entries terse and append-only during Angle 1.

| File (name-based) | Inserted TODO IDs | Notes |
|---|---|---|
| services/orders* | CORE-001, CORE-003, CORE-004, CORE-005, CORE-014, CORE-015, CORE-020, CORE-021 | wrapper + gates + emit |
| CheckoutModal / screen | CORE-002, CORE-004, CORE-019 | handler & analytics |
| orders-agent | CORE-006, CORE-008, CORE-009, CORE-011, CORE-016, CORE-017, CORE-018 | subs + status + stubs |
| notifications-agent | CORE-010, CORE-020 | broadcasts |
| delivery-agent | CORE-022 | existence check |
| WakuService | CORE-020, CORE-023 | tenant topics + shared keys |
| utils/wakuTopics | CORE-020 | helper |
| schemas/order.* | CORE-021 | ts/nonce |
| utils/nonceStore.ts | CORE-004 | placeholder store |

## Next steps
- Implement CORE-001/003/004 pathway end-to-end.
- Add unit tests for replay/tamper/stock.
=======
# Angle 1 TODO Coverage

| File | TODO IDs | Notes |
| --- | --- | --- |
| `services/orders.ts` | TODO:CORE-001, TODO:CORE-003, TODO:CORE-004, TODO:CORE-005, TODO:CORE-007, TODO:CORE-010, TODO:CORE-011, TODO:CORE-012, TODO:CORE-013, TODO:CORE-014, TODO:CORE-015, TODO:CORE-016 | Consolidate Angle 1 order pipeline work: mirror lifecycle events to analytics, swap in the shared metrics client and orchestration services, bridge KYC/checkout flows to shared stores, and integrate fraud, delivery, and refund hooks. |
| `utils/buildOrderTimeline.ts` | TODO:CORE-002 | Replace the provisional order timeline builder once cross-network fulfillment milestones are finalized. |
| `utils/nonceStore.ts` | TODO:CORE-006, TODO:CORE-008, TODO:CORE-009 | Move nonce tracking from in-memory to the shared ledger, persist reservations per tenant, and broadcast releases so multi-device checkouts stay in sync. |
| `agents/orders-agent.ts` | TODO:CORE-017, TODO:CORE-018 | Extend the shared timeline builder with agent-specific phases and add Waku ack/resync hooks once the reliability layer lands. |
| `agents/notifications-agent.ts` | TODO:CORE-019 | Emit notification queue telemetry into the analytics pipeline after the metrics schema stabilizes. |
| `agents/products-agent.ts` | TODO:CORE-020 | Mirror product updates into the stock analytics stream when the topic contract is finalized. |
| `agents/stores-agent.ts` | TODO:CORE-021 | Emit store persistence events to the analytics topic once tenant metrics schema ships. |
| `services/waku.ts` | TODO:CORE-022 | Insert the orders pipeline handshake before node start as soon as the coordination spec is ready. |
| `src/features/cart/components/CartModal.tsx` | TODO:CORE-024 | Surface the Angle 1 checkout timeline in the UI when orchestrator status feeds become available. |
| `src/features/cart/services/cart.ts` | TODO:CORE-025 | Forward add-to-cart telemetry to the checkout analytics contract after Angle 1 metrics go live. |
>>>>>>> d216adbb8dbc37b3b9c4757b53aba85da3b76ceb
