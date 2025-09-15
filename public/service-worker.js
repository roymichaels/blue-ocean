const SHELL_CACHE = 'bo-shell-v2';
const RUNTIME_CACHE = 'bo-runtime-v2';
const IMMUTABLE_CACHE = 'bo-immutable-v1';
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (![SHELL_CACHE, RUNTIME_CACHE, IMMUTABLE_CACHE].includes(key)) {
              return caches.delete(key);
            }
            return undefined;
          }),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const cacheFirst = (request, cacheName) =>
  caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        cache.put(request, response.clone());
        return response;
      });
    }),
  );

const staleWhileRevalidate = (request) =>
  caches.open(RUNTIME_CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );

const networkFirst = (request) =>
  caches.open(RUNTIME_CACHE).then((cache) =>
    fetch(request)
      .then((response) => {
        cache.put(request, response.clone());
        return response;
      })
      .catch(() => cache.match(request)),
  );

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/locales/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
    event.respondWith(cacheFirst(request, IMMUTABLE_CACHE));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});
