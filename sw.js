const CACHE_NAME = 'exam-cache-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './exam.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
