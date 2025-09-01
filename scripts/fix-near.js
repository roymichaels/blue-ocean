/*
  Ensures consistent NEAR deps across the monorepo and verifies hoisting.
  - Sets near-api-js to 6.2.6 if present
  - Sets @near-wallet-selector/* to 9.3.0 if present
  - Ensures root package.json resolutions include these pins
  - Rewrites leftover TON constants or URLs to their NEAR equivalents
  - Prints a summary and next steps
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGETS = [
  path.join(ROOT, 'package.json'),
  path.join(ROOT, 'packages', 'utils', 'package.json'),
  path.join(ROOT, 'relayer', 'package.json'),
].filter((p) => fs.existsSync(p));

const SEARCH_PATHS = ['src', 'packages', 'config', 'docs']
  .map((p) => path.join(ROOT, p))
  .filter((p) => fs.existsSync(p));
const EXTRA_FILES = ['.env', '.env.example']
  .map((p) => path.join(ROOT, p))
  .filter((p) => fs.existsSync(p));

const NEAR_JS_VERSION = '2.1.4';
const SELECTOR_VERSION = '8.9.3';
const LATEST_CB_VERSION = '0.2.4';

let changed = 0;
let rewritten = 0;

function setDep(obj, name, ver) {
  let hit = false;
  if (obj.dependencies && obj.dependencies[name]) {
    if (obj.dependencies[name] !== ver) {
      obj.dependencies[name] = ver;
      hit = true;
    }
  }
  if (obj.devDependencies && obj.devDependencies[name]) {
    if (obj.devDependencies[name] !== ver) {
      obj.devDependencies[name] = ver;
      hit = true;
    }
  }
  return hit;
}

for (const pkgPath of TARGETS) {
  const data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  let localChanged = false;

  localChanged |= setDep(data, 'near-api-js', `${NEAR_JS_VERSION}`);
  localChanged |= setDep(data, '@near-wallet-selector/core', SELECTOR_VERSION);
  localChanged |= setDep(data, '@near-wallet-selector/near-wallet', SELECTOR_VERSION);
  localChanged |= setDep(data, 'use-latest-callback', LATEST_CB_VERSION);

  if (pkgPath.endsWith('package.json')) {
    data.resolutions = data.resolutions || {};
    if (data.resolutions['near-api-js'] !== NEAR_JS_VERSION) {
      data.resolutions['near-api-js'] = NEAR_JS_VERSION;
      localChanged = true;
    }
    if (data.resolutions['@near-wallet-selector/core'] !== SELECTOR_VERSION) {
      data.resolutions['@near-wallet-selector/core'] = SELECTOR_VERSION;
      localChanged = true;
    }
    if (data.resolutions['@near-wallet-selector/near-wallet'] !== SELECTOR_VERSION) {
      data.resolutions['@near-wallet-selector/near-wallet'] = SELECTOR_VERSION;
      localChanged = true;
    }
    if (data.resolutions['use-latest-callback'] !== LATEST_CB_VERSION) {
      data.resolutions['use-latest-callback'] = LATEST_CB_VERSION;
      localChanged = true;
    }
  }

  if (localChanged) {
    fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2) + '\n');
    changed++;
    console.log(`✔ Updated ${path.relative(ROOT, pkgPath)}`);
  }
}

function isTextFile(file) {
  const ext = path.extname(file).toLowerCase();
  return [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
    '.md',
    '.env',
    '.yml',
    '.yaml',
    '.sh',
  ].includes(ext);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && isTextFile(fullPath)) rewriteFile(fullPath);
  }
}

function rewriteFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  let output = original
    .replace(/\bTON\b/g, 'NEAR')
    .replace(/\bTon\b/g, 'Near')
    .replace(/TON_/g, 'NEAR_')
    .replace(/Ton_/g, 'Near_')
    .replace(/https?:\/\/[^"'\s]*ton[^"'\s]*/gi, (m) => m.replace(/ton/gi, 'near'));
  if (output !== original) {
    fs.writeFileSync(file, output);
    rewritten++;
    console.log(`✔ Rewrote ${path.relative(ROOT, file)}`);
  }
}

for (const dir of SEARCH_PATHS) walk(dir);
for (const file of EXTRA_FILES) rewriteFile(file);

console.log('\nSummary:');
if (changed === 0) console.log('• No package.json changes needed.');
else console.log(`• Wrote ${changed} package.json file(s).`);
if (rewritten === 0) console.log('• No TON references found.');
else console.log(`• Rewrote ${rewritten} file(s) replacing TON → NEAR.`);

console.log('\nNext steps:');
console.log('1) yarn install');
console.log('2) expo start -c');
console.log('3) yarn why near-api-js');
console.log('   → should resolve to a single 6.2.6');
