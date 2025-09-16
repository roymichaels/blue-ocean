# NEAR Payment Flow (MVP)

- Requires: CONTRACT_ID, FEE_ADDRESS, FEE_BPS
- Steps: build order → require `checkout` scope + PIN → deploy escrow → `order.status: created` → on fulfill: release escrow
