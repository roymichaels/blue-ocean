import { promises as fs } from 'fs';
import path from 'path';

const STATE_PATH = process.env.STATE_PATH || '.state/lake.json';

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function loadCheckpoint(): Promise<number> {
  try {
    const buf = await fs.readFile(STATE_PATH, 'utf8');
    const { height } = JSON.parse(buf) as { height: number };
    return typeof height === 'number' ? height : 0;
  } catch {
    return 0;
  }
}

export async function saveCheckpoint(height: number): Promise<void> {
  await ensureDir(STATE_PATH);
  await fs.writeFile(STATE_PATH, JSON.stringify({ height }), 'utf8');
}

