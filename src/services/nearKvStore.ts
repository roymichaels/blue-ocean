import { promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';

import { assertNearChain } from './chain';
import { initLake } from './nearLake';
// Load config with a fallback for ts-node (tests use ts-node/register without tsconfig paths)
let config: any;
try {
  config = require('@/config').default;
} catch {
  config = require('../config').default;
}

if (typeof assertNearChain === 'function') {
  try { assertNearChain(); } catch {}
}

let lakeStarted = false;
let S3Client: typeof import('minio').Client | null = null;
let s3: import('minio').Client | null = null;
const bucket = config.NEAR_LAKE_BUCKET;
const region = config.NEAR_LAKE_REGION || 'eu-central-1';

// React Native and some web runtimes provide a `process` shim where `cwd`
// is either missing or not a function. Accessing it directly causes the
// "process.cwd is not a function" runtime error. Detect this scenario and
// fall back to an in-memory store instead of the filesystem.
const useMemoryStore =
  typeof process === 'undefined' || typeof (process as any).cwd !== 'function';

// Only resolve a local directory when running in a Node environment.
const localDir =
  config.NEAR_LAKE_DIR || (!useMemoryStore ? path.join(process.cwd(), '.near-lake') : '');

// Simple in-memory map for environments without filesystem access.
const memStore = new Map<string, Map<string, string>>();
// On the web, persist to localStorage for dev so data survives reloads
const hasLocalStorage = (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined');
function lsKey(address: string, key: string): string { return `kv:${address}:${key}`; }

function validateSegment(seg: string) {
  const isAbs =
    typeof path.isAbsolute === 'function'
      ? path.isAbsolute(seg)
      : /^(?:[\\/]|[A-Za-z]:)/.test(seg);
  if (seg.includes('..') || seg.includes('/') || seg.includes('\\') || isAbs) {
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
        startBlockHeight: BigInt(config.NEAR_LAKE_START_BLOCK || '0'),
      });
      const endpoint = config.NEAR_LAKE_ENDPOINT;
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
      const accessKey = config.NEAR_ACCESS_KEY || config.AWS_ACCESS_KEY_ID;
      const secretKey = config.NEAR_SECRET_KEY || config.AWS_SECRET_ACCESS_KEY;
      if (accessKey && secretKey) {
        opts.accessKey = accessKey;
        opts.secretKey = secretKey;
      }
      if (!useMemoryStore && !S3Client) {
        const { Client } = require('minio');
        S3Client = Client;
      }
      if (S3Client) {
        s3 = new S3Client(opts);
        lakeStarted = true;
        if (s3) {
          try {
            const stream = s3.listObjectsV2(bucketName, '', true);
            const addresses = new Set<string>();
            for await (const obj of stream as any) {
              const name = obj.name as string;
              const idx = name.indexOf('/');
              if (idx > 0) addresses.add(name.substring(0, idx));
            }
            for (const addr of addresses) {
              await listValues(addr);
            }
          } catch {
            // ignore hydration errors
          }
        }
        return;
      }
    }
  } catch {
    // ignore
  }
  lakeStarted = true;
}

ensureLake().catch(() => {});

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
    if (value === '') { addrStore.delete(key); if (hasLocalStorage) { try { window.localStorage.removeItem(lsKey(address, key)); } catch {} } } else { addrStore.set(key, value); if (hasLocalStorage) { try { window.localStorage.setItem(lsKey(address, key), value); } catch {} } }
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
    memStore.get(address)?.delete(key); if (hasLocalStorage) { try { window.localStorage.removeItem(lsKey(address, key)); } catch {} }
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
    const cached = memStore.get(address)?.get(key); if (cached != null) return cached; if (hasLocalStorage) { try { const v = window.localStorage.getItem(lsKey(address, key)); if (v != null) { let addrStore = memStore.get(address); if (!addrStore) { addrStore = new Map(); memStore.set(address, addrStore); } addrStore.set(key, v); return v; } } catch {} } return null;
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
  if (useMemoryStore) { const addrStore = memStore.get(address); const fromMem = addrStore ? Array.from(addrStore.entries()).map(([key, value]) => ({ key, value })) : []; if (hasLocalStorage) { const out: { key: string; value: string }[] = []; try { for (let i = 0; i < window.localStorage.length; i++) { const k = window.localStorage.key(i)!; const prefix = `kv:${address}:`; if (!k.startsWith(prefix)) continue; const logical = k.substring(prefix.length); const v = window.localStorage.getItem(k); if (v != null) out.push({ key: logical, value: v }); } } catch {} const seen = new Set(out.map((e) => e.key)); for (const e of fromMem) if (!seen.has(e.key)) out.push(e); return out; } return fromMem; }
  if (s3 && bucket) {
    const prefix = `${address}/`;
    const out: { key: string; value: string }[] = [];
    try {
      const stream = s3.listObjectsV2(bucket, prefix, true);
      for await (const obj of stream as any) {
        const fullKey = obj.name as string;
        const key = fullKey.substring(prefix.length);
        try {
          const valStream = await s3.getObject(bucket, fullKey);
          const value = await streamToString(valStream as Readable);
          out.push({ key, value });
          let addrStore = memStore.get(address);
          if (!addrStore) {
            addrStore = new Map();
            memStore.set(address, addrStore);
          }
          addrStore.set(key, value);
        } catch {
          // ignore individual objects
        }
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



