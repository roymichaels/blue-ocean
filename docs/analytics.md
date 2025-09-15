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
| `app.error` | `{ message: string, severity: 'debug' | 'info' | 'warning' | 'error' | 'fatal', name?: string, stack?: string, componentStack?: string, context?: string, occurrence: number, tags?: Record<string, string>, extras?: Record<string, unknown> }` |

These events can be expanded as the analytics needs evolve.

## Real-time Metrics Listener

You can subscribe to analytics (and error) events directly from the Waku network.
All tenants publish metrics to `/blue-ocean/{tenantId}/analytics/1`. Replace
`{tenantId}` with the ID from `EXPO_PUBLIC_SHOP_TENANT_ID` (defaults to `alpha`).

1. Install the Waku SDK if it is not already available:

   ```sh
   yarn add @waku/sdk
   ```

2. Bootstrap a light node, wait for a relay peer, and register a relay observer
   for the analytics topic:

   ```ts
   import {
     createLightNode,
     waitForRemotePeer,
     Protocols,
     createDecoder,
   } from '@waku/sdk';

   const TENANT_ID = process.env.EXPO_PUBLIC_SHOP_TENANT_ID || 'alpha';
   const ANALYTICS_TOPIC = `/blue-ocean/${TENANT_ID}/analytics/1`;

   async function listen(onEvent: (event: any) => void) {
     const node = await createLightNode({ defaultBootstrap: true });
     await node.start();
     await waitForRemotePeer(node, [Protocols.Relay]);

     const decoder = createDecoder({ contentTopic: ANALYTICS_TOPIC });
     const handler = async (wakuMessage: any) => {
       if (!wakuMessage?.payload) return;
       const payload = new TextDecoder().decode(wakuMessage.payload);
       try {
         onEvent(JSON.parse(payload));
       } catch (err) {
         console.error('Failed to decode analytics event', err);
       }
     };

     node.relay.addObserver(handler, [decoder]);
     return () => node.relay.deleteObserver(handler);
   }

   listen((event) => {
     console.log('[analytics]', event.type, event);
   });
   ```

   `event.type` contains values like `catalog.view`, `checkout.complete`, or
   `app.error`. Error events include stack traces and component stack
   information (when available) along with a `severity` and `occurrence` count.

3. To replay historical metrics, call `node.store.queryGenerator([decoder])` and
   iterate through the returned pages before attaching the live observer. This
   hydrates dashboards when the listener restarts.

4. When running multiple listeners, prefer a single shared node and topic
   decoder to avoid reconnecting for each subscription.
