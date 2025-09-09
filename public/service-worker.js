const CACHE = 'static-v1';
const IMG_CACHE = 'images-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (![CACHE, IMG_CACHE].includes(key)) {
            return caches.delete(key);
          }
          return undefined;
        }),
      ),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMG_CACHE).then((cache) =>
        cache.match(request).then((resp) => {
          if (resp) return resp;
          return fetch(request).then((networkResp) => {
            cache.put(request, networkResp.clone());
            return networkResp;
          });
        }),
      ),
    );
    return;
  }
  event.respondWith(
    fetch(request).catch(() => caches.match(request)),
  );
});
