# Architecture Overview

- **Agents**: domain brains (users, stores, products, orders, notifications).
- **Transport**: Waku (signed + encrypted) — no centralized backend.
- **State**: local warm caches; hydratable from Waku history + NEAR Lake.
- **Identity**: wallet; roles via signed admin flow; PIN-2FA for sensitive actions.
- **Payments**: NEAR escrow (MVP); MoonPay = tenant-configured, **flagged**.
