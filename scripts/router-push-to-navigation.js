const fs = require('fs').promises;
const { globby } = require('globby');

async function run() {
  const files = await globby([
    'app/**/*.{ts,tsx,js,jsx}',
    'apps/**/*.{ts,tsx,js,jsx}',
    'src/**/*.{ts,tsx,js,jsx}',
    'components/**/*.{ts,tsx,js,jsx}',
    'contexts/**/*.{ts,tsx,js,jsx}',
  ], {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  });

  for (const file of files) {
    let text = await fs.readFile(file, 'utf8');
    const pushRegex = /router\.push\(\s*(['"`])([^'"`]+)\1\s*\)/g;
    if (!pushRegex.test(text)) continue;

    let updated = text.replace(pushRegex, (_m, quote, path) => `navigation.push(${quote}${path}${quote})`);

    if (!updated.match(/import\s+\*\s+as\s+navigation\s+from\s+['"]@\/services\/navigation['"]/)) {
      const lines = updated.split('\n');
      let lastImport = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^import\s/.test(lines[i])) lastImport = i;
      }
      lines.splice(lastImport + 1, 0, "import * as navigation from '@/services/navigation';");
      updated = lines.join('\n');
    }

    await fs.writeFile(file, updated);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
