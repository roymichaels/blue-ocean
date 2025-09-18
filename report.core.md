# Angle 1 - Core Product Logic (Checkout + Orders) - TODO Coverage

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
