import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_WARM_CACHE: z.string().optional().default('false'),
  EXPO_PUBLIC_WARM_CACHE_CANARY_ADMINS: z
    .string()
    .optional()
    .default(''),
  EXPO_PUBLIC_WARM_CACHE_ROLLBACK: z.string().optional().default('false'),
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

export function isWarmCacheEnabled(address?: string): boolean {
  if (warmCacheFlag.rollback) return false;
  if (warmCacheFlag.enabled) return true;
  if (!address) return false;
  return warmCacheFlag.canaryAdmins.includes(address.toLowerCase());
}

export function triggerWarmCacheRollback(): void {
  warmCacheFlag.rollback = true;
}

export default warmCacheFlag;
