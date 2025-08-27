import { startStream, types } from 'near-lake-framework';
import dotenv from 'dotenv';
import { init, upsertListing, upsertOrder, pool } from './store';

dotenv.config();

const CONTRACT_ID = process.env.CONTRACT_ID as string;
const START_BLOCK_HEIGHT = parseInt(process.env.START_BLOCK_HEIGHT || '0');

async function handleMessage(streamerMessage: types.StreamerMessage) {
  const blockHeight = streamerMessage.block.header.height;
  for (const shard of streamerMessage.shards) {
    for (const outcome of shard.receiptExecutionOutcomes) {
      const receiverId = outcome.receipt?.receiverId;
      if (receiverId !== CONTRACT_ID) continue;
      for (const log of outcome.executionOutcome.outcome.logs) {
        let parsed;
        try {
          parsed = JSON.parse(log);
        } catch {
          continue;
        }
        const receiptId = outcome.executionOutcome.id;
        if (parsed.event === 'listing_added') {
          await upsertListing(receiptId, blockHeight, parsed);
        } else if (parsed.event === 'order_paid') {
          await upsertOrder(receiptId, blockHeight, parsed);
        }
      }
    }
  }
}

async function main() {
  await init();
  const lakeConfig: types.LakeConfig = {
    s3BucketName: 'near-lake-data-testnet',
    s3RegionName: 'eu-central-1',
    startBlockHeight: START_BLOCK_HEIGHT
  };
  await startStream(lakeConfig, handleMessage);
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(async () => {
    await pool.end();
  });
