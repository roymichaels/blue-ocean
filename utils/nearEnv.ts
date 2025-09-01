// Centralized NEAR env with safe fallbacks
const isProd = process.env.NODE_ENV === 'production';
const strict =
  (process.env.NEAR_STRICT ?? (isProd ? '1' : '0')) === '1';

const DEFAULT_CONTRACT =
  process.env.EXPO_PUBLIC_CONTRACT_ID ||
  process.env.NEAR_DEFAULT_CONTRACT || // optional alias
  '';

const pick = (name: string) =>
  process.env[`NEAR_${name}_CONTRACT`] || DEFAULT_CONTRACT;

export const NEAR_CONTRACTS = {
  SETTINGS: pick('SETTINGS'),
  ORDERS: pick('ORDERS'),
  PRODUCT_INDEX: pick('PRODUCT_INDEX'),
  NOTIFICATIONS: pick('NOTIFICATIONS'),
  STORES: pick('STORES'),
  REPORTS: pick('REPORTS'),
  REVIEWS: pick('REVIEWS'),
  CATEGORIES: pick('CATEGORIES'),
  CART: pick('CART'),
  PRODUCTS: pick('PRODUCTS'),
  USERS: pick('USERS'),
  PAYMENT_FACTORY: pick('PAYMENT_FACTORY'),
};

export function getNearContract(
  key: keyof typeof NEAR_CONTRACTS,
): string {
  const v = NEAR_CONTRACTS[key];
  if (!v && strict) {
    throw new Error(
      `[NEAR] Missing contract for ${key}. Set NEAR_${key}_CONTRACT or EXPO_PUBLIC_CONTRACT_ID.`,
    );
  }
  if (!v && !strict) {
    // dev-friendly warning, no crash
    // eslint-disable-next-line no-console
    console.warn(
      `[NEAR] ${key} missing; using EXPO_PUBLIC_CONTRACT_ID fallback`,
    );
  }
  return v;
}

