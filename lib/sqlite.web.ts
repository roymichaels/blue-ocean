export async function executeSql(_sql: string, _params: any[] = []) {
  console.warn('executeSql stub called');
  return { rows: { _array: [] } } as any;
}

export async function ensureDatabase(): Promise<void> {}
export async function getDatabase(): Promise<void> {}
export async function closeDatabase(): Promise<void> {}
