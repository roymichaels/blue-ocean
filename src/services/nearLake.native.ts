export interface LakeInitConfig {
  s3BucketName: string;
  s3RegionName: string;
  startBlockHeight: bigint;
  onError?: (err: unknown) => void;
  onBlock?: (msg: unknown) => Promise<void> | void;
}

// No-op NEAR Lake adapter for React Native/Web. We don't have lake streaming support
// on client builds; agents handle history via Waku topics instead.
export function initLake(_config: LakeInitConfig): void {
  // Intentionally empty.
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
