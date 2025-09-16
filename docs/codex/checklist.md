# MVP Checklist (Go/No-Go)

- Wallet connect works on testnet
- First wallet auto-admin; later admins need approval
- Scoped token enforced at checkout (`['checkout']`)
- Store → Add First Product funnel completes < 5 min
- NEAR escrow deploy/release works with fee address/BPS
- Waku delivery notifications show order status updates
- Warm cache covers users/stores/orders
- Offline restart retains catalog & orders
- PIN-2FA gates admin actions & checkout
- No Matrix; Waku topics documented
- Integration tests: store + checkout
- Hebrew strings exist for new UI
- A11y checks (labels/contrast/reduced motion)
