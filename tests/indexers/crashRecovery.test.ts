import { promises as fs } from 'fs';
import path from 'path';
import { loadCheckpoint, saveCheckpoint } from '../../indexers/lake/src/checkpoint';

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
});
