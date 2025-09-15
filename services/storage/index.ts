import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';

let S3Client: typeof import('minio').Client | null = null;
let s3: import('minio').Client | null = null;
const bucket = process.env.STORAGE_BUCKET;
const region = process.env.STORAGE_REGION || 'eu-central-1';
const secret = process.env.STORAGE_SECRET || 'blue-ocean-storage';
const dir = process.env.STORAGE_DIR || path.join(process.cwd(), '.storage');

const KEY = crypto.createHash('sha256').update(secret).digest();

async function warnIfLowStorage(threshold = 0.9) {
  try {
    const { bfree, blocks } = await fs.statfs(dir);
    const used = blocks - bfree;
    if (used / blocks > threshold) {
      const pct = ((used / blocks) * 100).toFixed(1);
      console.warn(`[storage] usage at ${pct}% capacity`);
    }
  } catch {
    // ignore unsupported platforms
  }
}

async function ensureS3() {
  if (s3 || !bucket) return;
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

function encrypt(data: string): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

function decrypt(buf: Buffer): string {
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(enc), decipher.final()]);
  return out.toString('utf8');
}

async function streamToBuffer(
  stream: Readable | Buffer | string,
): Promise<Buffer> {
  if (Buffer.isBuffer(stream)) return stream;
  if (typeof stream === 'string') return Buffer.from(stream);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function setItem(key: string, value: string): Promise<void> {
  await ensureS3();
  const enc = encrypt(value);
  if (s3 && bucket) {
    await s3.putObject(bucket, key, enc);
    return;
  }
  const file = path.join(dir, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await warnIfLowStorage();
  await fs.writeFile(file, enc);
}

export async function getItem(key: string): Promise<string | null> {
  await ensureS3();
  if (s3 && bucket) {
    try {
      const stream = await s3.getObject(bucket, key);
      const buf = await streamToBuffer(stream as Readable);
      return decrypt(buf);
    } catch {
      return null;
    }
  }
  const file = path.join(dir, key);
  try {
    const buf = await fs.readFile(file);
    return decrypt(buf);
  } catch {
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  await ensureS3();
  if (s3 && bucket) {
    await s3.removeObject(bucket, key).catch(() => {});
    return;
  }
  const file = path.join(dir, key);
  await fs.rm(file, { force: true }).catch(() => {});
}

export { warnIfLowStorage };
