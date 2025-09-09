import { promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { loadCheckpoint, saveCheckpoint } from '../../indexers/lake/src/checkpoint';

jest.mock('minio', () => {
  const store = new Map<string, Buffer>();
  class Client {
    async putObject(bucket: string, key: string, value: Buffer | string) {
      const buf = Buffer.isBuffer(value) ? value : Buffer.from(value);
      store.set(`${bucket}/${key}`, buf);
    }
    async getObject(bucket: string, key: string) {
      const val = store.get(`${bucket}/${key}`);
      if (!val) throw new Error('not found');
      return Readable.from(val);
    }
    async removeObject(bucket: string, key: string) {
      store.delete(`${bucket}/${key}`);
    }
  }
  return { Client };
});

describe('indexer checkpoint crash recovery', () => {
  const stateFile = path.join(__dirname, 'tmp-state.json');

  beforeEach(async () => {
    process.env.STATE_PATH = stateFile;
    await fs.rm(stateFile, { force: true });
  });

  it('starts from zero when no checkpoint exists', async () => {
    const height = await loadCheckpoint();
    expect(height).toBe(0);
  });

  it('resumes from last saved height', async () => {
    await saveCheckpoint(50);
    const saved = await loadCheckpoint();
    expect(saved).toBe(50);
    // simulate another processed block
    await saveCheckpoint(saved + 1);
    expect(await loadCheckpoint()).toBe(51);
  });

  it('replays from S3 after crash', async () => {
    process.env.STATE_S3_BUCKET = 'test-bucket';
    delete process.env.STATE_PATH;
    const cp1 = require('../../indexers/lake/src/checkpoint');
    await cp1.saveCheckpoint(99);
    delete require.cache[require.resolve('../../indexers/lake/src/checkpoint')];
    const cp2 = require('../../indexers/lake/src/checkpoint');
    expect(await cp2.loadCheckpoint()).toBe(99);
    delete process.env.STATE_S3_BUCKET;
  });
});
