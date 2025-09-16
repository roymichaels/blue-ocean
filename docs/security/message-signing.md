# Message Signing / Replay

- Canonical JSON over `type + payload + sender` → ed25519 signature
- Validate: signature, `ts` window, `nonce` cache
- Drop on { E_SIGNATURE_INVALID | E_TIMESTAMP_SKEW | E_REPLAY }
