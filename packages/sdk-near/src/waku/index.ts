// Minimal Waku-backed read helpers (optional). These stubs allow the SDK to
// build even when Waku is not enabled. Implementations can be filled in later.

export async function getListingsFromWaku(storeId: string) {
  try {
    // TODO: Implement Waku hydration on demand.
    // For now, return an empty list to keep the app functional when transport=waku.
    console.warn('[sdk-near] Waku getListings stub used for storeId=', storeId);
    return [] as any[];
  } catch (e) {
    console.warn('[sdk-near] Waku getListings failed:', e);
    return [] as any[];
  }
}

export default { getListingsFromWaku };

