// ==========================================
// 🚀 PROCART ELITE GHOST SERVER (V2.0)
// ==========================================

const CACHE_VERSION = 'v2.0.0';
const SHELL_CACHE = `procart-shell-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `procart-dynamic-${CACHE_VERSION}`;
const API_CACHE = `procart-api-${CACHE_VERSION}`;

// 📦 Core assets to cache immediately upon installation
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// ⚙️ 1. INSTALLATION: Wake up and download the App Shell
self.addEventListener('install', (event) => {
    console.log('[Ghost Server] 🟢 Installing Engine...');
    self.skipWaiting(); // Force the browser to activate this immediately
    
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => {
            console.log('[Ghost Server] 📦 Caching Core App Shell');
            return cache.addAll(APP_SHELL);
        })
    );
});

// ⚙️ 2. ACTIVATION: Clean up old cache versions
self.addEventListener('activate', (event) => {
    console.log('[Ghost Server] ⚡ Engine Activated!');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (![SHELL_CACHE, DYNAMIC_CACHE, API_CACHE].includes(cache)) {
                        console.log('[Ghost Server] 🧹 Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Take control of all open tabs instantly
});

// ⚙️ 3. THE INTERCEPTOR: Route traffic based on Elite Strategies
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // 🛑 BYPASS RULES: Ignore non-GET requests, WebSockets, and Extensions
    if (req.method !== 'GET' || req.url.startsWith('chrome-extension') || req.url.includes('/ws')) {
        return; 
    }

    // 🌐 STRATEGY A: Backend APIs -> Network First, Fallback to Cache
    if (url.pathname.startsWith('/api') || url.port === '8080') {
        event.respondWith(
            fetch(req)
                .then((networkResponse) => {
                    // If online, save a fresh copy to the API Cache silently
                    const responseClone = networkResponse.clone();
                    caches.open(API_CACHE).then((cache) => {
                        cache.put(req, responseClone);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // IF OFFLINE: Serve from the cache! No dinosaur screen.
                    console.warn(`[Ghost Server] ⚠️ Offline! Serving ${url.pathname} from Cache.`);
                    return caches.match(req);
                })
        );
        return;
    }

    // 🖼️ STRATEGY B: Images & Media -> Cache First, Fallback to Network
    if (req.destination === 'image' || url.pathname.includes('/uploads/')) {
        event.respondWith(
            caches.match(req).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse; // Instant load from hard drive
                
                return fetch(req).then((networkResponse) => {
                    const responseClone = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(req, responseClone);
                    });
                    return networkResponse;
                }).catch(() => {
                    // Optional: Return a generic "Image not found" placeholder here if totally offline
                    console.warn('[Ghost Server] Image unavailable offline.');
                });
            })
        );
        return;
    }

    // 📄 STRATEGY C: React Navigation (HTML/JS/CSS) -> Network First, Fallback to Index.html
    event.respondWith(
        fetch(req)
            .then((networkResponse) => {
                const responseClone = networkResponse.clone();
                caches.open(SHELL_CACHE).then((cache) => {
                    cache.put(req, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                return caches.match(req).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    
                    // If all fails and user is navigating, serve the core React shell
                    if (req.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});