// scripts/fix-waku-path.js
const fs = require('fs');
const path = require('path');

const posix = (p) => p.split(path.sep).join('/');

function findCoreRoot() {
  try {
    return path.dirname(require.resolve('@waku/core/package.json'));
  } catch {
    return null;
  }
}

function findMessageFile(coreRoot) {
  // Try common layouts first
  const dirs = [
    ['lib', 'message'],
    ['dist', 'lib', 'message'],
    ['dist', 'message'],
    ['src', 'message'],
  ];
  const names = [
    'version_0',
    'version-0',
    'version0',
    'version_1',
    'version-1',
    'version',
  ];
  const exts = ['.mjs', '.cjs', '.js'];
  for (const parts of dirs) {
    const base = path.join(coreRoot, ...parts);
    for (const name of names)
      for (const ext of exts) {
        const f = path.join(base, name + ext);
        if (fs.existsSync(f)) return f;
      }
  }
  // Fallback: scan for .../message/version*.{js,mjs,cjs}
  const stack = [coreRoot];
  while (stack.length) {
    const d = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {}
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (/[/\\]message[/\\]version[-_0-9]*\.(mjs|cjs|js)$/.test(p))
        return p;
    }
  }
  return null;
}

function patchSdk(coreFile) {
  const sdkPkg = require.resolve('@waku/sdk/package.json');
  const sdkRoot = path.dirname(sdkPkg);
  const candidates = [
    'dist/index.js',
    'dist/index.mjs',
    'dist/index.cjs',
    'index.js',
    'dist/src/index.js',
  ]
    .map((f) => path.join(sdkRoot, f))
    .filter((f) => fs.existsSync(f));

  const needles = [
    '@waku/core/lib/message/version_0',
    '@waku/core/lib/message/version-0',
    '@waku/core/dist/message/version_0',
    '@waku/core/dist/message/version-0',
  ];

  let changed = 0;
  for (const file of candidates) {
    const src = fs.readFileSync(file, 'utf8');
    if (!needles.some((n) => src.includes(n))) continue;

    const rel = posix(path.relative(path.dirname(file), coreFile));
    const relPath = rel.startsWith('.') ? rel : './' + rel;

    let out = src;
    for (const n of needles) out = out.split(n).join(relPath);

    fs.writeFileSync(file, out, 'utf8');
    console.log(
      `[fix-waku] Patched ${posix(
        path.relative(process.cwd(), file)
      )} -> ${relPath}`
    );
    changed++;
  }
  if (!changed)
    console.log(
      '[fix-waku] No matching imports found (maybe already patched).'
    );
  return changed;
}

(function main() {
  const coreRoot = findCoreRoot();
  if (!coreRoot) {
    console.error(
      '[fix-waku] @waku/core is not installed. Ensure install completed.'
    );
    process.exit(1);
  }
  const coreFile = findMessageFile(coreRoot);
  if (!coreFile) {
    console.error(
      '[fix-waku] Could not locate message/version*.{js,mjs,cjs} under',
      coreRoot
    );
    process.exit(1);
  }
  patchSdk(coreFile);
})();
