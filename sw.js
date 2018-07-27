importScripts('js/idb.js');

const CACHE_NAME = 'restaurants-cache-v1';

/**
 * Try to send the request to Internet. If not possible, enqueue locally and
 * respond something.
 * @param  {[Request]} req         Request to be send
 * @param  {[Response]} defaultRes Default response when offline
 * @return {[Promise]}
 */
const tryOrEnqueue = (req, defaultRes) => {
    if (!navigator.onLine) {
        return enqueue(req).then(res => {
            return defaultRes.clone();
        });
    }
    return flushQueue().then(() => {
        return fetch(req);
    })
    .then(response => {
        return response;
    })
    .catch(() => {
        return defaultRes.clone();
    });
};

/**
 * Serialize a request
 * @param  {[Request]} request
 * @return {[Object]}           Object of serialized request data.
 */
const serialize = (request) => {
    var headers = {};
    for (var entry of request.headers.entries()) {
        headers[entry[0]] = entry[1];
    }
    var serialized = {
        url: request.url,
        headers: headers,
        method: request.method,
        mode: request.mode,
        credentials: request.credentials,
        cache: request.cache,
        redirect: request.redirect,
        referrer: request.referrer
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return request.clone().text().then(function(body) {
            if (body) serialized.body = JSON.parse(body);
            return Promise.resolve(serialized);
        });
    }
    return Promise.resolve(serialized);
};

/**
 * Deserialize a serialized request.
 * @param  {[type]} data
 * @return {[Request]}
 */
const deserialize = (data) => {
    if (data.body) data.body = JSON.stringify(data.body);
    return Promise.resolve(new Request(data.url, data));
};

/**
 * Enqueue a request in indexeddb database.
 * @param  {[Request]} req
 * @return {[Object]}       serialized request object.
 */
const enqueue = (req) => {
    return idb.open('restaurants-data').then(function (db) {
        return serialize(req).then((serialized) => {
            let tx = db.transaction('enqueued-requests', 'readwrite');
            let store = tx.objectStore('enqueued-requests');
            store.put(serialized);
            return serialized;
        });
    });
};

/**
 * Flush locally enqueued request
 * @return {[Promise]}
 */
const flushQueue = () => {
    return idb.open('restaurants-data').then(function (db) {
        let tx = db.transaction('enqueued-requests', 'readwrite');
        let store = tx.objectStore('enqueued-requests');
        return store.getAll().then((requests) => {
            if (!requests.length) return Promise.resolve();
            var sending = requests.reduce(function(prevPromise, serialized) {
                return prevPromise.then(function() {
                    return deserialize(serialized).then(function(request) {
                        return fetch(request);
                    });
                });
            }, Promise.resolve());
            return sending;

        }).then(() => {
            let tx = db.transaction('enqueued-requests', 'readwrite');
            let store = tx.objectStore('enqueued-requests');
            return store.clear();
        });
    });
}

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll([
                'index.html',
                'restaurant.html',
                'js/main.js',
                'js/restaurant_info.js',
                'js/dbhelper.js',
                'js/idb.js',
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
            return event.respondWith(caches.match('/index.html'));
        } else if (requestUrl.pathname.includes('restaurant.html')) {
            return event.respondWith(caches.match('/restaurant.html'));
        }
    }
    if ((event.request.url === 'http://localhost:1337/reviews/' &&
    event.request.method === 'POST')) {
        // try or enqueue
        return event.respondWith(tryOrEnqueue(event.request, new Response(null, {
            status: 202
        })));
    } else if (event.request.url.startsWith('http://localhost:1337/restaurants/') &&
    event.request.method === 'PUT') {
        return event.respondWith(tryOrEnqueue(event.request, new Response(null, {
            status: 202
        })));
    }
    return event.respondWith(caches.match(event.request).then(function(response) {
        return response || fetch(event.request).then((response) => {
            // Prevent caching map images and JSON data from our server
            if (requestUrl.origin === 'https://api.tiles.mapbox.com' ||
            requestUrl.origin === 'http://localhost:1337') return response;
            return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response.clone());
                return response;
            });
        }).catch((err) => {
            console.log(err);
            return new Response({
                status: 202
            });
        });
    }))
});

self.addEventListener('message', function(event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    if (event.data.status === 'online') {
        flushQueue();
    }
});
