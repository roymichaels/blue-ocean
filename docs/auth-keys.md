# Auth Key Storage Best Practices

Securing authentication keys protects every agent in the protocol. Follow these guidelines to minimize risk:

- **Never commit keys to source control.** Treat `.env` files as secrets and prefer example files for defaults.
- **Use dedicated secret managers** (AWS Secrets Manager, HashiCorp Vault, Docker secrets) to supply keys at runtime.
- **On devices, rely on OS keychains** such as Secure Enclave, TPM, or `expo-secure-store` for Expo apps.
- **Rotate keys regularly** and revoke compromised credentials immediately.
- **Limit key exposure** by avoiding logs and storing only in memory after loading.
- **Protect private keys with passphrases** and prefer hardware wallets for administrative roles.
- **Validate required keys on boot** so missing or malformed values fail fast.

Proper storage and lifecycle management of keys reduces the chance of unauthorized access to admin functions or encrypted data.
