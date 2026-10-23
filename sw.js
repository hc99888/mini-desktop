const CACHE = 'mini-desktop-core-v1';
const CORE = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.map(async path => {
      try {
        const response = await fetch(path);
        if (response.ok) await cache.put(path, response);
      } catch (_) {}
    }));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isDoc = request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (url.searchParams.has('v') && isDoc) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (isDoc) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async response => {
      if (response && response.ok && response.type !== 'opaque') {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    }).catch(() => null);
    return cached || await network || new Response('', { status: 504 });
  })());
});
