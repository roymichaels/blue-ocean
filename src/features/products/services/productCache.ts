import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { aesEncrypt, aesDecrypt } from '@/utils/encryption';

const PRODUCT_CACHE_KEY = 'product_index_cache';
const PRODUCT_CACHE_SECRET = 'product_index_cache_secret';
const MAX_CACHE_BYTES = 5 * 1024 * 1024; // 5MB quota

export interface ProductCache {
  version: number;
  index: string[];
}

async function getKey(): Promise<CryptoKey> {
  let secret = await SecureStore.getItemAsync(PRODUCT_CACHE_SECRET);
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    secret = Buffer.from(bytes).toString('base64');
    await SecureStore.setItemAsync(PRODUCT_CACHE_SECRET, secret);
  }
  const raw = Uint8Array.from(Buffer.from(secret, 'base64'));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function getProductCache(): Promise<ProductCache | null> {
  try {
    const raw = await AsyncStorage.getItem(PRODUCT_CACHE_KEY);
    if (!raw) return null;
    const key = await getKey();
    const json = await aesDecrypt(raw, key);
    return JSON.parse(json) as ProductCache;
  } catch {
    return null;
  }
}

export async function setProductCache(cache: ProductCache): Promise<void> {
  try {
    const data = JSON.stringify(cache);
    const size = new TextEncoder().encode(data).length;
    if (size > MAX_CACHE_BYTES) return;
    const key = await getKey();
    const enc = await aesEncrypt(data, key);
    await AsyncStorage.setItem(PRODUCT_CACHE_KEY, enc);
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
