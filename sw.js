/* Service worker: кэшуе ўсё, каб таймер працаваў без інтэрнэту.
   Пры кожным рэлізе павялічвайце VERSION — стары кэш выдаліцца сам. */
const VERSION = '2.0.0';
const CACHE = `slam-timer-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './strings.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './fonts/playfair-normal-400-latin.woff2',
  './fonts/playfair-normal-400-cyrillic.woff2',
  './fonts/playfair-normal-700-latin.woff2',
  './fonts/playfair-normal-700-cyrillic.woff2',
  './fonts/playfair-italic-400-latin.woff2',
  './fonts/playfair-italic-400-cyrillic.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});
