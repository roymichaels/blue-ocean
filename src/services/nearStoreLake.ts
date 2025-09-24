import { types } from 'near-lake-framework';
import { initLake } from './nearLake';
import {
  createDefaultStoreServiceDeps,
  createStoreService,
} from '@/features/stores/services/nearStores';

const storeService = createStoreService(createDefaultStoreServiceDeps());

let started = false;

function toStore(msg: any) {
  const id = String(msg.storeId || msg.store_id || '');
  const owner = String(msg.owner || '');
  const name = String(msg.name || '');
  if (!id || !owner) return null;
  return { id, owner, name, nftId: id, reputation: 0 } as any;
}

export function startNearStoreLake() {
  if (started) return;
  try {
    const bucket = process.env.NEAR_LAKE_BUCKET || (process.env as any).EXPO_PUBLIC_NEAR_LAKE_BUCKET || '';
    if (!bucket) return;
    initLake({
      s3BucketName: bucket,
      s3RegionName: process.env.NEAR_LAKE_REGION || 'eu-central-1',
      startBlockHeight: BigInt((process.env as any).NEAR_LAKE_START_BLOCK || '0'),
      onBlock: async (blk: types.StreamerMessage) => {
        for (const shard of blk.shards) {
          for (const reo of shard.receiptExecutionOutcomes) {
            const logs = reo.executionOutcome.outcome.logs || [];
            for (const l of logs) {
              try {
                const evt = JSON.parse(l);
                if (evt?.event === 'store_created') {
                  const s = toStore(evt);
                  if (s) {
                    await storeService.setStore(s.id, s);
                    await storeService.setStore('default', s);
                  }
                }
              } catch {
                // ignore non-JSON logs
              }
            }
          }
        }
      },
    });
    started = true;
  } catch {
    /* ignore */
  }
}

export default { startNearStoreLake };

