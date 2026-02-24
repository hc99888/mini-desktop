import fs from "fs";
import path from "path";
import readline from "readline";

const rootDir = process.cwd();
const appsDir = path.join(rootDir, "apps");
const templateDir = path.join(appsDir, "_template");
const appsJsonPath = path.join(rootDir, "apps.json");

// 终端输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  // 1. 输入英文文件夹名 & 中文显示名
  const appId = (await ask("请输入 App 文件夹名（英文，例如 notes）：")).trim();
  const appName = (await ask("请输入 App 显示名称（中文，例如 记事本）：")).trim();
  rl.close();

  if (!appId || !appName) {
    console.error("App 名称不能为空");
    process.exit(1);
  }

  const newAppDir = path.join(appsDir, appId);
  if (fs.existsSync(newAppDir)) {
    console.error(`apps/${appId} 已存在，取消生成。`);
    process.exit(1);
  }

  // 2. 复制模板文件
  fs.mkdirSync(newAppDir, { recursive: true });

  const filesToCopy = ["index.html", "style.css", "app.js", "icon.png"];

  for (const file of filesToCopy) {
    const src = path.join(templateDir, file);
    const dest = path.join(newAppDir, file);

    if (!fs.existsSync(src)) {
      console.error(`模板缺少文件：${src}`);
      process.exit(1);
    }

    if (file.endsWith(".png")) {
      // 图标直接复制
      fs.copyFileSync(src, dest);
    } else {
      // 文本文件：替换 {{APP_NAME}}
      const content = fs.readFileSync(src, "utf-8");
      const replaced = content.replace(/{{APP_NAME}}/g, appName);
      fs.writeFileSync(dest, replaced, "utf-8");
    }
  }

  // 3. 更新 apps.json
  let apps = [];
  if (fs.existsSync(appsJsonPath)) {
    const raw = fs.readFileSync(appsJsonPath, "utf-8").trim();
    if (raw) {
      try {
        apps = JSON.parse(raw);
      } catch (e) {
        console.error("apps.json 解析失败，请检查格式。");
        process.exit(1);
      }
    }
  }

  if (!Array.isArray(apps)) {
    console.error("apps.json 必须是数组。");
    process.exit(1);
  }

  apps.push({
    name: appName,
    icon: `apps/${appId}/icon.png`,
    url: `apps/${appId}/`,
  });

  fs.writeFileSync(appsJsonPath, JSON.stringify(apps, null, 2), "utf-8");

  console.log(`✅ 已生成 App：apps/${appId}/`);
  console.log(`✅ 已写入 apps.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
