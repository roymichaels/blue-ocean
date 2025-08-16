import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCT_CACHE_KEY = 'product_index_cache';

export interface ProductCache {
  version: number;
  index: string[];
}

export async function getProductCache(): Promise<ProductCache | null> {
  try {
    const raw = await AsyncStorage.getItem(PRODUCT_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ProductCache) : null;
  } catch {
    return null;
  }
}

export async function setProductCache(cache: ProductCache): Promise<void> {
  try {
    await AsyncStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

export async function clearProductCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PRODUCT_CACHE_KEY);
  } catch {
    /* ignore */
  }
}
