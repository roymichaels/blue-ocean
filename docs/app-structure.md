# BlueOcean v2 App Structure

This document captures the high-level directory tree for the BlueOcean v2 Expo application. Update it whenever the project structure changes so that it remains current.

```text
blue-ocean/
├─ app/                         App shell and routes
│  ├─ admin/                    Global admin console
│  ├─ store/                    Store owner dashboard
│  │  └─ [storeId]/admin/       Store-specific admin
│  ├─ stores/                   Store creation & listing
│  ├─ category/
│  ├─ product/
│  ├─ orders/
│  ├─ reviews/
│  ├─ user/
│  └─ …
├─ public/                      Static web assets
└─ …
```

## Major Sections

- **App Shell** – [`app/`](../app)
- **Store Owner** – [`app/stores`](../app/stores) & [`app/store`](../app/store)
- **Admin** – [`app/admin`](../app/admin) & [`app/store/[storeId]/admin`](../app/store/%5BstoreId%5D/admin)

*Keep this file in sync with the repository’s evolving structure.*
