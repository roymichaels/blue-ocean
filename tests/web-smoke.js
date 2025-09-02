const { spawn } = require('child_process');

const PORT = 4173;
const URL = `http://localhost:${PORT}/`;
const MARKER = '<div id="root">';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(URL);
      if (res.status === 200) {
        return res;
      }
    } catch (err) {
      // ignore and retry
    }
    await wait(500);
  }
  throw new Error('Unable to fetch index');
}

async function main() {
  const server = spawn('npx', ['--yes', 'serve@14.2.0', 'dist', '-l', String(PORT)], {
    stdio: 'inherit',
  });

  try {
    const res = await fetchWithRetry();
    const html = await res.text();
    if (!html.includes(MARKER)) {
      throw new Error('DOM marker not found');
    }
    console.log('Web smoke test passed');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    server.kill();
  }
}

main();
