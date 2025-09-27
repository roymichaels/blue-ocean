const notImplemented = (name: string): never => {
  throw new Error(`NotImplemented: ${name} (NEAR removed; pending Supabase refactor)`);
};

export async function hydrateMessages(_storeId: string): Promise<never> {
  return notImplemented('sdk-near:waku:hydrateMessages');
}

export async function getListingsFromWaku(_storeId: string): Promise<never> {
  return notImplemented('sdk-near:waku:getListingsFromWaku');
}
