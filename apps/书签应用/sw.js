// ===============================
// 1. 强制立即更新（PWA 自动刷新）
// ===============================
self.addEventListener("install", event => {
  // 跳过等待，立即启用新版本 SW
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  // 立即接管所有客户端
  event.waitUntil(self.clients.claim());
});

// ===============================
// 2. 缓存静态资源（适配 GitHub Pages）
// ===============================

// 自动获取当前路径前缀（适配 GitHub Pages 的子路径）
const BASE = self.location.pathname.replace(/\/sw\.js$/, "");

// 每次更新版本号必须变化，否则旧缓存不会清理
const CACHE_NAME = "bookmark-cache-v3";

// 需要缓存的文件
const FILES = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/icon-192.png`,
  `${BASE}/icon-512.png`
];

// 安装时缓存文件
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
});

// ===============================
// 3. 网络优先策略（解决不同步问题）
// ===============================
// 逻辑：
// 1. 先访问网络（获取最新版本）
// 2. 网络失败时才使用缓存（离线可用）
// ===============================
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(res => {
        return res; // 网络成功 → 使用最新文件
      })
      .catch(() => caches.match(event.request)) // 网络失败 → 使用缓存
  );
});
