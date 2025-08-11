const fs = require('fs-extra');
const path = require('path');
const globby = require('globby');

async function main() {
  const root = path.join(__dirname, '..');
  const dist = path.join(root, 'dist');
  const publicDir = path.join(root, 'public');

  const indexPath = path.join(dist, 'index.html');
  if (!(await fs.pathExists(indexPath))) {
    console.error('dist/index.html not found');
    process.exit(1);
  }

  const patterns = ['**/*.html', '**/*.js', '**/*.css'];
  const files = await globby(patterns, { cwd: dist, absolute: true });

  let rewrites = 0;

  for (const file of files) {
    let content = await fs.readFile(file, 'utf8');
    const original = content;

    if (file.endsWith('.html') && !/<base\s+href=/i.test(content)) {
      content = content.replace(/<head([^>]*)>/i, `<head$1><base href="./">`);
      if (content !== original) rewrites++;
    }

    content = content.replace(/src="\//g, () => {
      rewrites++;
      return 'src="./';
    });
    content = content.replace(/href="\//g, () => {
      rewrites++;
      return 'href="./';
    });
    content = content.replace(/url\(\//g, () => {
      rewrites++;
      return 'url(./';
    });

    const swRegister = /navigator\.serviceWorker\.register\([^;]*\);?/g;
    if (swRegister.test(content)) {
      content = content.replace(swRegister, () => {
        rewrites++;
        return '';
      });
    }

    const swScript = /<script[^>]*src=["'][^"']*(?:service-worker|sw)\.js["'][^>]*><\/script>/gi;
    if (swScript.test(content)) {
      content = content.replace(swScript, () => {
        rewrites++;
        return '';
      });
    }

    if (content !== original) {
      await fs.writeFile(file, content);
    }
  }

  const problems = [];
  const httpsOrigins = new Set();

  for (const file of files) {
    const rel = path.relative(root, file);
    const content = await fs.readFile(file, 'utf8');

    if (/src="\//.test(content)) problems.push(`${rel} contains src="/`);
    if (/href="\//.test(content)) problems.push(`${rel} contains href="/`);
    if (/url\(\//.test(content)) problems.push(`${rel} contains url(/`);
    if (/http:\/\//.test(content)) problems.push(`${rel} contains http://`);

    const httpsMatches = content.match(/https:\/\/[^"'\)\s]+/g);
    if (httpsMatches) {
      httpsMatches.forEach(u => {
        try {
          const { origin } = new URL(u);
          httpsOrigins.add(origin);
        } catch {}
      });
    }
  }

  if (httpsOrigins.size) {
    console.warn('Found https:// origins:');
    for (const origin of httpsOrigins) {
      console.warn(`  ${origin}`);
    }
  }

  if (problems.length) {
    console.error('Sanitization failed:');
    for (const p of problems) {
      console.error('  ' + p);
    }
    process.exit(1);
  }

  const publicFiles = await globby(['**/*'], {
    cwd: publicDir,
    absolute: true,
    dot: true,
    onlyFiles: true,
  });

  for (const src of publicFiles) {
    const rel = path.relative(publicDir, src);
    const dest = path.join(dist, rel);
    if (!(await fs.pathExists(dest))) {
      await fs.copy(src, dest);
    }
  }

  console.log(`Processed ${files.length} files with ${rewrites} rewrites`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

