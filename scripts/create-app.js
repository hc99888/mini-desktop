// scripts/create-app.js
const fs = require("fs");
const path = require("path");

// 1. 获取命令行参数：App 名称
const rawName = process.argv[2];

if (!rawName) {
  console.error("用法：node scripts/create-app.js \"App 名称\"");
  process.exit(1);
}

// 2. 生成 id（文件夹名）：转小写、空格转中划线
const appName = rawName.trim();
const appId = appName
  .toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/[^\w\-]/g, ""); // 去掉特殊字符

if (!appId) {
  console.error("App 名称不合法，无法生成 id。");
  process.exit(1);
}

// 3. 路径定义
const ROOT = path.resolve(__dirname, "..");
const appsDir = path.join(ROOT, "apps");
const appDir = path.join(appsDir, appId);
const configDir = path.join(ROOT, "config");
const appsJsonPath = path.join(configDir, "apps.json");

// 4. 确保目录存在
if (!fs.existsSync(appsDir)) fs.mkdirSync(appsDir, { recursive: true });
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

// 5. 检查 App 是否已存在
if (fs.existsSync(appDir)) {
  console.error(`App 文件夹已存在：${appDir}`);
  process.exit(1);
}

// 6. 创建 App 文件夹
fs.mkdirSync(appDir, { recursive: true });

// 7. 模板内容
const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="app-root">
    <header class="app-header">
      <h1>${appName}</h1>
    </header>
    <main class="app-main">
      <p>这里是 ${appName} 的主界面，你可以开始写功能了。</p>
      <button id="demo-btn">点我测试</button>
    </main>
  </div>
  <script src="app.js"></script>
</body>
</html>
`;

const cssTemplate = `:root {
  --app-bg: #050816;
  --app-fg: #e5e7eb;
  --app-accent: #3b82f6;
  --app-accent-soft: rgba(59, 130, 246, 0.15);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: radial-gradient(circle at top, #0f172a 0, #020617 55%, #000 100%);
  color: var(--app-fg);
}

.app-root {
  min-height: 100vh;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 12px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(15, 23, 42, 0.9));
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(16px);
}

.app-header h1 {
  margin: 0;
  font-size: 20px;
  letter-spacing: 0.04em;
}

.app-main {
  margin-top: 16px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.8);
  flex: 1;
}

#demo-btn {
  margin-top: 12px;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: radial-gradient(circle at top left, var(--app-accent-soft), rgba(15, 23, 42, 0.9));
  color: var(--app-fg);
  font-size: 14px;
  cursor: pointer;
  outline: none;
  transition: all 0.18s ease-out;
}

#demo-btn:active {
  transform: scale(0.96) translateY(1px);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.6);
}
`;

const jsTemplate = `document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("demo-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    alert("${appName} 已经就绪，可以开始写你的逻辑了。");
  });
});
`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#facc15"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="14" fill="#020617"/>
  <rect x="8" y="8" width="48" height="48" rx="12" fill="url(#grad)" opacity="0.18"/>
  <path d="M20 42 L24 22 L32 30 L40 18 L44 42 Z"
        fill="none" stroke="#e5e7eb" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

// 8. 写入文件
fs.writeFileSync(path.join(appDir, "index.html"), htmlTemplate, "utf8");
fs.writeFileSync(path.join(appDir, "style.css"), cssTemplate, "utf8");
fs.writeFileSync(path.join(appDir, "app.js"), jsTemplate, "utf8");
fs.writeFileSync(path.join(appDir, "icon.svg"), iconSvg, "utf8");

// 9. 读取 / 更新 apps.json
let apps = [];
if (fs.existsSync(appsJsonPath)) {
  try {
    const raw = fs.readFileSync(appsJsonPath, "utf8").trim();
    if (raw) {
      apps = JSON.parse(raw);
    }
  } catch (e) {
    console.error("读取 apps.json 失败，请检查 JSON 格式：", e.message);
    process.exit(1);
  }
}

// 10. 检查是否已有同 id
if (apps.some(a => a.id === appId)) {
  console.error(`apps.json 中已存在 id 为 "${appId}" 的 App。`);
  process.exit(1);
}

// 11. 追加新 App 配置
const newApp = {
  id: appId,
  name: appName,
  icon: `apps/${appId}/icon.svg`,
  entry: `apps/${appId}/index.html`,
  category: "tools",
  description: `${appName} 应用`
};

apps.push(newApp);

// 12. 写回 apps.json（格式化）
fs.writeFileSync(appsJsonPath, JSON.stringify(apps, null, 2), "utf8");

console.log("✅ 新 App 已生成：");
console.log(`- 名称: ${appName}`);
console.log(`- id: ${appId}`);
console.log(`- 目录: ${appDir}`);
console.log(`- 已写入: config/apps.json`);
