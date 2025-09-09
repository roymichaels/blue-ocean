import { startStream, types } from 'near-lake-framework';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import type { Waku } from '@waku/sdk';
import { getClient } from '../../../src/utils/transport';
import { loadCheckpoint, saveCheckpoint } from './checkpoint';

dotenv.config();

const CONTRACT_ID = process.env.CONTRACT_ID as string;
const LAKE_BUCKET = process.env.LAKE_BUCKET as string;
const START_BLOCK = parseInt(process.env.START_BLOCK || '0', 10);
const DEDUPE_PATH = process.env.DEDUPE_PATH || '.state/dedupe.json';
const WAKU_BOOTSTRAP = (process.env.WAKU_BOOTSTRAP || '').split(',').filter(Boolean);
const NETWORK = process.env.NETWORK || 'testnet';

type DedupStore = { [key: string]: number };
let dedupeMem: DedupStore = {};

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readJson<T>(file: string, def: T): Promise<T> {
  try {
    const buf = await fs.readFile(file, 'utf8');
    return JSON.parse(buf) as T;
  } catch {
    return def;
  }
}

async function writeJson(file: string, data: any) {
  await ensureDir(file);
  await fs.writeFile(file, JSON.stringify(data), 'utf8');
}

async function loadDedupe() {
  dedupeMem = await readJson<DedupStore>(DEDUPE_PATH, {});
}

function dedupeKey(tx: string, logIndex: number) {
  return `${tx}:${logIndex}`;
}

async function publish(waku: Waku, topic: string, payload: any) {
  const msg = new TextEncoder().encode(JSON.stringify(payload));
  await waku.relay.send({ contentTopic: topic, payload: msg });
}

function topicFor(storeId: string, type: 'listings' | 'orders') {
  return `/blueocean/${NETWORK}/${storeId}/${type}`;
}

async function handleMessage(waku: Waku, streamerMessage: types.StreamerMessage) {
  const blockHeight = streamerMessage.block.header.height;
  for (const shard of streamerMessage.shards) {
    for (const reo of shard.receiptExecutionOutcomes) {
      if (reo.receipt?.receiverId !== CONTRACT_ID) continue;
      const tx = reo.executionOutcome.id;
      const logs = reo.executionOutcome.outcome.logs || [];
      for (let i = 0; i < logs.length; i++) {
        const logLine = logs[i];
        const key = dedupeKey(tx, i);
        if (dedupeMem[key]) continue;
        try {
          const evt = JSON.parse(logLine);
          if (!evt?.event) continue;
          const base = {
            v: 1,
            storeId: evt.storeId,
            itemId: evt.itemId,
            seller: evt.seller,
            buyer: evt.buyer,
            priceYocto: evt.price ?? undefined,
            amount: evt.amount ?? undefined,
            tx,
            ts: Date.now(),
            event: evt.event,
          };
          if (!base.storeId) continue;
          if (evt.event === 'listing_added') {
            await publish(waku, topicFor(base.storeId, 'listings'), base);
          } else if (evt.event === 'order_paid') {
            await publish(waku, topicFor(base.storeId, 'orders'), base);
          }
          dedupeMem[key] = Date.now();
        } catch {
          // ignore unparsable line
        }
      }
    }
  }
  await saveCheckpoint(blockHeight + 1);
  await writeJson(DEDUPE_PATH, dedupeMem);
}

async function main() {
  await loadDedupe();
  const height = await loadCheckpoint();
  const startHeight = Math.max(START_BLOCK, height);
  const { Waku } = await getClient();
  const waku = await Waku.create({ bootstrap: { peers: WAKU_BOOTSTRAP } });
  await waku.waitForConnectedPeer();

  const lakeConfig: types.LakeConfig = {
    s3BucketName: LAKE_BUCKET,
    s3RegionName: 'eu-central-1',
    startBlockHeight: startHeight,
  };
  try {
    await startStream(lakeConfig, (msg) => handleMessage(waku, msg));
  } catch (err) {
    console.error('NEAR Lake stream failed', err);
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
});

