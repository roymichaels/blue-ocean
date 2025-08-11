import { compile } from '@tact-lang/compiler';
import fs from 'fs';
import path from 'path';

export async function buildTonContracts(
  contractsDir = path.resolve(__dirname, '../contracts/ton')
) {
  const outDir = path.join(contractsDir, 'build');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const files = fs.readdirSync(contractsDir).filter((f) => f.endsWith('.tact'));

  for (const file of files) {
    const src = path.join(contractsDir, file);
    console.log(`Compiling ${file}...`);
    await (compile as any)({ path: src, outputDir: outDir });
  }
}

if (require.main === module) {
  buildTonContracts().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
