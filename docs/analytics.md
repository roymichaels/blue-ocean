# Analytics Events

This app records anonymized funnel events over Waku for basic analytics. Checkout events also embed the current cache hit ratio so cache performance can be correlated with conversion rates.

## Event Schema

Events published on `/blue-ocean/{tenantId}/analytics/1` follow this structure:

```json
{
  "id": "uuid",
  "timestamp": 0,
  "sessionId": "uuid",
  "actor": "sha256(userAddress)",
  "type": "event.type",
  "payload": { "key": "value" }
}
```

- **id** – unique event identifier.
- **timestamp** – milliseconds since epoch.
- **sessionId** – random identifier for the current session.
- **actor** – hashed wallet address when available.
- **type** – event name.
- **payload** – event-specific data.

## Event Types

| Type | Payload |
|------|---------|
| `catalog.view` | `{ category: string | null }` |
| `catalog.product_view` | `{ productId: string }` |
| `cart.add` | `{ productId: string, quantity: number }` |
| `cart.remove` | `{ itemId: string }` |
| `cart.update` | `{ itemId: string, quantity: number }` |
| `cart.clear` | `{}` |
| `checkout.start` | `{ items: number, total: number }` |
| `checkout.complete` | `{ orderIds: string[], total: number, cacheHitRatio: number }` |
| `checkout.token_integrity` | `{ tokenValid: boolean, success: boolean }` |
| `chat.view` | `{ messageCount: number }` |
| `chat.load_more` | `{ messageCount: number }` |

These events can be expanded as the analytics needs evolve.
