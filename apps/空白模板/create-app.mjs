import fs from "fs";
import path from "path";
import readline from "readline";
import { createCanvas } from "canvas";

const __dirname = path.resolve();

// 路径
const APPS_DIR = path.join(__dirname, "apps");
const APPS_JSON = path.join(__dirname, "apps.json");

// 输入工具
function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (ans) => { rl.close(); resolve(ans.trim()); }));
}

// 自动生成图标（简单纯色 PNG）
function generateIcon(filePath, text = "") {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#3A7AFE"; // 蓝色背景
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 120px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, 1).toUpperCase(), size / 2, size / 2);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filePath, buffer);
}

// 写入 apps.json
function updateAppsJson(appId, title) {
  let data = [];
  if (fs.existsSync(APPS_JSON)) {
    data = JSON.parse(fs.readFileSync(APPS_JSON, "utf-8"));
  }

  data.push({
    id: appId,
    title,
    icon: `apps/${appId}/icon.png`,
    entry: `apps/${appId}/index.html`
  });

  fs.writeFileSync(APPS_JSON, JSON.stringify(data, null, 2), "utf-8");
}

async function main() {
  const appId = await ask("请输入 App 英文名称（文件夹名，例如: notes）：");
  const title = await ask("请输入 App 显示名称（例如: 记事本）：");

  if (!appId) return console.error("❌ App 名称不能为空");

  const appDir = path.join(APPS_DIR, appId);
  if (fs.existsSync(appDir)) return console.error("❌ 该 App 已存在");

  fs.mkdirSync(appDir, { recursive: true });

  // index.html
  fs.writeFileSync(
    path.join(appDir, "index.html"),
    `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="app">
    <h1>${title}</h1>
  </div>
  <script src="app.js"></script>
</body>
</html>`
  );

  // style.css
  fs.writeFileSync(
    path.join(appDir, "style.css"),
    `body {
  margin: 0;
  font-family: sans-serif;
  background: #f5f5f5;
}

#app {
  padding: 20px;
}`
  );

  // app.js
  fs.writeFileSync(
    path.join(appDir, "app.js"),
    `console.log("${title} 已加载");`
  );

  // icon.png
  generateIcon(path.join(appDir, "icon.png"), title);

  // 写入 apps.json
  updateAppsJson(appId, title);

  console.log(`\n✅ 新 App 已生成：apps/${appId}`);
  console.log(`📌 已写入 apps.json`);
  console.log(`📌 已生成图标 icon.png`);
}

main();
