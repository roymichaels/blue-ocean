import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { loadVaultEnv } from './vault';

loadVaultEnv();

// `dotenv` uses `process.cwd` to locate files, which is missing in browser
// environments (e.g. Expo web). Calling it would throw `process.cwd is not a
// function`, so only invoke when running in Node.js where the function exists.
if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
  loadEnv();
}

// TODO:TODO-101 Audit envSchema defaults so runtime parity across Expo web and native builds does not drift from documented expectations.
// TODO:REC-201 Consider lifting envSchema into a shared config module consumed by services and agents to centralize validation.
const envSchema = z.object({
  EXPO_PUBLIC_TRANSPORT: z.string().optional().default(''),
  EXPO_PUBLIC_CONTRACT_ID: z.string().optional().default(''),
  WAKU_PUBLISHER_KEY: z.string().optional().default(''),
  EXPO_PUBLIC_WAKU_PUBLISHER_KEY: z.string().optional().default(''),
  WAKU_DISABLE: z.string().optional().default(''),
  EXPO_PUBLIC_WAKU_DISABLE: z.string().optional().default(''),
  WAKU_KEY_EPOCH: z.string().optional().default('1'),
  EXPO_PUBLIC_WAKU_KEY_EPOCH: z.string().optional().default('1'),
  WAKU_STRICT: z.string().optional().default(''),
  EXPO_PUBLIC_RELAYER_URL: z.string().optional().default(''),
  EXPO_PUBLIC_INDEXER_URL: z.string().optional().default(''),
  EXPO_PUBLIC_DEBUG_LOGS: z.string().optional().default(''),
  EXPO_PUBLIC_CHAIN: z.string().optional().default(''),
  NEAR_NETWORK: z.string().optional().default(''),
  NEAR_RPC_URL: z.string().optional().default(''),
  NEAR_RPC_FALLBACK_URLS: z.string().optional().default(''),
  ENABLE_UNSAFE_NEAR_PRIVATE_KEY: z.string().optional().default(''),
  EXPO_PUBLIC_PINATA_API_KEY: z.string().optional().default(''),
  EXPO_PUBLIC_PINATA_SECRET_API_KEY: z.string().optional().default(''),
  EXPO_PUBLIC_PINATA_JWT: z.string().optional().default(''),
  EXPO_PUBLIC_MOONPAY_PUBLISHABLE_KEY: z.string().optional().default(''),
  NEAR_LAKE_BUCKET: z.string().optional().default(''),
  NEAR_LAKE_REGION: z.string().optional().default('eu-central-1'),
  NEAR_LAKE_DIR: z.string().optional().default(''),
  NEAR_LAKE_START_BLOCK: z.string().optional().default('0'),
  NEAR_LAKE_ENDPOINT: z.string().optional().default(''),
  NEAR_ACCESS_KEY: z.string().optional().default(''),
  NEAR_SECRET_KEY: z.string().optional().default(''),
  AWS_ACCESS_KEY_ID: z.string().optional().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(''),
  CACHE_DIR: z.string().optional().default(''),
  CACHE_SECRET: z
    .string()
    .min(1, 'CACHE_SECRET must not be empty')
    .optional(),
});

export type Config = z.infer<typeof envSchema>;

let cfg: Config = envSchema.parse(process.env);

export function reloadConfig(): void {
  cfg = envSchema.parse(process.env);
}

export default cfg;
