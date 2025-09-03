# Navigation

Blue Ocean relies on [Expo Router](https://expo.github.io/router/) and a tab layout to move between screens.
The diagram below outlines the primary user flow.

```mermaid
flowchart LR
    Tabs --> Home
    Tabs --> Stores
    Tabs --> Cart
    Tabs --> Orders
    Tabs --> Profile
    Home -->|select category| Category
    Category --> Product
    Product --> Cart
```

- **Tabs** – implemented in `src/layout/TabsLayout.tsx`, renders the bottom navigation bar.
- **Avatar Menu** – the profile avatar opens authentication actions.
- **Category** – routes like `/storefront/category/[id]` show filtered storefront views.

This high‑level map helps visualize how users move through the application.
