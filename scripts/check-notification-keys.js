#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'translations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
const locales = files.map((f) => ({
  locale: f.replace(/\.json$/, ''),
  data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
}));

if (locales.length === 0) {
  console.error('No locale files found');
  process.exit(1);
}

const ref = locales.find((l) => l.locale === 'en') || locales[0];
const required = ['notifications', 'notify'];
let missing = [];

for (const { locale, data } of locales) {
  for (const section of required) {
    const refSection = ref.data[section] || {};
    const locSection = data[section] || {};
    for (const key of Object.keys(refSection)) {
      if (!(key in locSection)) {
        missing.push(`${locale}: missing ${section}.${key}`);
      }
    }
  }
}

if (missing.length) {
  console.error('Missing notification translations:\n' + missing.join('\n'));
  process.exit(1);
}
