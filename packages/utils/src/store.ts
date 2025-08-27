export function requireStoreId(storeId?: string | null): string {
  if (!storeId) {
    throw new Error('storeId is required');
  }
  return storeId;
}

export default requireStoreId;
