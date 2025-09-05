import { spawn, ChildProcess } from 'child_process';
import { chromium, Browser, Page } from 'playwright';
import { routes } from '@/utils/routes';

const PORT = 4173;
const URL = `http://localhost:${PORT}/`;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(URL);
      if (res.status === 200) return;
    } catch {
      // ignore
    }
    await wait(500);
  }
  throw new Error('Unable to reach server');
}

 jest.setTimeout(60000);

describe('web smoke test', () => {
  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  let page: Page | undefined;

  beforeAll(async () => {
    server = spawn('npx', ['--yes', 'serve@14.2.0', 'dist', '-l', String(PORT)], {
      stdio: 'inherit',
    });
    await fetchWithRetry();
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) await browser.close();
    if (server) server.kill();
  });

  test('tabs render, avatar menu opens, and category route loads', async () => {
    await page!.goto(URL);
    await page!.waitForSelector('[data-testid="home-root"]');

    // tabs render
    await page!.waitForSelector('text=Stores');
    await page!.waitForSelector('text=Profile');

    // avatar menu opens
    await page!.click('[data-testid="avatar"]');
    await page!.waitForSelector('text=Login');

    // category route loads
    await page!.goto(`${URL}storefront${routes.category('electronics')}`);
    await page!.waitForSelector('[data-testid="search-input"]');
  }, 60000);
});
