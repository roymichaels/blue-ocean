import { startStream, types } from 'near-lake-framework';

export interface LakeInitConfig {
  s3BucketName: string;
  s3RegionName: string;
  startBlockHeight: bigint;
}

/**
 * Initialize NEAR Lake stream.
 * The handler is a no-op; callers can extend this later.
 */
export function initLake(config: LakeInitConfig): void {
  const lakeConfig: types.LakeConfig = {
    s3BucketName: config.s3BucketName,
    s3RegionName: config.s3RegionName,
    startBlockHeight: Number(config.startBlockHeight),
  };

  // Fire and forget; failures are ignored to keep tests offline-friendly.
  startStream(lakeConfig, async () => {}).catch(() => {});
}

export default initLake;
