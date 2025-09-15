# Notification Topics

Reference of Waku topics used by the notifications pipeline.

> The notifications pipeline can be toggled via the `notificationsPipeline` feature flag
> (`EXPO_PUBLIC_NOTIFICATIONS_PIPELINE`). Canary rollout is supported through
> `EXPO_PUBLIC_NOTIFICATIONS_PIPELINE_CANARY_USERS` and the pipeline automatically
> pauses when backlog or latency alerts fire.

## Topic Map

| Topic | Purpose |
|-------|---------|
| `/blue-ocean/orders/1` | Order events published by the orders agent. |
| `/blue-ocean/notifications/1` | User-facing notifications broadcast by the notifications agent. |

## Usage

Producers emit order events on `/blue-ocean/orders/1`. The notifications agent listens for these events and forwards localized messages on `/blue-ocean/notifications/1` for subscribers.

For schema details see [notifications.md](./notifications.md).
