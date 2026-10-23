# 迷你桌面：快速更新版

此包基于现有桌面 HTML，保留原来的应用清单、图标排列、滑屏和长按拖拽功能，主要调整 Service Worker 的资源更新策略。

## 文件
- `index.html`：桌面完整页面
- `sw.js`：网络优先的 Service Worker；联网时优先请求最新资源，成功后更新缓存，离线时回退到缓存
- `manifest.json`：PWA 安装配置
- `icon-192.png`、`icon-512.png`：桌面安装图标（可替换为你自己的图标，但文件名需保持一致）
- `.nojekyll`：GitHub Pages 辅助文件

## 部署步骤
1. 先备份 GitHub 仓库根目录当前的 `index.html`、`sw.js`、`manifest.json` 和图标。
2. 将本包中的同名文件上传/覆盖到**与原桌面相同的仓库根目录**。不要覆盖 `apps/` 文件夹，也不要删除已有应用文件。
3. 等 GitHub Pages 部署完成后，在手机上联网打开原桌面一次。新版 Service Worker 会检查更新并接管页面；若已有旧 Service Worker 控制页面，代码会在新控制器接管时自动重载。
4. 若旧版仍持续显示，在同一桌面网址后临时加上 `?reset=1` 打开一次（例如 `https://你的用户名.github.io/仓库名/?reset=1`），它会清除旧 Cache Storage 并注销旧 Service Worker，然后再打开桌面。请确保使用的是实际桌面地址；GitHub Pages 项目站点路径可能带仓库名。
5. 重新从手机主屏幕打开桌面，再测试更新书签应用。

## 重要说明
- 该版本会在联网时优先请求最新页面、JS、CSS、图片等同源资源，并给请求添加时间戳参数，减少同 URL 旧资源被重复命中的机会。网络请求失败时仍会尝试缓存，保留基本离线能力。
- `cache: no-store` 与时间戳不能保证绕过所有第三方代理/CDN配置，但可以避开常见的浏览器 HTTP 缓存和相同 URL 缓存命中。
- 如果“书签应用”自身目录中另有注册 Service Worker 的 `sw.js`，该应用级 Worker 可能比根目录 Worker 具有更具体的控制范围；届时也需要检查应用自己的 Worker。
- `index.html` 的 `BUILD` 已更新为 `2026-10-23-v2`。以后桌面本身每次发版时应继续修改 `BUILD`。
- 该包只处理桌面端与根目录 Service Worker，不会修改超级工厂或任何 `apps/书签应用/` 的业务代码。
