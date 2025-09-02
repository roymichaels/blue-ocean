const { spawn } = require('child_process');
const { chromium } = require('playwright');

const PORT = 4173;
const URL = `http://localhost:${PORT}/`;
const MARKER = '[data-testid="home-root"]';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(URL);
      if (res.status === 200) {
        return;
      }
    } catch (err) {
      // ignore and retry
    }
    await wait(500);
  }
  throw new Error('Unable to reach server');
}

async function main() {
  const server = spawn('npx', ['--yes', 'serve@14.2.0', 'dist', '-l', String(PORT)], {
    stdio: 'inherit',
  });

  try {
    await fetchWithRetry();
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(URL);
    await page.waitForSelector(MARKER, { timeout: 5000 });
    console.log('Web smoke test passed');
    await browser.close();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    server.kill();
  }
}

main();
