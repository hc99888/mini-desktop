// ====== 基本元素 ======
const input = document.getElementById("appNameInput");
const templateType = document.getElementById("templateType");
const iconStyle = document.getElementById("iconStyle");
const generateBtn = document.getElementById("generateBtn");
const previewBtn = document.getElementById("previewBtn");
const uploadGithubCheckbox = document.getElementById("uploadGithub");
const result = document.getElementById("result");

// ====== 蓝科技风基础样式 ======
const baseStyle = `
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial;
  background: #f5f7fa;
  padding: 20px;
  color: #333;
}

h1 {
  color: #4A90E2;
  margin-bottom: 20px;
}

button {
  padding: 12px 20px;
  font-size: 16px;
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.2s;
}

button:active {
  transform: scale(0.97);
}

button:hover {
  opacity: 0.9;
}

.card {
  background: white;
  padding: 20px;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin-bottom: 20px;
}
`;

// ====== 生成模板内容（根据类型） ======
function buildTemplate(name, type) {
  let indexHtml = "";
  let styleCss = baseStyle;
  let appJs = "";

  // 工具类模板
  if (type === "tool") {
    indexHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <div class="card">
    <h1>${name}</h1>

    <button id="btn">点击按钮</button>

    <div class="card" style="margin-top: 20px;">
      <p id="output">这里将显示输出内容</p>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
`;

    appJs = `
document.getElementById("btn").addEventListener("click", () => {
  document.getElementById("output").textContent = "按钮已点击";
});
`;
  }

  // 页面类模板
  if (type === "page") {
    indexHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <div class="card">
    <h1>${name}</h1>
    <p>这是一个页面类模板，你可以在这里写内容。</p>
  </div>

  <script src="app.js"></script>
</body>
</html>
`;

    appJs = `
// 页面类模板脚本
console.log("${name} 页面已加载");
`;
  }

  // 系统类模板
  if (type === "system") {
    indexHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <header class="nav" style="
    background: linear-gradient(135deg, #4A90E2, #357ABD);
    color: white;
    padding: 15px;
    font-size: 18px;
  ">系统导航栏</header>

  <main>
    <div class="card">
      <h1>${name}</h1>
      <p>这是一个系统类模板，适合做设置页、管理页。</p>
    </div>
  </main>

  <script src="app.js"></script>
</body>
</html>
`;

    styleCss = baseStyle + `
.nav {
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  color: white;
  padding: 15px;
  font-size: 18px;
}
main { padding: 20px; }
`;

    appJs = `
// 系统类模板脚本
console.log("${name} 系统模板已加载");
`;
  }

  // 表单模板
  if (type === "form") {
    indexHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <div class="card">
    <h1>${name}</h1>
    <form id="form">
      <div class="card">
        <label>输入内容：</label>
        <input id="formInput" type="text" placeholder="在这里输入..." />
      </div>
      <button type="submit">提交</button>
    </form>

    <div class="card" style="margin-top: 20px;">
      <p id="formOutput">这里将显示表单提交结果</p>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
`;

    appJs = `
document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = document.getElementById("formInput").value.trim();
  document.getElementById("formOutput").textContent = v ? ("你提交了：" + v) : "你没有输入内容";
});
`;
  }

  // 列表模板
  if (type === "list") {
    indexHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <div class="card">
    <h1>${name}</h1>
    <div class="card">
      <input id="itemInput" type="text" placeholder="输入一项内容，回车或点击添加" />
      <button id="addItemBtn" style="margin-top: 10px;">添加</button>
    </div>

    <div class="card" style="margin-top: 20px;">
      <ul id="list"></ul>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
`;

    styleCss = baseStyle + `
ul { padding-left: 20px; }
li { margin-bottom: 6px; }
`;

    appJs = `
const inputEl = document.getElementById("itemInput");
const listEl = document.getElementById("list");
const addBtn = document.getElementById("addItemBtn");

function addItem() {
  const v = inputEl.value.trim();
  if (!v) return;
  const li = document.createElement("li");
  li.textContent = v;
  listEl.appendChild(li);
  inputEl.value = "";
}

addBtn.addEventListener("click", addItem);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addItem();
  }
});
`;
  }

  return { indexHtml, styleCss, appJs };
}

// ====== 图标生成（多风格） ======
function buildIconSvg(name, style) {
  const firstChar = name[0] || "A";

  // 蓝科技风
  if (style === "blue") {
    return `
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4A90E2"/>
      <stop offset="100%" stop-color="#357ABD"/>
    </linearGradient>
    <filter id="glowBlue">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="100" height="100" rx="22" fill="url(#gradBlue)"/>

  <text x="50" y="60"
        font-size="42"
        text-anchor="middle"
        fill="white"
        font-family="Arial"
        filter="url(#glowBlue)">
    ${firstChar}
  </text>
</svg>
`;
  }

  // 黑金风
  if (style === "blackgold") {
    return `
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F5D76E"/>
      <stop offset="100%" stop-color="#F0A500"/>
    </linearGradient>
  </defs>

  <rect width="100" height="100" rx="22" fill="#111111"/>
  <rect x="6" y="6" width="88" height="88" rx="20" fill="none" stroke="url(#gradGold)" stroke-width="3"/>

  <text x="50" y="60"
        font-size="40"
        text-anchor="middle"
        fill="url(#gradGold)"
        font-family="Arial">
    ${firstChar}
  </text>
</svg>
`;
  }

  // 圆形图标
  if (style === "circle") {
    return `
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" fill="#4A90E2"/>
  <text x="50" y="60"
        font-size="40"
        text-anchor="middle"
        fill="white"
        font-family="Arial">
    ${firstChar}
  </text>
</svg>
`;
  }

  // 渐变圆形
  if (style === "gradientCircle") {
    return `
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradCircle" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4A90E2"/>
      <stop offset="100%" stop-color="#9B59B6"/>
    </linearGradient>
  </defs>

  <circle cx="50" cy="50" r="45" fill="url(#gradCircle)"/>

  <text x="50" y="60"
        font-size="40"
        text-anchor="middle"
        fill="white"
        font-family="Arial">
    ${firstChar}
  </text>
</svg>
`;
  }

  // 默认回退：蓝科技风
  return buildIconSvg(name, "blue");
}

// ====== 预览模板（新窗口） ======
function previewTemplate(name, type) {
  const { indexHtml, styleCss, appJs } = buildTemplate(name, type);

  const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${name} - 预览</title>
<style>
${styleCss}
</style>
</head>
<body>
${indexHtml
  .replace('<link rel="stylesheet" href="style.css" />', "")
  .replace('<script src="app.js"></script>', "")}
<script>
${appJs}
</script>
</body>
</html>
`;

  const blob = new Blob([fullHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

// ====== GitHub 上传（预留，可选） ======
async function uploadToGithubIfNeeded(name, type, files) {
  if (!uploadGithubCheckbox.checked) return;

  // 这里是预留逻辑：你需要自己填入 Token / 仓库 / 分支 / 目录
  const GITHUB_TOKEN = ""; // 在这里填入你的 GitHub Token
  const REPO = "";         // 例如 "yourname/yourrepo"
  const BRANCH = "main";   // 分支名
  const BASE_PATH = "apps"; // 仓库中存放 app 的目录

  if (!GITHUB_TOKEN || !REPO) {
    alert("请先在 app.js 中配置 GitHub Token 和 REPO 信息，然后再勾选上传。");
    return;
  }

  // 下面是一个示意实现（单文件上传），你可以按需扩展为多文件上传
  // 这里先简单 console.log，避免误操作
  console.log("准备上传到 GitHub：", { name, type, files, REPO, BRANCH, BASE_PATH });
  alert("GitHub 上传逻辑已预留，请根据需要在 app.js 中完善实现。");
}

// ====== 生成并下载 ======
generateBtn.addEventListener("click", async () => {
  const name = input.value.trim();
  const type = templateType.value;
  const iconStyleValue = iconStyle.value;

  if (!name) {
    result.textContent = "请输入 App 名称";
    return;
  }

  const { indexHtml, styleCss, appJs } = buildTemplate(name, type);
  const iconSvg = buildIconSvg(name, iconStyleValue);

  const zip = new JSZip();
  const folderName = `${type}-${name}`;
  const folder = zip.folder(folderName);

  folder.file("index.html", indexHtml);
  folder.file("style.css", styleCss);
  folder.file("app.js", appJs);
  folder.file("icon.svg", iconSvg);

  const content = await zip.generateAsync({ type: "blob" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = `${folderName}.zip`;
  a.click();

  // apps.json 配置
  result.innerHTML = `
  <p>已生成并下载：${folderName}.zip</p>
  <p><strong>模板类型：</strong> ${type}</p>
  <p><strong>图标风格：</strong> ${iconStyleValue}</p>

  <p><strong>请把下面这段复制到 apps.json：</strong></p>

  <pre>{
  "id": "${name}",
  "name": "${name}",
  "icon": "apps/${name}/icon.svg",
  "entry": "apps/${name}/index.html",
  "type": "${type}",
  "category": "tools",
  "description": "自动生成的 App"
}</pre>
`;

  // 可选：尝试上传到 GitHub（预留）
  await uploadToGithubIfNeeded(name, type, {
    "index.html": indexHtml,
    "style.css": styleCss,
    "app.js": appJs,
    "icon.svg": iconSvg
  });
});

// ====== 预览按钮 ======
previewBtn.addEventListener("click", () => {
  const name = input.value.trim();
  const type = templateType.value;

  if (!name) {
    result.textContent = "请输入 App 名称再预览";
    return;
  }

  previewTemplate(name, type);
});
