const CACHE_NAME = 'exam-cache-v92';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './security.js',
  './auth.js',
  './offline_dictionary.json',
  './beginer_speaking.json',
  './beginer_writing.json',
  './elementary_speaking.json',
  './elementary_writing.json',
  './pre-intermediate_speaking.json',
  './pre-intermediate_writing.json',
  './pre-intermediate_lesson.json',
  './intermediate_speaking.json',
  './intermediate_writing.json',
  './intermediate_reading.json'
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
  // CRITICAL: NEVER intercept or cache external third-party API calls (e.g. PubNub ps.pndsn.com)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
