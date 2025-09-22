const memoryStore = new Map<string, string>();

function getBrowserStorage(): Storage | null {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    try {
      const store = globalThis.localStorage;
      // Access length to ensure availability (may throw in private mode)
      void store.length;
      return store;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getItem(key: string): Promise<string | null> {
  const store = getBrowserStorage();
  if (store) {
    try {
      const value = store.getItem(key);
      if (typeof value === 'string') {
        memoryStore.set(key, value);
      } else if (value === null) {
        memoryStore.delete(key);
      }
      return value;
    } catch {
      // fall through to memory store
    }
  }
  return memoryStore.has(key) ? memoryStore.get(key)! : null;
}

export async function setItem(key: string, value: string): Promise<void> {
  const store = getBrowserStorage();
  if (store) {
    try {
      store.setItem(key, value);
    } catch {
      // ignore and fall back to memory
    }
  }
  memoryStore.set(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  const store = getBrowserStorage();
  if (store) {
    try {
      store.removeItem(key);
    } catch {
      // ignore and fall back to memory
    }
  }
  memoryStore.delete(key);
}

export async function clearAll(): Promise<void> {
  const store = getBrowserStorage();
  if (store) {
    try {
      store.clear();
    } catch {
      // ignore and fall back to memory
    }
  }
  memoryStore.clear();
}
