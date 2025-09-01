const store = new Map<string, string>();

export async function setValue(_addr: string, key: string, value: string) {
  if (value === '') store.delete(key);
  else store.set(key, value);
}

export async function getValue(_addr: string, key: string): Promise<string | null> {
  return store.has(key) ? store.get(key)! : null;
}

export async function listValues(_addr: string): Promise<{ key: string; value: string }[]> {
  return Array.from(store.entries()).map(([key, value]) => ({ key, value }));
}

export async function removeValue(_addr: string, key: string) {
  store.delete(key);
}

export function __clear() {
  store.clear();
}

