/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'procart-cache-v1';

// When the app is installed, cache the main pages
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// The Magic: Intercept all requests!
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests (like fetching products). We don't cache POST (like buying a product).
    if (event.request.method !== 'GET') return;

    event.respondWith(
        // 1. Try to fetch the data from the internet (Your Java Backend)
        fetch(event.request)
            .then((response) => {
                // If successful, clone the response and save it to the cache!
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // 2. IF THE INTERNET FAILS (Offline Mode), serve the saved data from the cache!
                return caches.match(event.request);
            })
    );
});