# Architecture

Blue Ocean is an underground gadgets platform for web3, privacy, and security services. This document describes the agents and data flows that make store creation and other capabilities possible.

## Service Boundaries
- **settings-agent** – subscribes to `/blue-ocean/{tenantId}/settings/1`, validates admin senders, and updates in-memory config.
- **users-agent** – listens on `/blue-ocean/{tenantId}/users/1` to register users and roles, rejecting unauthenticated or duplicate roles.
- **products-agent** – watches `/blue-ocean/{tenantId}/products/1` for admin-signed product changes and hydrates the catalog.
- **orders-agent** – processes `/blue-ocean/{tenantId}/orders/1` messages when the sender matches the order user and keeps an ephemeral history.
- **notifications-agent** – forwards order events to `/blue-ocean/{tenantId}/notifications/1` and persists user notifications locally.
- **review-agent** – distributes reviews on `/blue-ocean/{tenantId}/reviews/1`, verifies they relate to completed orders, and updates reputation.

## Peer-to-Peer Data Flow
Blue Ocean operates entirely peer-to-peer over the Waku network. Each domain uses a tenant-scoped topic:

| Topic | Purpose |
|-------|---------|
| `/blue-ocean/{tenantId}/settings/1` | Store configuration |
| `/blue-ocean/{tenantId}/users/1` | Registered users and roles |
| `/blue-ocean/{tenantId}/products/1` | Product catalog |
| `/blue-ocean/{tenantId}/stores/1` | Store registry |
| `/blue-ocean/workspaces/1` | Workspace discovery metadata (encrypted) |
| `/blue-ocean/{tenantId}/orders/1` | Orders and status updates |
| `/blue-ocean/{tenantId}/notifications/1` | System notifications |
| `/blue-ocean/{tenantId}/reviews/1` | Product reviews |
| `/blue-ocean/{tenantId}/analytics/1` | Anonymous analytics events |
| `/blue-ocean/{tenantId}/chat/1/<roomId>` | Encrypted buyer/seller chat |

Messages on these topics are signed and may be encrypted, and agents hydrate their state from message history on boot.

## Fee Handling
Network settings store a fee address and basis points (`feeBps`) that define the protocol fee.
The `OrderPayment` smart contract calculates `fee = amount * feeBps / 10000` when releasing funds, sending the fee to the configured address and the remainder to the seller.
