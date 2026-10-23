/* 迷你桌面：即时更新优先的 Service Worker
 * 策略：所有同源 GET 资源网络优先；网络成功则更新缓存；断网才回退缓存。
 * 为避免浏览器/CDN 对同一静态 URL 返回旧副本，网络请求附加时间戳参数。
 */
const CACHE_NAME = 'mini-desktop-network-first-v2';
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE_FILES.map(async (path) => {
      try {
        const url = new URL(path, self.registration.scope);
        url.searchParams.set('__precache', String(Date.now()));
        const response = await fetch(url.href, { cache: 'no-store' });
        if (response.ok) await cache.put(path, response.clone());
      } catch (_) {
        // 单个文件失败不阻止 Service Worker 安装
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('mini-desktop-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const originalURL = new URL(request.url);
  if (originalURL.origin !== self.location.origin) return;
  // Service Worker 脚本自身由浏览器负责更新，不在此处代理。
  if (originalURL.pathname.endsWith('/sw.js')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const networkURL = new URL(request.url);
    networkURL.searchParams.set('__fresh', String(Date.now()));

    try {
      const response = await fetch(networkURL.href, {
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'follow'
      });
      if (response && response.ok && response.status === 200) {
        try { await cache.put(request, response.clone()); } catch (_) {}
      }
      return response;
    } catch (error) {
      // 断网或请求失败时回退缓存，保持已访问过的页面可离线打开。
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      // 根桌面可回退到已缓存的 index.html；未知子应用不错误地显示桌面首页。
      const rootPath = new URL('./', self.registration.scope).pathname;
      if (request.mode === 'navigate' && originalURL.pathname === rootPath) {
        const rootHTML = await cache.match('./index.html');
        if (rootHTML) return rootHTML;
      }
      return new Response('网络不可用，且此资源尚未缓存。请联网后重试。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
