import { PREFETCH_URLS, SHELL_ASSETS } from './cacheManifest';

export const warmRuntimeCaches = (): void => {
  if (typeof window === 'undefined' || !('caches' in window) || !('fetch' in window)) {
    return;
  }

  const urls = Array.from(new Set([...SHELL_ASSETS, ...PREFETCH_URLS]));

  void (async () => {
    try {
      const cache = await caches.open('bo-prewarm');
      await Promise.all(
        urls.map(async (url) => {
          try {
            const response = await fetch(new Request(url, { cache: 'reload' }));
            if (response.ok) {
              await cache.put(url, response.clone());
            }
          } catch {
            // Ignore network failures – offline mode will fall back to existing cache.
          }
        }),
      );
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Cache warmup failed', error);
      }
    }
  })();
};
