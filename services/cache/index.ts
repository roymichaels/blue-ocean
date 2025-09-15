import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from '@/config';
import AgentError from '@/types/AgentError';
import { E_STALE_DATA } from '@/schemas/cache';
import { warnIfLowStorage } from '@/services/storage';


const CACHE_DIR = config.CACHE_DIR || path.join(process.cwd(), '.cache');
const SECRET = config.CACHE_SECRET || 'blue-ocean';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

function filePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.bin`);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveSnapshot(
  key: string,
  version: number,
  data: unknown,
): Promise<string> {
  const json = Buffer.from(JSON.stringify({ version, data }));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(json), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([iv, tag, enc]);
  await ensureDir(CACHE_DIR);
  await warnIfLowStorage();
  await fs.writeFile(filePath(key), out);
  return crypto.createHash('sha256').update(json).digest('hex');
}

export async function loadSnapshot<T>(
  key: string,
  expectedHash: string,
  expectedVersion: number,
): Promise<T | null> {
  try {
    const buf = await fs.readFile(filePath(key));
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(enc), decipher.final()]);
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    if (hash !== expectedHash)
      throw Object.assign(
        new AgentError(E_STALE_DATA, 'Snapshot hash mismatch', 'cache'),
        { expected: expectedHash, actual: hash },
      );
    const parsed = JSON.parse(json.toString('utf8')) as {
      version: number;
      data: T;
    };
    if (parsed.version !== expectedVersion)
      throw Object.assign(
        new AgentError(E_STALE_DATA, 'Snapshot version mismatch', 'cache'),
        { expected: expectedVersion, actual: parsed.version },
      );
    return parsed.data;
  } catch (err) {
    if (err instanceof AgentError) throw err;
    return null;
  }
}

export async function getValidatedSnapshot<T>(
  key: string,
  version: number,
  fetchHash: () => Promise<string>,
): Promise<T | null> {
  const expected = await fetchHash();
  return loadSnapshot<T>(key, expected, version);
}
