import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

// nearKvStore uses a lightweight MinIO client for S3 access.
// These tests exercise the filesystem fallback without touching S3.
const tmpDir = path.join(os.tmpdir(), 'near-kv-store-test');

function runScript(code: string): string {
  const tsOptions = JSON.stringify({ module: 'commonjs' });
  const res = spawnSync(
    'node',
    ['-r', 'ts-node/register', '-e', code],
    {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        NEAR_LAKE_DIR: tmpDir,
        TS_NODE_COMPILER_OPTIONS: tsOptions,
      },
      encoding: 'utf-8',
    },
  );
  if (res.status !== 0) {
    throw new Error(res.stderr);
  }
  return res.stdout.trim();
}

  describe('kv_persistence', () => {
  beforeEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

    it('persists_across_runs', () => {
    runScript(
      "const kv=require('./services/nearKvStore'); (async()=>{await kv.setValue('addr1','foo','bar');})();",
    );
    const out = runScript(
      "const kv=require('./services/nearKvStore'); (async()=>{const v=await kv.getValue('addr1','foo'); console.log(v ?? '')})();",
    );
    expect(out).toBe('bar');
  });

    it('removes_persistently', () => {
    runScript(
      "const kv=require('./services/nearKvStore'); (async()=>{await kv.setValue('addr2','baz','qux'); await kv.removeValue('addr2','baz');})();",
    );
    const out = runScript(
      "const kv=require('./services/nearKvStore'); (async()=>{const v=await kv.getValue('addr2','baz'); console.log(v ?? '')})();",
    );
    expect(out).toBe('');
  });
});

describe('path_segment_validation', () => {
  it('rejects absolute paths in Node environment', () => {
    const out = runScript(
      "const kv=require('./services/nearKvStore'); (async()=>{try{await kv.setValue('addr','/foo','bar'); console.log('ok');}catch{console.log('err');}})();",
    );
    expect(out).toBe('err');
  });

  it('rejects absolute paths without path.isAbsolute', () => {
    const out = runScript(
      "const path=require('path'); const kv=require('./services/nearKvStore'); path.isAbsolute=undefined; (async()=>{try{await kv.setValue('addr','/foo','bar'); console.log('ok');}catch{console.log('err');}})();",
    );
    expect(out).toBe('err');
  });
});

