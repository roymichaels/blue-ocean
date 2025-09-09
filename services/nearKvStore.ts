import { promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';

import { assertNearChain } from './chain';
import { initLake } from './nearLake';

assertNearChain();

let lakeStarted = false;
let S3Client: typeof import('minio').Client | null = null;
let s3: import('minio').Client | null = null;
const bucket = process.env.NEAR_LAKE_BUCKET;
const region = process.env.NEAR_LAKE_REGION || 'eu-central-1';

// React Native and some web runtimes provide a `process` shim where `cwd`
// is either missing or not a function. Accessing it directly causes the
// "process.cwd is not a function" runtime error. Detect this scenario and
// fall back to an in-memory store instead of the filesystem.
const useMemoryStore =
  typeof process === 'undefined' || typeof (process as any).cwd !== 'function';

// Only resolve a local directory when running in a Node environment.
const localDir =
  process.env.NEAR_LAKE_DIR || (!useMemoryStore ? path.join(process.cwd(), '.near-lake') : '');

// Simple in-memory map for environments without filesystem access.
const memStore = new Map<string, Map<string, string>>();

function validateSegment(seg: string) {
  if (seg.includes('..') || seg.includes('/') || seg.includes('\\') || path.isAbsolute(seg)) {
    throw new Error('Invalid path segment');
  }
}

async function ensureLake() {
  if (lakeStarted || useMemoryStore) return;
  try {
    const bucketName = bucket;
    if (bucketName) {
      initLake({
        s3BucketName: bucketName,
        s3RegionName: region,
        startBlockHeight: BigInt(process.env.NEAR_LAKE_START_BLOCK || '0'),
      });
      const endpoint = process.env.NEAR_LAKE_ENDPOINT;
      const opts: any = {
        region,
        s3ForcePathStyle: true,
      };
      if (endpoint) {
        const url = new URL(endpoint);
        opts.endPoint = url.hostname;
        if (url.port) opts.port = parseInt(url.port, 10);
        opts.useSSL = url.protocol === 'https:';
      } else {
        opts.endPoint = `s3.${region}.amazonaws.com`;
        opts.useSSL = true;
      }
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        opts.accessKey = process.env.AWS_ACCESS_KEY_ID;
        opts.secretKey = process.env.AWS_SECRET_ACCESS_KEY;
      }
      if (!useMemoryStore && !S3Client) {
        const { Client } = require('minio');
        S3Client = Client;
      }
      if (S3Client) {
        s3 = new S3Client(opts);

      }
    }
  } catch {
    // ignore
  }
  lakeStarted = true;
}

function objectKey(address: string, key: string): string {
  validateSegment(address);
  validateSegment(key);
  return `${address}/${key}`;
}

function localFile(address: string, key: string): string {
  validateSegment(address);
  validateSegment(key);
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
  validateSegment(address);
  validateSegment(key);
  await ensureLake();
  if (useMemoryStore) {
    let addrStore = memStore.get(address);
    if (!addrStore) {
      addrStore = new Map();
      memStore.set(address, addrStore);
    }
    if (value === '') {
      addrStore.delete(key);
    } else {
      addrStore.set(key, value);
    }
    return;
  }
  if (s3 && bucket) {
    const Key = objectKey(address, key);
    if (value === '') {
      await s3.removeObject(bucket, Key).catch(() => {});
    } else {
      await s3.putObject(bucket, Key, value);
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
  validateSegment(address);
  validateSegment(key);
  await ensureLake();
  if (useMemoryStore) {
    memStore.get(address)?.delete(key);
    return;
  }
  if (s3 && bucket) {
    await s3.removeObject(bucket, objectKey(address, key)).catch(() => {});
    return;
  }
  const file = localFile(address, key);
  await fs.rm(file, { force: true }).catch(() => {});
}

export async function getValue(address: string, key: string): Promise<string | null> {
  validateSegment(address);
  validateSegment(key);
  await ensureLake();
  if (useMemoryStore) {
    return memStore.get(address)?.get(key) ?? null;
  }
  if (s3 && bucket) {
    try {
      const stream = await s3.getObject(bucket, objectKey(address, key));
      return await streamToString(stream as Readable);
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
  validateSegment(address);
  await ensureLake();
  if (useMemoryStore) {
    const addrStore = memStore.get(address);
    if (!addrStore) return [];
    return Array.from(addrStore.entries()).map(([key, value]) => ({ key, value }));
  }
  if (s3 && bucket) {
    const prefix = `${address}/`;
    const out: { key: string; value: string }[] = [];
    try {
      const stream = s3.listObjectsV2(bucket, prefix, true);
      for await (const obj of stream as any) {
        const fullKey = obj.name as string;
        const key = fullKey.substring(prefix.length);
        const val = await getValue(address, key);
        if (val !== null) out.push({ key, value: val });
      }
    } catch {
      // ignore
    }
    return out;
  }
  const dir = path.join(localDir, address);
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

