import { compile } from '@tact-lang/compiler';
import fs from 'fs';
import path from 'path';

async function main() {
  const contractsDir = path.resolve(__dirname, '../contracts/ton');
  const outDir = path.join(contractsDir, 'build');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const files = fs.readdirSync(contractsDir).filter((f) => f.endsWith('.tact'));

  for (const file of files) {
    const src = path.join(contractsDir, file);
    console.log(`Compiling ${file}...`);
    await compile({ path: src, outputDir: outDir });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
