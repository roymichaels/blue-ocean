# Secure Key Management

Sensitive configuration values such as `ADMIN_WALLET_ADDRESS` and `NEAR_RPC_URL` must be supplied via environment variables. In production environments, load these variables from a dedicated secrets manager (AWS Secrets Manager, Hashicorp Vault, Docker secrets, etc.) rather than committing them to source control. The OrderPayment factory contract address is managed by admins through the dashboard and does not require an environment variable.

At runtime the app validates that required keys are present and will throw an error if any are missing. Development-only flags are automatically ignored when `NODE_ENV` is set to `production`.
