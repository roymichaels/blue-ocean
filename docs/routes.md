# Routes (v2, tenant-scoped)

## Public
| Path | Role requirement |
|------|------------------|
| `/t/[tenantId]` | none |
| `/t/[tenantId]/storefront` | none |
| `/t/[tenantId]/store/[storeId]` | none |
| `/t/[tenantId]/product/[id]` | none |
| `/t/[tenantId]/category/[id]` | none |
| `/t/[tenantId]/orders/[id]` | buyer, seller, or driver to update |
| `/t/[tenantId]/driver-dashboard` | driver or admin |

## Store
| Path | Role requirement |
|------|------------------|
| `/t/[tenantId]/stores/create` | wallet connection required |
| `/t/[tenantId]/store/[storeId]/admin/dashboard` | store owner of `[storeId]` |
| `/t/[tenantId]/store/[storeId]/admin/products` | store owner of `[storeId]` |
| `/t/[tenantId]/store/[storeId]/admin/orders` | store owner of `[storeId]` |
| `/t/[tenantId]/store/[storeId]/admin/kyc-approvals` | store owner of `[storeId]` |
| `/t/[tenantId]/store/[storeId]/admin/user-management` | store owner of `[storeId]` |
| `/t/[tenantId]/store/[storeId]/admin/pricing-tiers` | store owner of `[storeId]` |
| `/t/[tenantId]/store/[storeId]/admin/deliveries` | store owner of `[storeId]` |
| `/t/[tenantId]/store/[storeId]/admin/bulk-upload` | store owner of `[storeId]` |
| `/t/[tenantId]/store/[storeId]/admin/disputes` | store owner of `[storeId]` |
| `/t/[tenantId]/store/[storeId]/admin/settings` | store owner of `[storeId]` |

## Admin
| Path | Role requirement |
|------|------------------|
| `/t/[tenantId]/admin` | admin |
| `/t/[tenantId]/admin/dashboard` | admin |
| `/t/[tenantId]/admin/kyc-approvals` | admin |
| `/t/[tenantId]/admin/user-management` | admin |
| `/t/[tenantId]/admin/pricing-tiers` | admin |
| `/t/[tenantId]/admin/deliveries` | admin |
| `/t/[tenantId]/admin/bulk-upload` | admin |
| `/t/[tenantId]/admin/disputes` | admin |
| `/t/[tenantId]/admin/settings` | admin |

### RBAC Summary
- **Public** routes are accessible without authentication.
- **Store** routes require the corresponding store owner and a connected wallet.
- **Admin** routes are restricted to tenant admins.
- **Driver** actions are limited to users with the driver role or admins.

### API Namespace Summary
| Namespace | Topic |
|-----------|-------|
| `settings` | `/blue-ocean/{tenantId}/settings/1` |
| `users` | `/blue-ocean/{tenantId}/users/1` |
| `products` | `/blue-ocean/{tenantId}/products/1` |
| `stores` | `/blue-ocean/{tenantId}/stores/1` |
| `orders` | `/blue-ocean/{tenantId}/orders/1` |
| `notifications` | `/blue-ocean/{tenantId}/notifications/1` |
| `reviews` | `/blue-ocean/{tenantId}/reviews/1` |
| `analytics` | `/blue-ocean/{tenantId}/analytics/1` |
| `chat` | `/blue-ocean/{tenantId}/chat/1/<roomId>` |

