// 获取元素
const input = document.getElementById("appNameInput");
const btn = document.getElementById("generateBtn");
const result = document.getElementById("result");

// 点击按钮时执行
btn.addEventListener("click", async () => {
  const name = input.value.trim();

  if (!name) {
    result.textContent = "请输入 App 名称";
    return;
  }

  // 生成文件内容
  const indexHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <h1>${name}</h1>
  <p>这是自动生成的 App 模板。</p>
  <script src="app.js"></script>
</body>
</html>
`;

  const styleCss = `
body {
  font-family: Arial;
  padding: 20px;
}
h1 {
  color: #4A90E2;
}
`;

  const appJs = `
// ${name} 的脚本
console.log("${name} App 已加载");
`;

  // 生成图标（取名称第一个字）
    // 生成蓝科技风图标（取名称第一个字）
  const firstChar = name[0] || "A";

  const iconSvg = `
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4A90E2"/>
      <stop offset="100%" stop-color="#357ABD"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="100" height="100" rx="22" fill="url(#grad)"/>

  <text x="50" y="60"
        font-size="42"
        text-anchor="middle"
        fill="white"
        font-family="Arial"
        filter="url(#glow)">
    ${firstChar}
  </text>
</svg>
`;

  // 创建 ZIP
  const zip = new JSZip();
  const folder = zip.folder(name);

  folder.file("index.html", indexHtml);
  folder.file("style.css", styleCss);
  folder.file("app.js", appJs);
  folder.file("icon.svg", iconSvg);

  // 生成 ZIP 并下载
  const content = await zip.generateAsync({ type: "blob" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = `${name}.zip`;
  a.click();

  // 显示 apps.json 配置
  result.innerHTML = `
    <p>已生成并下载：${name}.zip</p>

    <p><strong>请把下面这段复制到 apps.json：</strong></p>

    <pre>{
  "id": "${name}",
  "name": "${name}",
  "icon": "apps/${name}/icon.svg",
  "entry": "apps/${name}/index.html",
  "category": "tools",
  "description": "自动生成的 App"
}</pre>
  `;
});
