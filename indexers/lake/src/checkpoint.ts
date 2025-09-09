import { promises as fs } from 'fs';
import path from 'path';

function statePath() {
  return process.env.STATE_PATH || path.join(process.cwd(), '.state/lake.json');
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function loadCheckpoint(file: string = statePath()): Promise<number> {
  try {
    const buf = await fs.readFile(file, 'utf8');
    const { height } = JSON.parse(buf) as { height: number };
    return typeof height === 'number' ? height : 0;
  } catch {
    return 0;
  }
}

export async function saveCheckpoint(height: number, file: string = statePath()): Promise<void> {
  await ensureDir(file);
  await fs.writeFile(file, JSON.stringify({ height }), 'utf8');
}

