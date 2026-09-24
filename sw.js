/*
 * SERVICE WORKER — lets the app open with no signal (e.g. a basement gym).
 *
 * Like a backpack: every time you load the app online, it packs a fresh copy.
 * When the network is down, it serves the copy from the backpack instead.
 * "Network first" means you always get the newest version when online.
 */
const CACHE = 'jj-flow-v4';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/data.js', 'js/graph.js', 'js/panel.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
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
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;  // e.g. YouTube: leave alone
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
