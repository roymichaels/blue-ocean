# Configuration

Use `requireEnv(key, fallback?)` from `src/services/config.ts` to read environment variables. Missing keys will throw unless a fallback is provided.

| Key | Description | Default |
| --- | ----------- | ------- |
| `EXPO_PUBLIC_DEFAULT_STORE` | Default store identifier | `default` |
| `EXPO_PUBLIC_NETWORK` | NEAR network override (`mainnet` or `testnet`) | inferred from contract ID |
| `EXPO_PUBLIC_CONTRACT_ID` | NEAR contract account | none |
| `EXPO_PUBLIC_WALLET_URL` | Optional wallet URL | based on network |
| `NEAR_LAKE_BUCKET` | S3 bucket for NEAR Lake state | none |
| `NEAR_LAKE_REGION` | AWS region for the bucket | `eu-central-1` |
| `NEAR_LAKE_ENDPOINT` | Override S3 endpoint used for NEAR Lake | none |
| `AWS_ACCESS_KEY_ID` | Access key for custom S3 endpoints | none |
| `AWS_SECRET_ACCESS_KEY` | Secret key for custom S3 endpoints | none |
