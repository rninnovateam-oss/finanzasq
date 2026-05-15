// FinanzasQ Service Worker — v3 (bumped to force cache refresh)
const CACHE_NAME = 'finanzasq-v3';
const CORE_STATIC = [
  './manifest.json',
  './icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

// Install: cache static assets (NOT index.html — we use network-first for it)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_STATIC))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove ALL old caches so stale index.html is cleared
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   index.html → Network-first (always get latest code, fall back to cache when offline)
//   everything else → Cache-first (faster, assets don't change)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isIndexHtml = isNavigation || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');

  if (isIndexHtml) {
    // Network-first for the main HTML page
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
