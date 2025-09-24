// A simple cross-platform sleep helper
// Supports environments without Node's `timers/promises` module
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      const wait = delayMs * 2 ** (attempt - 1);
      await sleep(wait);
    }
  }
}
