const fs = require('fs-extra');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');

async function removeDist() {
  if (await fs.pathExists(dist)) {
    await fs.remove(dist);
    console.log(`Removed ${dist}`);
  }
}

async function copyPublic() {
  await fs.copy(publicDir, dist, { overwrite: true });
  console.log(`Copied ${publicDir} to ${dist}`);
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'copy') {
    await copyPublic();
  } else {
    await removeDist();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
