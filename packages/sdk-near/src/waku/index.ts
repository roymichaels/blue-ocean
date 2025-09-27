// STUB: NEAR SDK Waku bridge removed. Bolt will replace with Supabase integration.
const notImplemented = (name: string): never => {
  throw new Error('NotImplemented: ' + name + ' (NEAR removed; pending Supabase refactor)');
};

export async function getListingsFromWaku(_storeId: string) {
  return notImplemented('sdk-near:waku:getListingsFromWaku');
}
