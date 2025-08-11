require('dotenv/config');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'public', 'tonconnect-manifest.json');
const destDir = path.join(__dirname, '..', 'dist');
const dest = path.join(destDir, 'tonconnect-manifest.json');

if (!fs.existsSync(src)) {
  console.error(`Source manifest not found at ${src}`);
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log(`Copied TonConnect manifest to ${dest}`);

