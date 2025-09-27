import { Buffer } from "buffer";
import type { Readable } from 'stream';

type MinioClient = import('minio').Client;
type FSPromises = typeof import('fs').promises;
type PathModule = typeof import('path');
type CryptoModule = typeof import('crypto');

const isBrowser = typeof window !== 'undefined';
const isNodeRuntime = !isBrowser && typeof process !== 'undefined' && !!process.versions?.node;

let fsPromises: FSPromises | null = null;
let pathModule: PathModule | null = null;
let cryptoModule: CryptoModule | null = null;
let ReadableCtor: typeof import('stream').Readable | null = null;

if (isNodeRuntime) {
  fsPromises = require('fs').promises;
  pathModule = require('path');
  cryptoModule = require('crypto');
  ({ Readable: ReadableCtor } = require('stream'));
}

let S3Client: typeof import('minio').Client | null = null;
let s3: MinioClient | null = null;
const bucket = isNodeRuntime ? process.env.STORAGE_BUCKET : undefined;
const region = isNodeRuntime ? process.env.STORAGE_REGION || 'eu-central-1' : undefined;
const secret = isNodeRuntime ? process.env.STORAGE_SECRET || 'blue-ocean-storage' : 'browser-storage';
const dir = isNodeRuntime && pathModule && typeof process.cwd === 'function'
  ? process.env.STORAGE_DIR || pathModule.join(process.cwd(), '.storage')
  : '.storage';

const memoryStore = new Map<string, string>();
const localStorageKeyPrefix = 'storage:';

const KEY = cryptoModule ? cryptoModule.createHash('sha256').update(secret).digest() : null;

export async function warnIfLowStorage(threshold = 0.9): Promise<void> {
  if (!isNodeRuntime || !fsPromises) return;
  const statfs = (fsPromises as any).statfs;
  if (typeof statfs !== 'function') return;
  try {
    const stats = await statfs(dir);
    const { bfree, blocks } = stats;
    const used = blocks - bfree;
    if (used / blocks > threshold) {
      const pct = ((used / blocks) * 100).toFixed(1);
      console.warn(`[storage] usage at ${pct}% capacity`);
    }
  } catch {
    // not supported; ignore
  }
}

async function ensureS3(): Promise<void> {
  if (!isNodeRuntime || !bucket) return;
  if (s3) return;
  const endpoint = process.env.STORAGE_ENDPOINT;
  const opts: any = { region, s3ForcePathStyle: true };
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
  if (!S3Client) {
    const { Client } = require('minio');
    S3Client = Client;
  }
  s3 = new S3Client!(opts);
}

function encryptNode(data: string): Buffer {
  if (!cryptoModule || !KEY) return Buffer.from(data, 'utf8');
  const iv = cryptoModule.randomBytes(12);
  const cipher = cryptoModule.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

function decryptNode(buf: Buffer): string {
  if (!cryptoModule || !KEY) return buf.toString('utf8');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = cryptoModule.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(enc), decipher.final()]);
  return out.toString('utf8');
}

async function streamToBuffer(stream: Readable | Buffer | string): Promise<Buffer> {
  if (!isNodeRuntime) throw new Error('streamToBuffer not available in browser runtime');
  if (Buffer.isBuffer(stream)) return stream;
  if (typeof stream === 'string') return Buffer.from(stream);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function setLocalMemory(key: string, value: string) {
  memoryStore.set(key, value);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`${localStorageKeyPrefix}${key}`, value);
    } catch {
      // ignore storage quota issues
    }
  }
}

function getLocalMemory(key: string): string | null {
  if (memoryStore.has(key)) return memoryStore.get(key) ?? null;
  if (typeof localStorage !== 'undefined') {
    const value = localStorage.getItem(`${localStorageKeyPrefix}${key}`);
    if (value !== null) {
      memoryStore.set(key, value);
      return value;
    }
  }
  return null;
}

function removeLocalMemory(key: string) {
  memoryStore.delete(key);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(`${localStorageKeyPrefix}${key}`);
    } catch {
      // ignore
    }
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (!isNodeRuntime || !fsPromises || !pathModule) {
    setLocalMemory(key, value);
    return;
  }
  await ensureS3();
  const enc = encryptNode(value);
  if (s3 && bucket) {
    await s3.putObject(bucket, key, enc);
    return;
  }
  const file = pathModule.join(dir, key);
  await fsPromises.mkdir(pathModule.dirname(file), { recursive: true });
  await warnIfLowStorage();
  await fsPromises.writeFile(file, enc);
}

export async function getItem(key: string): Promise<string | null> {
  if (!isNodeRuntime || !fsPromises || !pathModule) {
    return getLocalMemory(key);
  }
  await ensureS3();
  if (s3 && bucket) {
    try {
      const stream = await s3.getObject(bucket, key);
      const buf = await streamToBuffer(stream as Readable);
      return decryptNode(buf);
    } catch {
      return null;
    }
  }
  const file = pathModule.join(dir, key);
  try {
    const buf = await fsPromises.readFile(file);
    return decryptNode(buf);
  } catch {
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  if (!isNodeRuntime || !fsPromises || !pathModule) {
    removeLocalMemory(key);
    return;
  }
  await ensureS3();
  if (s3 && bucket) {
    await s3.removeObject(bucket, key).catch(() => {});
    return;
  }
  const file = pathModule.join(dir, key);
  await fsPromises.rm(file, { force: true }).catch(() => {});
}

