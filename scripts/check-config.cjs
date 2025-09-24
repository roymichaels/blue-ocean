require('ts-node/register');
const config = require('../src/config').default;
const undefinedKeys = Object.entries(config).filter(([, v]) => v === undefined);
if (undefinedKeys.length > 0) {
  console.error('Undefined config keys:', undefinedKeys.map(([k]) => k).join(', '));
  process.exit(1);
}
