// Hard fail if non-stub NEAR refs remain outside allowed files.
const { execSync } = require('node:child_process');

const ALLOW = [
  'src/services/nearStub',
  'src/services/_adapters/near_replacement.',
  'src/services/waku',
];

function run(cmd) {
  return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

const rgImports = "rg -n --no-heading \"(from|require\\()\\s*['\"]([^'\"]*near[^'\"]*)['\"]\" -g '!node_modules/**' -g '!dist/**' -g '!build/**' -g '!coverage/**'";

let importOutput = '';
try {
  importOutput = run(rgImports);
} catch (err) {
  if (err.status !== 1) throw err;
}

const importLines = (importOutput ? importOutput.split('\n') : [])
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => !ALLOW.some((allowed) => line.includes(allowed)));

if (importLines.length > 0) {
  console.error('❌ Residual NEAR imports found:\n' + importLines.join('\n'));
  process.exit(1);
}

const rgEnv = "rg -n \"process\\.env\\.(NEAR|NEARLAKE|EXPO_PUBLIC_CHAIN|EXPO_PUBLIC_CONTRACT_ID|EXPO_PUBLIC_NETWORK)\" -g '!node_modules/**'";

let envOutput = '';
try {
  envOutput = run(rgEnv);
} catch (err) {
  if (err.status !== 1) throw err;
}

if (envOutput) {
  console.error('❌ Residual NEAR env references:\n' + envOutput.trim());
  process.exit(1);
}

console.log('✅ No disallowed NEAR imports/envs detected.');
