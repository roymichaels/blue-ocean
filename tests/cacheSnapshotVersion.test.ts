import { promises as fs } from 'fs';
import path from 'path';
import { saveSnapshot, loadSnapshot } from '@/services/cache';
import { E_STALE_DATA } from '@/schemas/cache';

jest.mock('@/services/storage', () => ({
  warnIfLowStorage: jest.fn().mockResolvedValue(undefined),
}));

const key = 'cacheSnapshotVersion';
const file = path.join(process.cwd(), '.cache', `${key}.bin`);
type Value = { foo: string };

afterAll(async () => {
  await fs.rm(file, { force: true }).catch(() => {});
});

describe('cache snapshot schema version', () => {
  it('throws when version mismatches', async () => {
    const hash = await saveSnapshot(key, 1, { foo: 'bar' });
    await expect(loadSnapshot<Value>(key, hash, 2)).rejects.toMatchObject({
      code: E_STALE_DATA,
    });
    const data = await loadSnapshot<Value>(key, hash, 1);
    expect(data).toEqual({ foo: 'bar' });
  });
});

describe('cache secret configuration', () => {
  const originalSecret = process.env.CACHE_SECRET;

  afterEach(() => {
    jest.resetModules();
    if (originalSecret === undefined) {
      delete process.env.CACHE_SECRET;
    } else {
      process.env.CACHE_SECRET = originalSecret;
    }
  });

  it('throws a descriptive error when secret is missing in Node runtimes', () => {
    jest.resetModules();
    delete process.env.CACHE_SECRET;

    expect(() => {
      jest.isolateModules(() => {
        require('@/services/cache');
      });
    }).toThrowError(/CACHE_SECRET is required/);
  });
});
