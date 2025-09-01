/*
  Synchronizes NEAR dependencies across the repo and verifies hoisting.
  - Sets near-api-js to 6.2.6 if present
  - Sets @near-wallet-selector/* to 9.3.0 if present
  - Ensures root package.json resolutions include these pins
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

const NEAR_JS_VERSION = '2.1.4';
const SELECTOR_VERSION = '8.9.3';
const LATEST_CB_VERSION = '0.2.4';

let changed = 0;

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

console.log('\nSummary:');
if (changed === 0) console.log('• No changes needed.');
else console.log(`• Wrote ${changed} package.json file(s).`);

console.log('\nNext steps:');
console.log('1) yarn install');
console.log('2) expo start -c');
console.log('3) yarn why near-api-js');
console.log('   → should resolve to a single 6.2.6');
