# Routes

## Public
| Path | Role requirement |
|------|------------------|
| `/` | none |
| `/storefront` | none |
| `/store/[storeId]` | none |
| `/product/[id]` | none |
| `/category/[id]` | none |
| `/orders/[id]` | buyer, seller, or driver to update |
| `/driver-dashboard` | driver or admin |

## Store
| Path | Role requirement |
|------|------------------|
| `/stores/create` | wallet connection required |
| `/store/[storeId]/dashboard` | store owner of `[storeId]` |
| `/store/[storeId]/products` | store owner of `[storeId]` |
| `/store/[storeId]/orders` | store owner of `[storeId]` |

## Admin
| Path | Role requirement |
|------|------------------|
| `/admin` | admin |
| `/admin/dashboard` | admin |
| `/admin/kyc-approvals` | admin |
| `/admin/user-management` | admin |
| `/admin/pricing-tiers` | admin |
| `/admin/deliveries` | admin |
| `/admin/bulk-upload` | admin |
| `/admin/disputes` | admin |
| `/admin/settings` | admin |
