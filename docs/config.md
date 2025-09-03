# Configuration

Use `requireEnv(key, fallback?)` from `src/services/config.ts` to read environment variables. Missing keys will throw unless a fallback is provided.

| Key | Description | Default |
| --- | ----------- | ------- |
| `EXPO_PUBLIC_DEFAULT_STORE` | Default store identifier | `default` |
| `EXPO_PUBLIC_NETWORK` | NEAR network override (`mainnet` or `testnet`) | inferred from contract ID |
| `EXPO_PUBLIC_CONTRACT_ID` | NEAR contract account | none |
| `EXPO_PUBLIC_WALLET_URL` | Optional wallet URL | based on network |
