# Secure Key Management

Sensitive configuration values such as `NEAR_RPC_URL` must be supplied via environment variables. In production environments, load these variables from a dedicated secrets manager (AWS Secrets Manager, Hashicorp Vault, Docker secrets, etc.) rather than committing them to source control. The OrderPayment factory contract address is managed by admins through the dashboard and does not require an environment variable.

At runtime the app validates that required keys are present and will throw an error if any are missing. Development-only flags are automatically ignored when `NODE_ENV` is set to `production`.

## Cache encryption secret

`CACHE_SECRET` encrypts persisted snapshot files using AES-GCM. Set this to a high-entropy value for every deployment and store it in the same secrets manager you use for other credentials. Operators can generate a suitable secret with:

```sh
openssl rand -hex 32
```

Expose the value as the `CACHE_SECRET` environment variable (or through Vault injection during bootstrap) before starting the relayer or any other Node.js runtime that touches the on-disk cache. The services layer now fails fast when the secret is undefined so CI and production pipelines surface misconfigurations immediately.
