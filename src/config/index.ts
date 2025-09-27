import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { loadVaultEnv } from './vault';

loadVaultEnv();

if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
  loadEnv();
}

const envSchema = z.object({
  EXPO_PUBLIC_TRANSPORT: z.string().optional().default(''),
  EXPO_PUBLIC_RELAYER_URL: z.string().optional().default(''),
  EXPO_PUBLIC_INDEXER_URL: z.string().optional().default(''),
  EXPO_PUBLIC_DEBUG_LOGS: z.string().optional().default(''),
  EXPO_PUBLIC_FEATURE_WALLET: z.string().optional().default(''),
  EXPO_PUBLIC_DEFAULT_STORE: z.string().optional().default(''),
  EXPO_PUBLIC_SHOP_TENANT_ID: z.string().optional().default(''),
  EXPO_PUBLIC_USE_ROUTER: z.string().optional().default(''),
  EXPO_PUBLIC_DOCS_URL: z.string().optional().default(''),
  EXPO_PUBLIC_FEATURE_UI_V2: z.string().optional().default(''),
  EXPO_PUBLIC_FEATURE_DATA_V2: z.string().optional().default(''),
  EXPO_PUBLIC_FEATURE_ADMIN_BOOTSTRAP_V2: z.string().optional().default(''),
  EXPO_PUBLIC_FEATURE_ADMIN_BOOTSTRAP_V2_CANARY: z.string().optional().default(''),
  EXPO_PUBLIC_FEATURE_ADMIN_BOOTSTRAP_V2_ROLLBACK: z.string().optional().default(''),
  WAKU_PUBLISHER_KEY: z.string().optional().default(''),
  EXPO_PUBLIC_WAKU_PUBLISHER_KEY: z.string().optional().default(''),
  WAKU_DISABLE: z.string().optional().default(''),
  EXPO_PUBLIC_WAKU_DISABLE: z.string().optional().default(''),
  WAKU_KEY_EPOCH: z.string().optional().default('1'),
  EXPO_PUBLIC_WAKU_KEY_EPOCH: z.string().optional().default('1'),
  WAKU_STRICT: z.string().optional().default(''),
  EXPO_PUBLIC_WAKU_BOOTSTRAP: z.string().optional().default(''),
  EXPO_PUBLIC_PINATA_API_KEY: z.string().optional().default(''),
  EXPO_PUBLIC_PINATA_SECRET_API_KEY: z.string().optional().default(''),
  EXPO_PUBLIC_PINATA_JWT: z.string().optional().default(''),
  NEAR_LAKE_BUCKET: z.string().optional().default(''),
  NEAR_LAKE_REGION: z.string().optional().default(''),
  NEAR_LAKE_START_BLOCK: z.string().optional().default('0'),
  EXPO_PUBLIC_MOONPAY_PUBLISHABLE_KEY: z.string().optional().default(''),
  CACHE_DIR: z.string().optional().default(''),
  CACHE_SECRET: z.string().optional().default(''),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_DB_URL: z.string().optional().default(''),
  WEB3_CHAINS: z.string().optional().default(''),
  WAKU_BOOTNODES: z.string().optional().default(''),
});

export type Config = z.infer<typeof envSchema>;

let cfg: Config = envSchema.parse(process.env);

export function reloadConfig(): void {
  cfg = envSchema.parse(process.env);
}

export default cfg;
