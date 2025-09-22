import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorLog } from '@/utils/logger';
import type { CartItem } from '@/types';

export const CHECKOUT_INTENT_STORAGE_KEY = 'checkout.intent';

export type CheckoutIntentStep = 'cart' | 'shipping' | 'payment' | 'confirmation';

export interface CheckoutReturnPath {
  pathname: string;
  params?: Record<string, string>;
}

export interface CheckoutIntentItem {
  id: string;
  productId: string;
  storeId?: string;
  quantity: number;
  unitPrice: number;
  name: string;
  image?: string | null;
}

export interface CheckoutIntent {
  createdAt: number;
  step: CheckoutIntentStep;
  total: number;
  returnPath: CheckoutReturnPath;
  items: CheckoutIntentItem[];
}

export interface PersistCheckoutIntentOptions {
  step?: CheckoutIntentStep;
  returnPath?: CheckoutReturnPath;
}

function serializeItems(cartItems: CartItem[]): CheckoutIntentItem[] {
  return cartItems.map((item) => ({
    id: item.id,
    productId: item.productId,
    storeId: item.product.storeId,
    quantity: item.quantity,
    unitPrice: item.unitPrice ?? item.product.price,
    name: item.product.name,
    image: item.product.images?.[0] ?? null,
  }));
}

export async function persistCheckoutIntent(
  cartItems: CartItem[],
  total: number,
  options: PersistCheckoutIntentOptions = {},
): Promise<void> {
  const intent: CheckoutIntent = {
    createdAt: Date.now(),
    step: options.step ?? 'cart',
    total,
    returnPath: options.returnPath ?? { pathname: '/', params: { showCart: 'true' } },
    items: serializeItems(cartItems),
  };

  try {
    await AsyncStorage.setItem(
      CHECKOUT_INTENT_STORAGE_KEY,
      JSON.stringify(intent),
    );
  } catch (error) {
    errorLog('Failed to persist checkout intent', error);
  }
}

export async function loadCheckoutIntent(): Promise<CheckoutIntent | null> {
  try {
    const raw = await AsyncStorage.getItem(CHECKOUT_INTENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutIntent;
  } catch (error) {
    errorLog('Failed to load checkout intent', error);
    return null;
  }
}

export async function clearCheckoutIntent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHECKOUT_INTENT_STORAGE_KEY);
  } catch (error) {
    errorLog('Failed to clear checkout intent', error);
  }
}
