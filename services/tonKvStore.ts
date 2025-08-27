const store: Map<string, Map<string, string>> = new Map();

export async function setValue(address: string, key: string, value: string) {
  if (!store.has(address)) {
    store.set(address, new Map());
  }
  const m = store.get(address)!;
  if (value === '') {
    m.delete(key);
  } else {
    m.set(key, value);
  }
}

export async function removeValue(address: string, key: string) {
  const m = store.get(address);
  m?.delete(key);
}

export async function getValue(address: string, key: string): Promise<string | null> {
  const m = store.get(address);
  return m?.get(key) ?? null;
}

export async function listValues(address: string): Promise<{ key: string; value: string }[]> {
  const m = store.get(address);
  if (!m) return [];
  return Array.from(m.entries()).map(([key, value]) => ({ key, value }));
}
