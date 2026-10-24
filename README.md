迷你桌面 + 超级工厂：版本清单与网络优先更新版

文件说明
- index.html：桌面完整代码，基于你提供的“桌面端.html”优化，保留原有 APPS 列表、图标布局、分页、长按拖动、window.open(app.url, '_blank') 打开方式。
- sw.js：同源 GET 资源采用网络优先策略，在线时请求最新 HTML/JS/CSS/图片/JSON；网络失败时只回退到精确缓存，不会把桌面首页错误显示成某个 APP。
- super-factory-index.html：基于你提供的超级工厂源码，仅在手动上传和自动上传链上传完成后追加更新 version.json 的步骤。
- version.json：初始模板。首次上传成功后超级工厂会自动创建/更新仓库中的 version.json。

部署建议（先备份原文件）
1. 把 index.html 和 sw.js 覆盖到 GitHub Pages 当前桌面发布目录。不要覆盖原有图标，也不要删除 apps/。
2. 将 super-factory-index.html 的内容用于替换超级工厂当前的 HTML 源码/部署文件。它保留原有功能，只额外在应用文件上传成功后更新 version.json。
3. 正常情况下不需要手动上传 version.json，超级工厂会自动创建。只有仓库根目录还没有 version.json 时，才可上传本包模板；如果已经存在 version.json，绝对不要用空模板覆盖它。
4. 等 GitHub Pages 部署后，先用普通浏览器打开桌面网址一次，让新的 Service Worker 安装并接管；再关闭桌面，重新从主屏幕打开。
5. 第一次部署旧 Service Worker 时，若仍旧，可以在桌面网址后加 ?reset=1 打开一次（旧源码保留此清理入口）；之后再正常打开。

更新机制
- 超级工厂每次成功上传至少一个应用文件后，更新根目录 version.json 中该应用的 version 和 updatedAt。
- 桌面启动时读取 version.json（附加随机参数并使用 no-store），网络失败不会影响桌面启动。
- 应用本身打开仍使用原来的链接方式，不额外拼接 __open 参数；根目录 Service Worker 在线时对同源资源采用网络优先，避免先展示旧 app.js/style.css。
- version.json 是更新检测清单，不负责直接替换应用文件；实际新文件仍由超级工厂上传至 apps/<应用名>/。

重要限制
- 我在当前环境做了静态代码检查，没有连接你的实际 GitHub 仓库或手机做端到端验证。
- 如果某个 APP 目录内部还注册了自己的 Service Worker，它可能覆盖根目录 SW 的部分行为；如果仍旧，需检查该 APP 自己的 SW。
- GitHub Pages/CDN 的发布延迟无法仅靠前端代码完全消除，但本方案会绕过常见浏览器缓存命中，并在部署完成后尽快读取新版本。
