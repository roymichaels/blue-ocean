const fs = require('fs');

const appName = process.env.EXPO_PUBLIC_APP_NAME;
const tenant = process.env.EXPO_PUBLIC_TENANT;

if (!appName) {
  console.error('EXPO_PUBLIC_APP_NAME environment variable not set');
  process.exit(1);
}

const path = 'app.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
config.expo = config.expo || {};
config.expo.name = appName;
if (tenant) {
  config.expo.slug = tenant;
}
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
console.log(`Updated ${path} with name="${appName}" slug="${tenant || config.expo.slug}"`);
