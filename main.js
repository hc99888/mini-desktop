const APPS_JSON_URL = "apps.json";

// 加载 apps.json
async function loadApps() {
  const res = await fetch(APPS_JSON_URL);
  let apps = await res.json();

  apps = loadOrder(apps); // 加载排序

  renderDesktop(apps);
}

// 渲染桌面图标
function renderDesktop(apps) {
  const desktop = document.getElementById("desktop");
  desktop.innerHTML = "";

  apps.forEach(app => {
    const icon = document.createElement("div");
    icon.className = "app-icon";
    icon.dataset.name = app.name;

    icon.innerHTML = `
      <img src="${app.icon}">
      <div>${app.name}</div>
    `;

    icon.onclick = () => window.location.href = app.url;

    desktop.appendChild(icon);
  });

  enableDrag();
}

/* ============================
   安卓桌面级拖动排序系统
   ============================ */

let dragItem = null;

function enableDrag() {
  const icons = [...document.querySelectorAll(".app-icon")];

  icons.forEach(icon => {
    icon.setAttribute("draggable", "true");

    icon.addEventListener("dragstart", e => {
      dragItem = icon;
      icon.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    icon.addEventListener("dragend", () => {
      dragItem.classList.remove("dragging");
      dragItem = null;
      saveOrder();
    });
  });

  const desktop = document.getElementById("desktop");

  desktop.addEventListener("dragover", e => {
    e.preventDefault();

    const afterElement = getDragAfterElement(desktop, e.clientX, e.clientY);
    const dragging = document.querySelector(".dragging");

    if (!afterElement) {
      desktop.appendChild(dragging);
    } else {
      desktop.insertBefore(dragging, afterElement);
    }
  });
}

// 找到最近的格子（安卓吸附算法）
function getDragAfterElement(container, x, y) {
  const elements = [...container.querySelectorAll(".app-icon:not(.dragging)")];

  return elements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = Math.hypot(box.x - x, box.y - y);

      if (offset < closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Infinity }
  ).element;
}

// 保存排序
function saveOrder() {
  const icons = [...document.querySelectorAll(".app-icon")];
  const order = icons.map(icon => icon.dataset.name);
  localStorage.setItem("desktop-order", JSON.stringify(order));
}

// 加载排序
function loadOrder(apps) {
  const saved = JSON.parse(localStorage.getItem("desktop-order") || "[]");
  if (saved.length === 0) return apps;

  const map = {};
  apps.forEach(app => (map[app.name] = app));

  const ordered = saved.filter(name => map[name]).map(name => map[name]);
  const missing = apps.filter(app => !saved.includes(app.name));

  return [...ordered, ...missing];
}

loadApps();
