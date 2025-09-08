# BlueOcean v2 App Structure

This document captures the high-level directory tree for the BlueOcean v2 Expo application. Update it whenever the project structure changes so that it remains current.

```text
blue-ocean/
├─ app/                          App shell and routes
│  ├─ _layout.tsx                Global root layout
│  ├─ +html.tsx                  Web HTML shell
│  ├─ +not-found.tsx             404 boundary
│  ├─ index.tsx                  Home tab screen
│  ├─ stores.tsx                 Stores tab screen
│  ├─ profile.tsx                Profile tab screen
│  ├─ cart.tsx                   Cart tab screen
│  ├─ orders.tsx                 Orders tab screen
│  ├─ categories.tsx
│  ├─ category/
│  ├─ product/
│  ├─ reviews/
│  ├─ user/
│  └─ …
├─ public/                      Static web assets
└─ …
```

## Major Sections

- **App Shell & Tabs** – [`app/`](../app) hosts the root layout and primary tab screens.
- **Domain Routes** – [`app/category`](../app/category), [`app/product`](../app/product), [`app/orders`](../app/orders), [`app/reviews`](../app/reviews), [`app/user`](../app/user)

*Keep this file in sync with the repository’s evolving structure.*
