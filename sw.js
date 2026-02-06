const CACHE_NAME = 'exam-cache-v16';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './exam.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  // Optional: Delete old caches here if needed, but for now simple version bump is enough
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
