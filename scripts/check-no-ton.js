const { execSync } = require('child_process');
const fs = require('fs');

const PATTERNS = [
  { regex: /\bTON\b/, label: 'TON' },
  { regex: /toncenter\.com/i, label: 'toncenter.com' },
  { regex: /tonapi\.io/i, label: 'tonapi.io' },
  { regex: /ton\.org/i, label: 'ton.org' },
];

const IGNORE_PREFIXES = ['docs/', 'scripts/check-no-ton.js'];

function isIgnored(file) {
  return IGNORE_PREFIXES.some((p) => file === p || file.startsWith(p));
}

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !isIgnored(file));

const violations = [];

for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { regex, label } of PATTERNS) {
      if (regex.test(line)) {
        violations.push(`${file}:${i + 1}: found ${label}`);
        break;
      }
    }
  }
}

if (violations.length) {
  console.error('Forbidden TON references found:');
  for (const v of violations) console.error('  ' + v);
  process.exit(1);
}

console.log('No TON references found');
