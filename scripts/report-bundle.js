#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const BYTES_IN_KB = 1024;
const DEFAULT_THRESHOLD_KB = 150;
const entryPattern = /(?:app|index|main|entry|runtime)/i;

function formatSize(bytes) {
  const kb = bytes / BYTES_IN_KB;
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(2)} MB`;
  }
  return `${kb.toFixed(2)} KB`;
}

function gatherFiles(targetDir) {
  const files = [];
  const queue = [targetDir];
  while (queue.length) {
    const current = queue.pop();
    const stats = fs.statSync(current);
    if (stats.isDirectory()) {
      for (const child of fs.readdirSync(current)) {
        queue.push(path.join(current, child));
      }
      continue;
    }
    if (stats.isFile() && /\.(js|css)$/i.test(current)) {
      const raw = fs.readFileSync(current);
      files.push({
        path: current,
        name: path.basename(current),
        rawBytes: raw.length,
        gzipBytes: gzipSync(raw, { level: 9 }).length,
      });
    }
  }
  return files;
}

function main() {
  const target = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('dist');
  if (!fs.existsSync(target)) {
    console.error(`Bundle analysis failed: missing build output at ${target}`);
    process.exit(1);
  }

  const files = gatherFiles(target).sort((a, b) => b.gzipBytes - a.gzipBytes);
  if (!files.length) {
    console.error(`Bundle analysis failed: no JS or CSS assets found under ${target}`);
    process.exit(1);
  }

  const header = `${'Chunk'.padEnd(40)}${'Raw'.padStart(12)}${'Gzipped'.padStart(12)}`;
  console.log('Bundle size report');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const file of files) {
    const relative = path.relative(target, file.path) || file.name;
    const label = relative.length > 40 ? `…${relative.slice(-39)}` : relative;
    console.log(`${label.padEnd(40)}${formatSize(file.rawBytes).padStart(12)}${formatSize(file.gzipBytes).padStart(12)}`);
  }

  let initialChunks = files.filter((file) => entryPattern.test(file.name));
  if (!initialChunks.length) {
    initialChunks = files.slice(0, Math.min(2, files.length));
  }

  const initialPayloadBytes = initialChunks.reduce((sum, file) => sum + file.gzipBytes, 0);
  const thresholdBytes = DEFAULT_THRESHOLD_KB * BYTES_IN_KB;

  console.log('-'.repeat(header.length));
  console.log(
    `Initial payload (gz): ${formatSize(initialPayloadBytes)} (threshold ${DEFAULT_THRESHOLD_KB} KB)`
  );

  if (initialPayloadBytes > thresholdBytes) {
    console.error(
      `\n❌ Initial payload exceeds ${DEFAULT_THRESHOLD_KB} KB (gz). Trim imports or enable further code-splitting.`
    );
    process.exit(1);
  }

  console.log('\n✅ Bundle size check passed.');
}

try {
  main();
} catch (error) {
  console.error('Bundle analysis failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
