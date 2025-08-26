# Architecture

## Service Boundaries
- **settings-agent** – subscribes to `/blue-ocean/settings/1`, validates admin senders, and updates in-memory config.
- **users-agent** – listens on `/blue-ocean/users/1` to register users and roles, rejecting unauthenticated or duplicate roles.
- **products-agent** – watches `/blue-ocean/products/1` for admin-signed product changes and hydrates the catalog.
- **orders-agent** – processes `/blue-ocean/orders/1` messages when the sender matches the order user and keeps an ephemeral history.
- **notifications-agent** – forwards order events to `/blue-ocean/notifications/1` and persists user notifications locally.
- **review-agent** – distributes reviews on `/blue-ocean/reviews/1`, verifies they relate to completed orders, and updates reputation.

## Peer-to-Peer Data Flow
Blue Ocean operates entirely peer-to-peer over the Waku network. Each domain uses a dedicated topic:

| Topic | Purpose |
|-------|---------|
| `/blue-ocean/settings/1` | Store configuration |
| `/blue-ocean/users/1` | Registered users and roles |
| `/blue-ocean/products/1` | Product catalog |
| `/blue-ocean/stores/1` | Store registry |
| `/blue-ocean/orders/1` | Orders and status updates |
| `/blue-ocean/notifications/1` | System notifications |
| `/blue-ocean/reviews/1` | Product reviews |
| `/blue-ocean/analytics/1` | Anonymous analytics events |
| `/blue-ocean/chat/1/<roomId>` | Encrypted buyer/seller chat |

Messages on these topics are signed and may be encrypted, and agents hydrate their state from message history on boot.

## Fee Handling
Network settings store a fee address and basis points (`feeBps`) that define the protocol fee.
The `OrderPayment` smart contract calculates `fee = amount * feeBps / 10000` when releasing funds, sending the fee to the configured address and the remainder to the seller.
