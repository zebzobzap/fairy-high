const CACHE = 'fairy-high-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith('fairy-high-') && key !== CACHE)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const scopePath = new URL(self.registration.scope).pathname;

  // Pixel Ball Racers has its own, narrower service-worker scope.
  if (url.origin !== self.location.origin || url.pathname.startsWith(scopePath + 'pixel-racers/')) return;

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        const copy = response.clone();
        cache.put(event.request, copy);
        return response;
      }))
    )
  );
});
