# BlueOcean v2 App Structure

This document captures the high-level directory tree for the BlueOcean v2 Expo application. Update it whenever the project structure changes so that it remains current.

```text
blue-ocean/
├─ app/                          App shell and routes
│  ├─ _layout.tsx                Root layout → TabsLayout
│  ├─ +html.tsx                  Web HTML shell
│  ├─ +not-found.tsx             404 boundary
│  ├─ index.tsx                  Home tab screen
│  ├─ stores.tsx                 Stores tab screen
│  ├─ cart.tsx                   Cart tab screen
│  ├─ orders.tsx                 Orders tab screen
│  ├─ profile.tsx                Profile tab screen
│  ├─ categories.tsx
│  ├─ category/
│  ├─ product/
│  ├─ reviews/
│  ├─ user/
│  └─ …
├─ src/layout/                   Shared layouts
│  ├─ TabsLayout.tsx             Renders global header & tabs
│  └─ SidebarTabBar.tsx
├─ components/GlobalHeader.tsx   Top header used in TabsLayout
├─ public/                       Static web assets
└─ …
```

## Major Sections

- **Root Layout & Tabs** – [`app/_layout.tsx`](../app/_layout.tsx) re-exports [`TabsLayout`](../src/layout/TabsLayout.tsx), which renders the global header and bottom tab bar.
- **Domain Routes** – [`app/category`](../app/category), [`app/product`](../app/product), [`app/orders`](../app/orders), [`app/reviews`](../app/reviews), [`app/user`](../app/user)

*Keep this file in sync with the repository’s evolving structure.*
