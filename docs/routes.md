# Routes

All routes render within the shared `RootLayout` (`src/layout/RootLayout.tsx`). The router currently defines two paths:

| Path | Description | Role requirement |
|------|-------------|------------------|
| `/` | Home screen | none |
| `/store/:id` | Store detail | none |

Additional flows such as cart, orders, and profile are handled via modals or standalone components rather than file-based routes.
