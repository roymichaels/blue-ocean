const fs = require('fs');
const path = require('path');
const globby = require('globby');

(async () => {
  const dist = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(dist)) {
    console.error('dist/ directory not found');
    process.exit(1);
  }

  const files = await globby(['**/*.html', '**/*.js', '**/*.css'], { cwd: dist });
  const problems = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(dist, file), 'utf8');
    if (/src="\//.test(content) || /href="\//.test(content) || /url\(\//.test(content)) {
      problems.push(file);
    }
  }

  if (problems.length) {
    console.error('Found absolute asset paths in:');
    for (const p of problems) {
      console.error('  ' + p);
    }
    process.exit(1);
  }

  console.log('All asset paths are relative.');
})();
