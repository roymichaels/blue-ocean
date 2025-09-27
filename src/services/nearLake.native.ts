// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.

export interface LakeInitConfig {
  s3BucketName: string;
  s3RegionName: string;
  startBlockHeight: bigint;
  onError?: (err: unknown) => void;
  onBlock?: (msg: unknown) => Promise<void> | void;
}

const warn = (name: string) => {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('NotImplemented: ' + name + ' (NEAR removed; pending Supabase refactor)');
  }
};

export function initLake(_config: LakeInitConfig): void {
  warn('initLake');
}

export function onLakeError(_cb: (err: unknown) => void): () => void {
  warn('onLakeError');
  return () => {};
}

export const lakeMonitor = {
  on: (..._args: any[]) => warn('lakeMonitor.on'),
  off: (..._args: any[]) => warn('lakeMonitor.off'),
};

export { initLake as default };
