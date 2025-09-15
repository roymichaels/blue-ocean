# Notification Topics

Reference of Waku topics used by the notifications pipeline.

## Topic Map

| Topic | Purpose |
|-------|---------|
| `/blue-ocean/orders/1` | Order events published by the orders agent. |
| `/blue-ocean/notifications/1` | User-facing notifications broadcast by the notifications agent. |

## Usage

Producers emit order events on `/blue-ocean/orders/1`. The notifications agent listens for these events and forwards localized messages on `/blue-ocean/notifications/1` for subscribers.

For schema details see [notifications.md](./notifications.md).
