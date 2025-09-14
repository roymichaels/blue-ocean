import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_FEATURE_ROLLOUT: z.string().optional().default('false'),
  EXPO_PUBLIC_FEATURE_ROLLOUT_CANARY_ADMINS: z
    .string()
    .optional()
    .default(''),
  EXPO_PUBLIC_FEATURE_ROLLOUT_ROLLBACK: z.string().optional().default('false'),
});

const env = envSchema.parse(process.env);

export interface RolloutFeatureFlag {
  enabled: boolean;
  canaryAdmins: string[];
  rollback: boolean;
}

const rolloutFlag: RolloutFeatureFlag = {
  enabled: env.EXPO_PUBLIC_FEATURE_ROLLOUT === 'true',
  canaryAdmins: env.EXPO_PUBLIC_FEATURE_ROLLOUT_CANARY_ADMINS
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean),
  rollback: env.EXPO_PUBLIC_FEATURE_ROLLOUT_ROLLBACK === 'true',
};

export function isRolloutEnabled(address?: string): boolean {
  if (rolloutFlag.rollback) return false;
  if (rolloutFlag.enabled) return true;
  if (!address) return false;
  return rolloutFlag.canaryAdmins.includes(address.toLowerCase());
}

export function triggerRolloutRollback(): void {
  rolloutFlag.rollback = true;
}

export default rolloutFlag;
