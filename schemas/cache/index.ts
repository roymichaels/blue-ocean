export const E_STALE_DATA = 'E_STALE_DATA' as const;
export const E_SYNC_LAG = 'E_SYNC_LAG' as const;

export type CacheErrorCode = typeof E_STALE_DATA | typeof E_SYNC_LAG;

export interface CacheError extends Error {
  code: CacheErrorCode;
  [key: string]: unknown;
}

export interface CacheDiffMessage<T> {
  id: string;
  rev: number;
  op: 'set' | 'delete';
  value?: T;
  ts?: number;
}
