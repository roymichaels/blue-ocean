// scripts/fix-waku-path.js
const fs = require('fs');
const path = require('path');

const candidates = [
  '@waku/core/lib/message/version_0',
  '@waku/core/lib/message/version-0',
  '@waku/core/dist/message/version_0',
  '@waku/core/dist/message/version-0',
];

function pickExisting() {
  for (const s of candidates) {
    try { require.resolve(s); return s; } catch {}
  }
  return null;
}

const target = pickExisting();
if (!target) {
  console.error('[fix-waku] Could not resolve any known Waku message path. Is @waku/core installed?');
  process.exit(1);
}

const sdkPkg = require.resolve('@waku/sdk/package.json');
const sdkRoot = path.dirname(sdkPkg);

// likely locations shipped by @waku/sdk
const files = [
  'dist/index.js',
  'dist/index.cjs',
  'index.js',
  'dist/src/index.js',
].map(f => path.join(sdkRoot, f)).filter(f => fs.existsSync(f));

let changed = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');

  const hasNeedle =
    src.includes('@waku/core/lib/message/version_0') ||
    src.includes('@waku/core/lib/message/version-0') ||
    src.includes('@waku/core/dist/message/version_0') ||
    src.includes('@waku/core/dist/message/version-0');

  if (!hasNeedle) continue;

  const out = src
    .replace(/@waku\/core\/lib\/message\/version_0/g, target)
    .replace(/@waku\/core\/lib\/message\/version-0/g, target)
    .replace(/@waku\/core\/dist\/message\/version_0/g, target)
    .replace(/@waku\/core\/dist\/message\/version-0/g, target);

  if (out !== src) {
    fs.writeFileSync(file, out, 'utf8');
    console.log(`[fix-waku] Patched ${path.relative(process.cwd(), file)} -> ${target}`);
    changed++;
  }
}

if (!changed) {
  console.log('[fix-waku] No @waku/sdk file needed patching.');
}
