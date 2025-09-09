import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = process.env.CACHE_DIR || path.join(process.cwd(), '.cache');
const SECRET = process.env.CACHE_SECRET || 'blue-ocean';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

function filePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.bin`);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveSnapshot(key: string, data: unknown): Promise<string> {
  const json = Buffer.from(JSON.stringify(data));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(json), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([iv, tag, enc]);
  await ensureDir(CACHE_DIR);
  await fs.writeFile(filePath(key), out);
  return crypto.createHash('sha256').update(json).digest('hex');
}

export async function loadSnapshot<T>(key: string, expectedHash: string): Promise<T | null> {
  try {
    const buf = await fs.readFile(filePath(key));
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(enc), decipher.final()]);
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    if (hash !== expectedHash) return null;
    return JSON.parse(json.toString('utf8')) as T;
  } catch {
    return null;
  }
}

export async function getValidatedSnapshot<T>(
  key: string,
  fetchHash: () => Promise<string>,
): Promise<T | null> {
  const expected = await fetchHash();
  return loadSnapshot<T>(key, expected);
}

