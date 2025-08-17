# Signed System & Order Messages

Messages on `/blue-ocean/notifications/1` and `/blue-ocean/orders/1` must be signed
using the standard Waku message envelope:

```json
{
  "type": "event.type",
  "payload": "string",
  "sender": {
    "publicKey": "hex",
    "role": "admin" | "user"
  },
  "signature": "0x..."
}
```

- **type** – event identifier (`system.message`, `order.notification`, etc.).
- **payload** – UTF-8 string delivered to subscribers. For orders this should be a
  serialized `NotificationWakuPayload`.
- **sender.publicKey** – identity of the signer.
- **signature** – signature produced by the sender's key over the message content.

Clients verify signatures and drop any message that fails validation.
