/* Mini Desktop Service Worker v3
 * Online: network-first for HTML, JS, CSS, images and JSON.
 * Offline: use an exact cached response when available.
 */
const CACHE_NAME = 'mini-desktop-network-v3';
const SHELL_URLS = ['./', './index.html', './manifest.json', './version.json'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(SHELL_URLS.map(async path => {
      try {
        const url = new URL(path, self.registration.scope);
        const response = await fetch(new Request(url.href, { cache: 'reload' }));
        if (response.ok && response.type !== 'opaque') await cache.put(url.href, response.clone());
      } catch (_) {}
    }));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('mini-desktop-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
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

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // no-store + unique URL already supplied by the version check prevents common stale hits.
      const response = await fetch(request, { cache: 'no-store' });
      if (response && response.ok && response.type !== 'opaque') {
        const key = new Request(url.href, { method: 'GET' });
        await cache.put(key, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      // Only use desktop shell for the desktop root/index request, never for an app URL.
      const root = new URL(self.registration.scope);
      const isDesktopShell = url.pathname === root.pathname || url.pathname === new URL('./index.html', root).pathname;
      if (isDesktopShell) {
        const shell = await cache.match(new URL('./index.html', root).href);
        if (shell) return shell;
      }
      return new Response('网络不可用，且此资源尚无离线缓存。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
  })());
});
