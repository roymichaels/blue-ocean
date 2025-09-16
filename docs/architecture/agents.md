# Agents

## users-agent
- Adds/updates/removes users
- KYC: request/update → status (pending/verified/rejected)
- Requires scope: `admin:users` for admin actions

## stores-agent
- Create/update store metadata; emit `store.created`
- Scope: `admin:settings`

## products-agent
- Create/update products; hydrate catalog
- Scope: `admin:products`

## orders-agent
- Place orders; status updates; buyer must match `userId`
- Needs `checkout` scope; emits `order.status`

## notifications-agent
- Listens to orders; emits `/notifications/1` updates
- Local per-user store

## admin-agent
- Bootstrap: first wallet → admin
- Queue & approve additional admins (signed approval); emits `admin.requested` / `admin.registered`
