import { Buffer } from "buffer";
type FSPromises = typeof import('fs').promises;
import AgentError from '@/types/AgentError';
import config from '@/config';
import { E_STALE_DATA, E_SYNC_LAG } from '@/schemas/cache';
import { warnIfLowStorage } from '@/services/storage';

const isBrowser = typeof window !== 'undefined';
const isNodeRuntime = !isBrowser && typeof process !== 'undefined' && !!process.versions?.node;

let fsPromises: FSPromises | null = null;
let pathModule: typeof import('path') | null = null;
let cryptoModule: typeof import('crypto') | null = null;

if (isNodeRuntime) {
  fsPromises = require('fs').promises;
  pathModule = require('path');
  cryptoModule = require('crypto');
}

const memorySnapshots = new Map<string, { hash: string; version: number; data: unknown }>();

const CACHE_DIR = isNodeRuntime && pathModule && typeof process.cwd === 'function'
  ? config.CACHE_DIR || pathModule.join(process.cwd(), '.cache')
  : '.cache';
const SECRET = config.CACHE_SECRET;
const hasSecret = typeof SECRET === 'string' && SECRET.trim().length > 0;

if (isNodeRuntime && !hasSecret) {
  throw new Error(
    'CACHE_SECRET is required when running the persistent cache. Provide a secure random value via the CACHE_SECRET environment variable or config.CACHE_SECRET.',
  );
}

const KEY = hasSecret && cryptoModule ? cryptoModule.createHash('sha256').update(SECRET!).digest() : null;

function filePath(key: string): string {
  if (!pathModule) return key;
  return pathModule.join(CACHE_DIR, `${key}.bin`);
}

async function ensureDir(dir: string) {
  if (!fsPromises) return;
  await fsPromises.mkdir(dir, { recursive: true });
}

function hashBuffer(data: Buffer): string {
  if (cryptoModule) {
    return cryptoModule.createHash('sha256').update(data).digest('hex');
  }
  // simple fallback hash for browser usage
  let hash = 0;
  for (const byte of data) {
    hash = (hash * 31 + byte) >>> 0;
  }
  return hash.toString(16);
}

export async function saveSnapshot(
  key: string,
  version: number,
  data: unknown,
): Promise<string> {
  const jsonBuffer = Buffer.from(JSON.stringify({ version, data }));
  if (!isNodeRuntime || !fsPromises || !cryptoModule || !KEY) {
    const hash = hashBuffer(jsonBuffer);
    memorySnapshots.set(key, { hash, version, data });
    return hash;
  }
  const iv = cryptoModule.randomBytes(12);
  const cipher = cryptoModule.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(jsonBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([iv, tag, enc]);
  await ensureDir(CACHE_DIR);
  await warnIfLowStorage();
  await fsPromises.writeFile(filePath(key), out);
  return hashBuffer(jsonBuffer);
}

export async function loadSnapshot<T>(
  key: string,
  expectedHash: string,
  expectedVersion: number,
): Promise<T | null> {
  if (!isNodeRuntime || !fsPromises || !cryptoModule || !KEY) {
    const entry = memorySnapshots.get(key);
    if (!entry) return null;
    if (entry.hash !== expectedHash || entry.version !== expectedVersion) {
      return null;
    }
    return entry.data as T;
  }
  try {
    const buf = await fsPromises.readFile(filePath(key));
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = cryptoModule.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(enc), decipher.final()]);
    const hash = hashBuffer(json);
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

export { E_STALE_DATA, E_SYNC_LAG };


