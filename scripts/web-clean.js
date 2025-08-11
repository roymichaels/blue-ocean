const fs = require('fs-extra');
const path = require('path');

async function main() {
  const dist = path.join(__dirname, '..', 'dist');
  await fs.remove(dist);
  await fs.ensureDir(dist);
  console.log(`Cleaned ${dist}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
