import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_WARM_CACHE: z.string().optional().default('false'),
  EXPO_PUBLIC_WARM_CACHE_CANARY_ADMINS: z
    .string()
    .optional()
    .default(''),
  EXPO_PUBLIC_WARM_CACHE_ROLLBACK: z.string().optional().default('false'),
  EXPO_PUBLIC_SCOPED_TOKENS: z.string().optional().default('false'),
  EXPO_PUBLIC_SCOPED_TOKENS_WALLET_VENDORS: z
    .string()
    .optional()
    .default(''),
  EXPO_PUBLIC_SCOPED_TOKENS_ROLLBACK: z.string().optional().default('false'),
});

const env = envSchema.parse(process.env);

export interface WarmCacheFeatureFlag {
  enabled: boolean;
  canaryAdmins: string[];
  rollback: boolean;
}

const warmCacheFlag: WarmCacheFeatureFlag = {
  enabled: env.EXPO_PUBLIC_WARM_CACHE === 'true',
  canaryAdmins: env.EXPO_PUBLIC_WARM_CACHE_CANARY_ADMINS
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean),
  rollback: env.EXPO_PUBLIC_WARM_CACHE_ROLLBACK === 'true',
};

export interface ScopedTokensFeatureFlag {
  enabled: boolean;
  walletVendors: string[];
  rollback: boolean;
}

const scopedTokensFlag: ScopedTokensFeatureFlag = {
  enabled: env.EXPO_PUBLIC_SCOPED_TOKENS === 'true',
  walletVendors: env.EXPO_PUBLIC_SCOPED_TOKENS_WALLET_VENDORS
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  rollback: env.EXPO_PUBLIC_SCOPED_TOKENS_ROLLBACK === 'true',
};

export function isWarmCacheEnabled(address?: string): boolean {
  if (warmCacheFlag.rollback) return false;
  if (warmCacheFlag.enabled) return true;
  if (!address) return false;
  return warmCacheFlag.canaryAdmins.includes(address.toLowerCase());
}

export function triggerWarmCacheRollback(): void {
  warmCacheFlag.rollback = true;
}

export function isScopedTokensEnabled(vendor?: string): boolean {
  if (scopedTokensFlag.rollback) return false;
  if (scopedTokensFlag.enabled) return true;
  if (!vendor) return false;
  return scopedTokensFlag.walletVendors.includes(vendor);
}

export function triggerScopedTokensRollback(): void {
  scopedTokensFlag.rollback = true;
}
export { scopedTokensFlag };

export default warmCacheFlag;
