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
  EXPO_PUBLIC_NOTIFICATIONS_PIPELINE: z.string().optional().default('false'),
  EXPO_PUBLIC_NOTIFICATIONS_PIPELINE_CANARY_USERS: z
    .string()
    .optional()
    .default(''),
  EXPO_PUBLIC_NOTIFICATIONS_PIPELINE_ROLLBACK: z.string().optional().default('false'),
  EXPO_PUBLIC_DELIVERY_NOTIFICATIONS: z.string().optional().default('false'),
  EXPO_PUBLIC_DELIVERY_NOTIFICATIONS_CANARY_STORES: z
    .string()
    .optional()
    .default(''),
  EXPO_PUBLIC_DELIVERY_NOTIFICATIONS_ROLLBACK: z
    .string()
    .optional()
    .default('false'),
  EXPO_PUBLIC_FEATURE_MOONPAY: z.string().optional().default('false'),
  EXPO_PUBLIC_FEATURE_DISPUTES: z.string().optional().default('false'),
  EXPO_PUBLIC_FEATURE_OPS_DRAWER: z.string().optional().default('false'),
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

export interface NotificationsPipelineFeatureFlag {
  enabled: boolean;
  canaryUsers: string[];
  rollback: boolean;
}

const notificationsPipelineFlag: NotificationsPipelineFeatureFlag = {
  enabled: env.EXPO_PUBLIC_NOTIFICATIONS_PIPELINE === 'true',
  canaryUsers: env.EXPO_PUBLIC_NOTIFICATIONS_PIPELINE_CANARY_USERS
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean),
  rollback: env.EXPO_PUBLIC_NOTIFICATIONS_PIPELINE_ROLLBACK === 'true',
};

export interface DeliveryNotificationsFeatureFlag {
  enabled: boolean;
  canaryStores: string[];
  rollback: boolean;
}

const deliveryNotificationsFlag: DeliveryNotificationsFeatureFlag = {
  enabled: env.EXPO_PUBLIC_DELIVERY_NOTIFICATIONS === 'true',
  canaryStores: env.EXPO_PUBLIC_DELIVERY_NOTIFICATIONS_CANARY_STORES
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  rollback: env.EXPO_PUBLIC_DELIVERY_NOTIFICATIONS_ROLLBACK === 'true',
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

export function isNotificationsPipelineEnabled(userId?: string): boolean {
  if (notificationsPipelineFlag.rollback) return false;
  if (notificationsPipelineFlag.enabled) return true;
  if (!userId) return false;
  return notificationsPipelineFlag.canaryUsers.includes(userId.toLowerCase());
}

export function triggerNotificationsPipelineRollback(): void {
  notificationsPipelineFlag.rollback = true;
}
export { notificationsPipelineFlag };

export function isDeliveryNotificationsEnabled(storeId?: string): boolean {
  if (deliveryNotificationsFlag.rollback) return false;
  if (deliveryNotificationsFlag.enabled) return true;
  if (!storeId) return false;
  return deliveryNotificationsFlag.canaryStores.includes(storeId.toLowerCase());
}

export function triggerDeliveryNotificationsRollback(): void {
  deliveryNotificationsFlag.rollback = true;
}
export { deliveryNotificationsFlag };

const moonPayFeatureEnabled = env.EXPO_PUBLIC_FEATURE_MOONPAY === 'true';
const disputesFeatureEnabled = env.EXPO_PUBLIC_FEATURE_DISPUTES === 'true';
const opsDrawerFeatureEnabled = env.EXPO_PUBLIC_FEATURE_OPS_DRAWER === 'true';

export function isMoonPayEnabled(): boolean {
  return moonPayFeatureEnabled;
}

export function isDisputesEnabled(): boolean {
  return disputesFeatureEnabled;
}

export function isOpsDrawerEnabled(): boolean {
  return opsDrawerFeatureEnabled;
}

export default warmCacheFlag;
