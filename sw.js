// FinanzasQ Service Worker — v4
const CACHE = 'finanzasq-v4';
const STATIC = [
  './manifest.json',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isNav = e.request.mode === 'navigate';
  const isMain = isNav || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');

  if (isMain) {
    // Network-first for main HTML — always get latest code
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res?.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
  } else {
    // Cache-first for assets (fonts, icons, etc.)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res?.status === 200 && res.type !== 'opaque') {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        });
      })
    );
  }
});
