import AsyncStorage from '@react-native-async-storage/async-storage';

// Lightweight key-value store for React Native.
// Keeps a small in-memory mirror to avoid repeated storage round-trips.
const memory = new Map<string, Map<string, string>>();

const SEGMENT_PATTERN = /[\\/]|\.\./;

function validateSegment(seg: string) {
  if (!seg || SEGMENT_PATTERN.test(seg)) {
    throw new Error('Invalid key segment');
  }
}

function ensureAddressStore(address: string) {
  let store = memory.get(address);
  if (!store) {
    store = new Map<string, string>();
    memory.set(address, store);
  }
  return store;
}

function storageKey(address: string, key: string) {
  return `kv:${address}:${key}`;
}

export async function setValue(address: string, key: string, value: string) {
  validateSegment(address);
  validateSegment(key);
  const store = ensureAddressStore(address);
  if (value === '') {
    store.delete(key);
    try {
      await AsyncStorage.removeItem(storageKey(address, key));
    } catch {}
    return;
  }
  store.set(key, value);
  try {
    await AsyncStorage.setItem(storageKey(address, key), value);
  } catch {}
}

export async function removeValue(address: string, key: string) {
  validateSegment(address);
  validateSegment(key);
  memory.get(address)?.delete(key);
  try {
    await AsyncStorage.removeItem(storageKey(address, key));
  } catch {}
}

export async function getValue(address: string, key: string): Promise<string | null> {
  validateSegment(address);
  validateSegment(key);
  const store = memory.get(address);
  if (store?.has(key)) {
    return store.get(key) ?? null;
  }
  try {
    const value = await AsyncStorage.getItem(storageKey(address, key));
    if (value != null) {
      ensureAddressStore(address).set(key, value);
    }
    return value;
  } catch {
    return null;
  }
}

export async function listValues(address: string): Promise<{ key: string; value: string }[]> {
  validateSegment(address);
  const prefix = `kv:${address}:`;
  const items: { key: string; value: string }[] = [];
  const seen = new Set<string>();

  const store = memory.get(address);
  if (store) {
    for (const [key, value] of store.entries()) {
      items.push({ key, value });
      seen.add(key);
    }
  }

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const wanted = allKeys.filter((key) => key.startsWith(prefix));
    if (wanted.length > 0) {
      const values = await AsyncStorage.multiGet(wanted);
      for (const [storageId, value] of values) {
        if (!storageId || value == null) continue;
        const logicalKey = storageId.substring(prefix.length);
        if (seen.has(logicalKey)) continue;
        ensureAddressStore(address).set(logicalKey, value);
        items.push({ key: logicalKey, value });
        seen.add(logicalKey);
      }
    }
  } catch {}

  return items;
}
