const fs = require('fs-extra');
const path = require('path');
const globby = require('globby');

async function main() {
  const dist = path.join(__dirname, '..', 'dist');
  const patterns = ['**/*.html', '**/*.js', '**/*.css'];
  const files = await globby(patterns, { cwd: dist, absolute: true });

  await Promise.all(
    files.map(async file => {
      let content = await fs.readFile(file, 'utf8');
      content = content
        .replace(/(href|src)="\//g, '$1="./');
      await fs.writeFile(file, content);
    })
  );

  console.log(`Sanitized ${files.length} files for IPFS in ${dist}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
