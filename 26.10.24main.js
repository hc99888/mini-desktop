const DESKTOP_ID = 'desktop';
const LOADING_ID = 'loading';
const ERROR_ID = 'error';

// configuration.json 放在同一仓库根目录，GitHub Pages 会自动映射
const APPS_JSON_URL = 'configuration.json';

async function loadApps() {
  const loadingEl = document.getElementById(LOADING_ID);
  const errorEl = document.getElementById(ERROR_ID);

  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');

  try {
    const res = await fetch(APPS_JSON_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('网络错误: ' + res.status);
    const apps = await res.json();

    if (!Array.isArray(apps)) {
      throw new Error('configuration.json 格式错误，应为数组');
    }

    renderDesktop(apps);
    loadingEl.classList.add('hidden');
  } catch (e) {
    console.error(e);
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
  }
}

function renderDesktop(apps) {
  const desktop = document.getElementById(DESKTOP_ID);
  desktop.innerHTML = '';

  apps.forEach(app => {
    if (!app || !app.name || !app.url) return;

    const icon = document.createElement('div');
    icon.className = 'app-icon';

    const img = document.createElement('img');
    img.src = app.icon || 'icon-192.png'; // 没有图标就用默认
    img.alt = app.name;

    const label = document.createElement('span');
    label.textContent = app.name;

    icon.appendChild(img);
    icon.appendChild(label);

    icon.addEventListener('click', () => {
      // 新标签打开，避免“桌面”被覆盖
      window.open(app.url, '_blank');
    });

    desktop.appendChild(icon);
  });
}

// 注册 PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  });
}

loadApps();

