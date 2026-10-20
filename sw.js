// ============================================================
// 迷你桌面 Service Worker
// 策略：HTML 网络优先（no-store 穿透 HTTP 缓存）+ 静态资源缓存优先
// ============================================================

const CACHE = 'mini-desktop-core-v1';

const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(CORE.map(url => c.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 只处理同源请求，外链（比如 app 里的 CDN 资源）不拦
  if (url.origin !== self.location.origin) return;

  const isDoc =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html');

  // ★ 版本自检请求（带 ?v=时间戳）：绝不走缓存，直接网络
  if (url.searchParams.has('v') && isDoc){
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  if (isDoc){
    // ★ HTML 一律 no-store：跳过浏览器 HTTP 缓存，永远拿服务器最新
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy)).catch(()=>{});
          return res;
        })
        .catch(() =>
          caches.match(event.request).then(r => r || caches.match('./index.html'))
        )
    );
  } else {
    // 静态资源：缓存优先 + 后台更新
    event.respondWith(
      caches.match(event.request).then(cached => {
        const network = fetch(event.request)
          .then(res => {
            caches.open(CACHE).then(c => c.put(event.request, res.clone())).catch(()=>{});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});