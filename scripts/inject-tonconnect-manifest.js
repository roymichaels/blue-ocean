const fs = require('fs');
const path = require('path');

const domain = process.env.TONCONNECT_DOMAIN;
const terms = process.env.TONCONNECT_TERMS_URL;
const privacy = process.env.TONCONNECT_PRIVACY_URL;

if (!domain || !terms || !privacy) {
  console.error(
    'Missing required env variables TONCONNECT_DOMAIN, TONCONNECT_TERMS_URL, TONCONNECT_PRIVACY_URL'
  );
  process.exit(1);
}

const templatePath = path.join(__dirname, '..', 'public', 'tonconnect-manifest.json');
const manifest = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

manifest.url = domain;
manifest.termsOfUseUrl = terms;
manifest.privacyPolicyUrl = privacy;

const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

const outputPath = path.join(distPath, 'tonconnect-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`TonConnect manifest written to ${outputPath}`);
