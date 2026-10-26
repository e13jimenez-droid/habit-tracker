// Service Worker for Habit Tracker PWA
// Caches index.html and manifest.json for offline use.

const CACHE_NAME = 'habit-tracker-v1';
const CACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install: pre-cache the core assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first strategy for same-origin requests, network fallback
self.addEventListener('fetch', function(event) {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // Update cache in background
        fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(function() {});
        return cached;
      }
      // Not in cache, try network
      return fetch(event.request).then(function(response) {
        // Cache successful same-origin responses
        if (response && response.status === 200 && 
            new URL(event.request.url).origin === self.location.origin) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback — if requesting navigation and we have index.html cached
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});