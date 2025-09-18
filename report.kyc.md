# Angle 2 - KYC Hardening - TODO Coverage

| Area | Files (name-based) | TODO IDs |
|---|---|---|
| Agent approval & receipts | users-agent | KYC-002, KYC-003, KYC-017, KYC-019 |
| Checkout gate | OrderService, Checkout screen | KYC-001, KYC-004, KYC-009 |
| DM transport & crypto | DM service/utils | KYC-005, KYC-008, KYC-009, KYC-018 |
| Receipts persistence | services/kycReceipts.ts | KYC-006, KYC-007, KYC-020 |
| Schema enforcement | schemas/waku/kyc.* | KYC-009 |
| Auth/rehydration | AuthContext / kycReceipts | KYC-006, KYC-012 |
| Admin UI | KYC Approvals screen | KYC-010, KYC-014, KYC-017 |
| Buyer UI | KYCFlow | KYC-013, KYC-015, KYC-016 |
| Monitoring | monitoring service | KYC-020 |

## Next steps
- Implement KYC-002/003 (verify & emit receipt), then KYC-004 (checkout gate), then KYC-006 (history replay).
