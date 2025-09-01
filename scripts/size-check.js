const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { globby } = require('globby');

const MAX_SIZE = 500 * 1024; // 500KB

async function main() {
  const root = path.join(__dirname, '..');
  const patterns = ['dist/**/index.js'];
  const files = await globby(patterns, { cwd: root, absolute: true });

  if (!files.length) {
    console.error('No dist/**/index.js files found. Did you run yarn build:web?');
    process.exit(1);
  }

  let total = 0;

  for (const file of files) {
    const contents = await fs.promises.readFile(file);
    const gzipped = zlib.gzipSync(contents);
    total += gzipped.length;
  }

  const kb = total / 1024;
  console.log(`Total gzipped size: ${kb.toFixed(2)} KB`);

  if (total > MAX_SIZE) {
    console.error(`Bundle size limit of ${MAX_SIZE / 1024} KB exceeded`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
