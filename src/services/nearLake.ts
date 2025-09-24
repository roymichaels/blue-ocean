import { EventEmitter } from 'events';
import { startStream, types } from 'near-lake-framework';

export interface LakeInitConfig {
  s3BucketName: string;
  s3RegionName: string;
  startBlockHeight: bigint;
  onError?: (err: unknown) => void;
  onBlock?: (msg: types.StreamerMessage) => Promise<void> | void;
}

const lakeMonitor = new EventEmitter();

/**
 * Initialize NEAR Lake stream.
 * Accepts an optional block handler for processing each block.
 */
export function initLake(config: LakeInitConfig): void {
  const lakeConfig: types.LakeConfig = {
    s3BucketName: config.s3BucketName,
    s3RegionName: config.s3RegionName,
    startBlockHeight: Number(config.startBlockHeight),
  };

  (async () => {
    try {
      await startStream(lakeConfig, async (msg) => {
        await config.onBlock?.(msg);
      });
    } catch (err) {
      console.error('NEAR Lake stream failed', err);
      lakeMonitor.emit('error', err);
      config.onError?.(err);
    }
  })();
}

export function onLakeError(cb: (err: unknown) => void) {
  lakeMonitor.on('error', cb);
  return () => lakeMonitor.off('error', cb);
}

export default initLake;

export { lakeMonitor };
