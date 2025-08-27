import { startStream, types } from 'near-lake-framework';
import dotenv from 'dotenv';
import { init, upsertEvent, db } from './store';

dotenv.config();

const CONTRACT_ID = process.env.CONTRACT_ID as string;
const LAKE_BUCKET = process.env.LAKE_BUCKET as string;
const START_BLOCK = parseInt(process.env.START_BLOCK || '0', 10);

async function handleMessage(streamerMessage: types.StreamerMessage) {
  const blockHeight = streamerMessage.block.header.height;
  for (const shard of streamerMessage.shards) {
    for (const outcome of shard.receiptExecutionOutcomes) {
      if (outcome.receipt?.receiverId !== CONTRACT_ID) continue;
      const receiptId = outcome.executionOutcome.id;
      for (const log of outcome.executionOutcome.outcome.logs) {
        let parsed;
        try {
          parsed = JSON.parse(log);
        } catch {
          continue;
        }
        upsertEvent(parsed.event, receiptId, blockHeight, parsed);
      }
    }
  }
}

async function main() {
  init();
  const lakeConfig: types.LakeConfig = {
    s3BucketName: LAKE_BUCKET,
    s3RegionName: 'eu-central-1',
    startBlockHeight: START_BLOCK,
  };
  await startStream(lakeConfig, handleMessage);
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(() => {
    db.close();
  });

