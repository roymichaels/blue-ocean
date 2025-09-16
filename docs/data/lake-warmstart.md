# NEAR Lake Warm-Start

- On boot: start Waku → hydrate caches from history → reconcile with Lake (S3) → emit `{cache.synced}`
- Domains: users, stores, products, orders
- Alerts: lag > 3s
