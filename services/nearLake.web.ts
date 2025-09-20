export interface LakeInitConfig {
  s3BucketName: string;
  s3RegionName: string;
  startBlockHeight: bigint;
  onError?: (err: unknown) => void;
  onBlock?: (msg: unknown) => Promise<void> | void;
}

export function initLake(_config: LakeInitConfig): void {
  // Browser builds do not stream NEAR Lake directly.
}

export function onLakeError(_cb: (err: unknown) => void) {
  return () => {
    /* no-op */
  };
}

export default initLake;

export const lakeMonitor = {
  on: () => {},
  off: () => {},
};
