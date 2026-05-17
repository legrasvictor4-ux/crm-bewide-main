const CACHE_NAME = 'bewide-static-v2';
const DYNAMIC_CACHE = 'bewide-dynamic-v1';
const OFFLINE_URL = '/offline.html';
const API_CACHE = 'bewide-api-v1';

const STATIC_ASSETS = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME && key !== DYNAMIC_CACHE && key !== API_CACHE) {
              return caches.delete(key);
            }
          })
        )
      ),
      clients.claim(),
    ])
  );
});

function isApiRequest(url) {
  try {
    const u = new URL(url);
    return u.pathname.startsWith('/api/');
  } catch { return false; }
}

function isStaticAsset(url) {
  const u = new URL(url);
  const ext = u.pathname.split('.').pop();
  return ['js', 'css', 'woff2', 'woff', 'ttf', 'png', 'jpg', 'svg', 'ico', 'webp'].includes(ext);
}

function networkFirst(request, timeoutMs = 5000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
  );

  return Promise.race([
    fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    }),
    timeoutPromise,
  ]).catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)));
}

function staleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const fetchPromise = fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => cached);
    return cached || fetchPromise;
  });
}

function cacheOnly(request) {
  return caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL));
}

function networkOnlyWithRetry(request) {
  const MAX_RETRIES = 2;
  let attempt = 0;

  const doFetch = () =>
    fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(API_CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    });

  const tryFetch = () =>
    doFetch().catch((err) => {
      attempt++;
      if (attempt <= MAX_RETRIES) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(tryFetch()), Math.pow(2, attempt) * 1000)
        );
      }
      throw err;
    });

  return tryFetch();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  if (isApiRequest(url)) {
    if (request.method === 'GET') {
      event.respondWith(networkFirst(request, 8000));
    } else {
      event.respondWith(networkOnlyWithRetry(request));
    }
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(cacheOnly(request));
    return;
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(DYNAMIC_CACHE);
    caches.delete(API_CACHE);
  }
});
