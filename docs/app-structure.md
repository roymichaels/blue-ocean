# App Structure

Blue Ocean uses Expo Router with a single root layout and a minimal set of routes.

```text
blue-ocean/
├─ app/
│  ├─ _layout.tsx        Root layout -> RootLayout
│  ├─ index.tsx          Home screen ("/")
│  └─ store/
│     └─ [storeId]/
│        └─ index.tsx    Store detail screen ("/store/:id")
├─ src/layout/
│  └─ RootLayout.tsx     Application shell and navigation
```

Additional UI flows (cart, orders, profile, etc.) are implemented as modals or other components instead of file-based routes.

*Keep this file in sync with the repository’s evolving structure.*
