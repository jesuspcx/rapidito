const CACHE_NAME = 'rapidito-v3.4';
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icono.png',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Instalación: Pre-cachear activos principales
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                CORE_ASSETS.map(url => cache.add(url).catch(err => console.warn('No se pudo pre-cachear:', url)))
            );
        }).then(() => self.skipWaiting())
    );
});

// Activación: Limpiar cachés viejas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME && !key.startsWith('rapidito-')) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Manejo seguro de Fetch (nunca retorna undefined a respondWith)
self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET' || !request.url.startsWith('http')) return;

    // 1. Teselas del mapa (OpenStreetMap): Cache-first
    if (request.url.includes('tile.openstreetmap.org')) {
        event.respondWith(
            caches.open('rapidito-tiles').then(async (cache) => {
                const cached = await cache.match(request);
                if (cached) return cached;
                try {
                    const response = await fetch(request);
                    if (response && response.status === 200) {
                        cache.put(request, response.clone());
                    }
                    return response;
                } catch (e) {
                    return cached || new Response('', { status: 408 });
                }
            })
        );
        return;
    }

    // 2. APIs de tasas y geocodificación: Network-first con fallback a caché
    if (request.url.includes('dolarapi.com') || request.url.includes('nominatim.openstreetmap.org')) {
        event.respondWith(
            fetch(request).then((networkRes) => {
                if (networkRes && networkRes.status === 200) {
                    const clone = networkRes.clone();
                    caches.open('rapidito-api').then(c => c.put(request, clone));
                }
                return networkRes;
            }).catch(() => caches.match(request))
        );
        return;
    }

    // 3. Documento principal y estáticos: Stale-While-Revalidate seguro
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const networkFetch = fetch(request).then((networkRes) => {
                if (networkRes && networkRes.status === 200) {
                    const clone = networkRes.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                }
                return networkRes;
            }).catch(() => {
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return cachedResponse;
            });

            return cachedResponse || networkFetch;
        })
    );
});