# Routes

Documentation of file-based routes and required roles.

## Public

| Path | Role requirement |
|------|------------------|
| `/` | none |
| `/stores` | none |
| `/categories` | none |
| `/category/[id]` | none |
| `/product/[id]` | none |

## Authenticated

| Path | Role requirement |
|------|------------------|
| `/cart` | login to checkout |
| `/orders` | view personal orders (login required) |
| `/profile` | manage account settings (login required) |

## Store Owner

| Path | Role requirement |
|------|------------------|
| `/store/[storeId]/admin/*` | owner of `[storeId]` |

## Admin

| Path | Role requirement |
|------|------------------|
| `/admin/*` | admin |

## Driver

| Path | Role requirement |
|------|------------------|
| `/driver-dashboard` | driver or admin |

### RBAC Summary
- **Public** routes are accessible without authentication.
- **Authenticated** routes require a logged in user.
- **Store Owner** routes require ownership of the target store.
- **Admin** routes are restricted to platform administrators.
- **Driver** screens require the driver role or admin privileges.

### API Namespace Summary
| Namespace | Topic |
|-----------|-------|
| `settings` | `/blue-ocean/settings/1` |
| `users` | `/blue-ocean/users/1` |
| `products` | `/blue-ocean/products/1` |
| `stores` | `/blue-ocean/stores/1` |
| `orders` | `/blue-ocean/orders/1` |
| `notifications` | `/blue-ocean/notifications/1` |
| `reviews` | `/blue-ocean/reviews/1` |
| `analytics` | `/blue-ocean/analytics/1` |
| `chat` | `/blue-ocean/chat/1/<roomId>` |
