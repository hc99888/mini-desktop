// ===============================
// 极速强制更新（最强版本）
// ===============================
self.addEventListener("install", event => {
  self.skipWaiting(); // 新版本立即接管
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim()); // 所有页面立即使用新版本
});

// ===============================
// 完全禁用缓存（永远最新）
// ===============================
// 任何请求都直接走网络，失败才走缓存
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        return response; // 网络成功 → 最新文件
      })
      .catch(() => caches.match(event.request)) // 网络失败 → 缓存兜底
  );
});
