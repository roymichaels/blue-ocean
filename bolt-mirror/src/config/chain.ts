// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
export const CHAIN = 'bolt' as const;

export function assertNearChain(): never {
  throw new Error('NotImplemented: assertNearChain (NEAR removed; pending Supabase refactor)');
}

export default CHAIN;
