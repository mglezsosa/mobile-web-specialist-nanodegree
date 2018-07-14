const CACHE_NAME = 'restaurants-cache-v1';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll([
                'index.html',
                'restaurant.html',
                'data/restaurants.json',
                'js/main.js',
                'js/restaurant_info.js',
                'js/dbhelper.js',
                'js/common.js',
                'css/styles.css',
                'css/media-queries.css',
                'css/snackbar.min.css'
            ])
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName.startsWith('restaurants-cache') &&
                    cacheName != CACHE_NAME;
                }).map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function(event) {
    let requestUrl = new URL(event.request.url);
    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname === '/') {
            event.respondWith(caches.match('/index.html'));
        } else if (requestUrl.pathname.includes('restaurant.html')) {
            event.respondWith(caches.match('/restaurant.html'));
        }
    }
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request).then((response) => {
                // Prevent caching map images
                if (requestUrl.origin === 'https://api.tiles.mapbox.com') return response;
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            })
        })
    )
});

self.addEventListener('message', function(event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
