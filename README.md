这个“迷你桌面”涵盖文件结构、配置格式、功能说明和常见问题。

> 一个纯前端、可离线使用的 Web 应用启动中心。  
> 桌面完全由 `configuration.json` 驱动，支持分页、拖拽排序、下拉刷新，适配手机与桌面。

---

## 1. 文件结构
项目根目录/
├── index.html # 主页面（本文档对应的文件）

├── manifest.json # PWA 清单（可选）

├── sw.js # Service Worker（可选，仅 HTTPS/localhost 生效）

├── configuration.json # 应用配置文件（必需，否则桌面为空）

└── apps/ # 应用目录（可选，按需存放各应用与图标）

├── xxx/

│ ├── index.html

│ └── icon.webp

├── xxx/

│ └── ...

└── ...

**说明：**
- `configuration.json` 是桌面数据的唯一来源。没有它，桌面保持空白。
- `manifest.json` 和 `sw.js` 用于 PWA 安装与离线壳缓存，不影响桌面功能，可删。
- `apps/` 目录下的应用页面与图标路径，需与配置文件中的 `url` / `icon` 对应。

---

## 2. 配置文件格式

### 2.1 基本结构

`configuration.json` 必须是一个 **JSON 数组**，每个元素代表一个应用：

```json
[
  {
    "name": "xxx",
    "icon": "apps/xxx/icon.webp",
    "url": "apps/xxx/"
  },
  {
    "name": "xxx",
    "icon": "apps/xxx/icon.webp",
    "url": "apps/xxx/"
  }
]
