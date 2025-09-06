import { promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

import { assertNearChain } from './chain';
import { initLake } from './nearLake';

assertNearChain();

let lakeStarted = false;
let s3: S3Client | null = null;
const bucket = process.env.NEAR_LAKE_BUCKET;
const region = process.env.NEAR_LAKE_REGION || 'eu-central-1';
const localDir = process.env.NEAR_LAKE_DIR;

function ensureLake() {
  if (lakeStarted) return;
  try {
    const bucketName = bucket;
    if (bucketName) {
      initLake({
        s3BucketName: bucketName,
        s3RegionName: region,
        startBlockHeight: BigInt(process.env.NEAR_LAKE_START_BLOCK || '0'),
      });
      s3 = new S3Client({
        region,
        endpoint: process.env.NEAR_LAKE_ENDPOINT,
        forcePathStyle: !!process.env.NEAR_LAKE_ENDPOINT,
      });
    }
  } catch {
    // ignore
  }
  lakeStarted = true;
}

function objectKey(address: string, key: string): string {
  return `${address}/${key}`;
}

function localFile(address: string, key: string): string {
  if (!localDir) throw new Error('missing_lake_dir');
  return path.join(localDir, address, key);
}

async function streamToString(stream: Readable | Uint8Array | string | undefined): Promise<string> {
  if (!stream) return '';
  if (typeof stream === 'string') return stream;
  if (stream instanceof Uint8Array) return Buffer.from(stream).toString('utf-8');
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export async function setValue(address: string, key: string, value: string) {
  ensureLake();
  if (s3 && bucket) {
    const Key = objectKey(address, key);
    if (value === '') {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key })).catch(() => {});
    } else {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body: value }));
    }
    return;
  }
  const file = localFile(address, key);
  if (value === '') {
    await fs.rm(file, { force: true }).catch(() => {});
  } else {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, value, 'utf-8');
  }
}

export async function removeValue(address: string, key: string) {
  ensureLake();
  if (s3 && bucket) {
    await s3
      .send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey(address, key) }))
      .catch(() => {});
    return;
  }
  const file = localFile(address, key);
  await fs.rm(file, { force: true }).catch(() => {});
}

export async function getValue(address: string, key: string): Promise<string | null> {
  ensureLake();
  if (s3 && bucket) {
    try {
      const res = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: objectKey(address, key) }),
      );
      return await streamToString(res.Body as Readable);
    } catch {
      return null;
    }
  }
  const file = localFile(address, key);
  try {
    return await fs.readFile(file, 'utf-8');
  } catch {
    return null;
  }
}

export async function listValues(
  address: string,
): Promise<{ key: string; value: string }[]> {
  ensureLake();
  if (s3 && bucket) {
    const prefix = `${address}/`;
    const res = await s3
      .send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }))
      .catch(() => ({ Contents: [] } as any));
    const contents = res.Contents ?? [];
    const out: { key: string; value: string }[] = [];
    for (const obj of contents) {
      const fullKey = obj.Key!;
      const key = fullKey.substring(prefix.length);
      const val = await getValue(address, key);
      if (val !== null) out.push({ key, value: val });
    }
    return out;
  }
  const dir = path.join(localDir || '', address);
  try {
    const files = await fs.readdir(dir);
    const entries = await Promise.all(
      files.map(async (f) => ({
        key: f,
        value: await fs.readFile(path.join(dir, f), 'utf-8'),
      })),
    );
    return entries;
  } catch {
    return [];
  }
}

