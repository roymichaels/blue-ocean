import { promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';

let S3Client: typeof import('minio').Client | null = null;
let s3: import('minio').Client | null = null;
const s3Bucket = process.env.STATE_S3_BUCKET;
const s3Region = process.env.STATE_S3_REGION || 'eu-central-1';

async function ensureS3() {
  if (s3 || !s3Bucket) return;
  const endpoint = process.env.STATE_S3_ENDPOINT;
  const opts: any = { region: s3Region, s3ForcePathStyle: true };
  if (endpoint) {
    const url = new URL(endpoint);
    opts.endPoint = url.hostname;
    if (url.port) opts.port = parseInt(url.port, 10);
    opts.useSSL = url.protocol === 'https:';
  } else {
    opts.endPoint = `s3.${s3Region}.amazonaws.com`;
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

async function streamToString(stream: Readable | Uint8Array | string): Promise<string> {
  if (typeof stream === 'string') return stream;
  if (stream instanceof Uint8Array) return Buffer.from(stream).toString('utf8');
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function statePath() {
  return process.env.STATE_PATH || path.join(process.cwd(), '.state/lake.json');
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function loadCheckpoint(file: string = statePath()): Promise<number> {
  if (s3Bucket) {
    await ensureS3();
    try {
      const stream = await s3!.getObject(s3Bucket, 'checkpoint.json');
      const buf = await streamToString(stream as Readable);
      const { height } = JSON.parse(buf) as { height: number };
      return typeof height === 'number' ? height : 0;
    } catch {
      return 0;
    }
  }
  try {
    const buf = await fs.readFile(file, 'utf8');
    const { height } = JSON.parse(buf) as { height: number };
    return typeof height === 'number' ? height : 0;
  } catch {
    return 0;
  }
}

export async function saveCheckpoint(height: number, file: string = statePath()): Promise<void> {
  if (s3Bucket) {
    await ensureS3();
    await s3!.putObject(s3Bucket, 'checkpoint.json', JSON.stringify({ height }));
    return;
  }
  await ensureDir(file);
  await fs.writeFile(file, JSON.stringify({ height }), 'utf8');
}

