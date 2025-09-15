# Admin Join Requests

Wallets request admin access by broadcasting a signed Waku message.

## Message

```
{
  "type": "admin.joinRequested",
  "payload": {
    "address": "<address>",
    "requestedAt": 1700000000000
  },
  "sender": { "publicKey": "0x..." },
  "signature": "0x..."
}
```

The system answers with `admin.registered` once the wallet is approved.

## Errors

- `E_SIGNATURE_INVALID` – signature could not be verified.
- `E_UNAUTHORIZED` – wallet not on allowlist.
- `E_DUPLICATE` – join request already registered or pending approval.
