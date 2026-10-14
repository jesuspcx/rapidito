const CACHE_NAME = 'rapidito-pwa-v3.2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icono.png',
    './css/styles.css',
    './js/routes-data.js',
    './js/rates.js',
    './js/geo.js',
    './js/app.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Instalación: Pre-cacheados de los recursos críticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-cacheando App Shell y recursos estáticos');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[Service Worker] Error pre-cacheando algunos recursos:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activación: Limpieza de versiones antiguas de caché
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Eliminando caché antigua:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Estrategias inteligentes según el tipo de solicitud
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // 1. Ignorar solicitudes que no sean GET (como POST o extensiones de Chrome)
    if (request.method !== 'GET' || !request.url.startsWith('http')) {
        return;
    }

    // 2. Map Tiles (OpenStreetMap): Cache First con caducidad / fallback
    if (url.hostname.includes('tile.openstreetmap.org')) {
        event.respondWith(
            caches.open('rapidito-map-tiles').then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    return fetch(request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => cachedResponse);
                });
            })
        );
        return;
    }

    // 3. APIs externas (DolarAPI, Nominatim): Network First con fallback a caché
    if (url.hostname.includes('dolarapi.com') || url.hostname.includes('nominatim.openstreetmap.org')) {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open('rapidito-api-cache').then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // 4. Recursos estáticos locales y CDN: Stale-While-Revalidate / Cache First
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return networkResponse;
            }).catch(() => {
                // Si la red falla y es navegación HTML, retornar index.html
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });

            return cachedResponse || fetchPromise;
        })
    );
});