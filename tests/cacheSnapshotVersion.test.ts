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
