/* Offline support (PWA). Network-first: when online you always get the latest deploy; every response is
   cached so the game keeps working with no connection. The precache list is the same js/modules.js
   list index.html loads, so a new module can never be forgotten here. */
const CACHE = 'mcvalet-v2.9.0';
importScripts('js/modules.js'); // defines MCV_MODULES
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png', 'icons/favicon-64.png', 'fonts/PressStart2P-Regular.ttf', 'fonts/fusion-pixel-zh.ttf', 'fonts/fusion-pixel-ja.ttf', 'fonts/fusion-pixel-ko.ttf', 'js/modules.js', ...MCV_MODULES.map(m => 'js/' + m)];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
