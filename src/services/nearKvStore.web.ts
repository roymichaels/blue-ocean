// Web implementation backed by localStorage with an in-memory mirror.
const memory = new Map<string, Map<string, string>>();
const SEGMENT_PATTERN = /[\\/]|\.\./;

function validateSegment(seg: string) {
  if (!seg || SEGMENT_PATTERN.test(seg)) {
    throw new Error('Invalid key segment');
  }
}

function ensureAddress(address: string) {
  let store = memory.get(address);
  if (!store) {
    store = new Map<string, string>();
    memory.set(address, store);
  }
  return store;
}

const hasStorage = typeof window !== 'undefined' && !!window.localStorage;

function storageKey(address: string, key: string) {
  return `kv:${address}:${key}`;
}

export async function setValue(address: string, key: string, value: string) {
  validateSegment(address);
  validateSegment(key);
  const store = ensureAddress(address);
  if (value === '') {
    store.delete(key);
    if (hasStorage) {
      try { window.localStorage.removeItem(storageKey(address, key)); } catch {}
    }
    return;
  }
  store.set(key, value);
  if (hasStorage) {
    try { window.localStorage.setItem(storageKey(address, key), value); } catch {}
  }
}

export async function removeValue(address: string, key: string) {
  validateSegment(address);
  validateSegment(key);
  memory.get(address)?.delete(key);
  if (hasStorage) {
    try { window.localStorage.removeItem(storageKey(address, key)); } catch {}
  }
}

export async function getValue(address: string, key: string): Promise<string | null> {
  validateSegment(address);
  validateSegment(key);
  const store = memory.get(address);
  if (store?.has(key)) return store.get(key) ?? null;
  if (!hasStorage) return null;
  try {
    const value = window.localStorage.getItem(storageKey(address, key));
    if (value != null) {
      ensureAddress(address).set(key, value);
    }
    return value;
  } catch {
    return null;
  }
}

export async function listValues(address: string): Promise<{ key: string; value: string }[]> {
  validateSegment(address);
  const items: { key: string; value: string }[] = [];
  const seen = new Set<string>();
  const store = memory.get(address);
  if (store) {
    for (const [key, value] of store.entries()) {
      items.push({ key, value });
      seen.add(key);
    }
  }
  if (!hasStorage) return items;
  const prefix = `kv:${address}:`;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const storageKey = window.localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(prefix)) continue;
      const logical = storageKey.substring(prefix.length);
      if (seen.has(logical)) continue;
      const value = window.localStorage.getItem(storageKey);
      if (value == null) continue;
      ensureAddress(address).set(logical, value);
      items.push({ key: logical, value });
      seen.add(logical);
    }
  } catch {}
  return items;
}
