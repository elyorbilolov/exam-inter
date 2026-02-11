const CACHE_NAME = 'exam-cache-v30';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './exam.json',
  './writing.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-First Strategy for better updates
  event.respondWith(
    fetch(event.request).then((response) => {
      // If network works, update cache
      if (response && response.status === 200) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      // If network fails, serve from cache
      return caches.match(event.request);
    })
  );
});
