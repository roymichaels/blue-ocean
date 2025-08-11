import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildTonContracts } from '../build-ton';
import { compile } from '@tact-lang/compiler';

jest.mock('@tact-lang/compiler', () => ({
  __esModule: true,
  compile: jest.fn(async ({ path: src, outputDir }: { path: string; outputDir: string }) => {
    const base = path.basename(src, '.tact');
    fs.writeFileSync(path.join(outputDir, `${base}.code.boc`), '');
    fs.writeFileSync(path.join(outputDir, `${base}.data.boc`), '');
  }),
}));

describe('build-ton script', () => {
  it('compiles tact files and outputs boc artifacts', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tact-'));
    fs.writeFileSync(path.join(tmp, 'foo.tact'), '');
    fs.writeFileSync(path.join(tmp, 'bar.tact'), '');

    await buildTonContracts(tmp);

    const buildDir = path.join(tmp, 'build');
    const outputs = fs.readdirSync(buildDir);
    expect(outputs).toEqual(
      expect.arrayContaining([
        'foo.code.boc',
        'foo.data.boc',
        'bar.code.boc',
        'bar.data.boc',
      ])
    );
    expect((compile as jest.Mock).mock.calls).toHaveLength(2);
  });
});
