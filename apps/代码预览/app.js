/* ==================== 翻页按钮 ==================== */
const pages = document.getElementById("pages");
const btnPreview = document.getElementById("toPreview");
const btnEditor = document.getElementById("toEditor");

function goPreview(){
  pages.style.transform = "translateX(-50%)";
  btnPreview.style.display = "none";
  btnEditor.style.display = "block";
}
function goEditor(){
  pages.style.transform = "translateX(0)";
  btnPreview.style.display = "block";
  btnEditor.style.display = "none";
}

btnPreview.onclick = goPreview;
btnEditor.onclick = goEditor;

/* ==================== 手势滑动 ==================== */
let startX = 0;
document.addEventListener("touchstart", e=>{
  startX = e.touches[0].clientX;
});
document.addEventListener("touchend", e=>{
  const diff = e.changedTouches[0].clientX - startX;
  if(diff < -80) goPreview();
  if(diff > 80) goEditor();
});

/* ==================== 模式切换 ==================== */
const modeBtns = document.querySelectorAll(".mode-btn");
const columnMode = document.getElementById("columnMode");
const singleMode = document.getElementById("singleMode");
const tabBar = document.getElementById("tabBar");

modeBtns.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const mode = btn.dataset.mode;

    modeBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    if(mode === "column"){
      columnMode.style.display = "block";
      singleMode.style.display = "none";
      tabBar.style.display = "none";
    }else{
      columnMode.style.display = "none";
      singleMode.style.display = "block";
      tabBar.style.display = "flex";
    }
  });
});

/* ==================== 单文件切换 ==================== */
const tabBtns = document.querySelectorAll(".tab-btn");
const singleHtml = document.getElementById("single-html");
const singleCss  = document.getElementById("single-css");
const singleJs   = document.getElementById("single-js");

function showSingle(type){
  singleHtml.style.display = (type === "html") ? "flex" : "none";
  singleCss.style.display  = (type === "css")  ? "flex" : "none";
  singleJs.style.display   = (type === "js")   ? "flex" : "none";

  tabBtns.forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.target === type);
  });

  // 延迟调整高度，确保元素显示后正确计算 scrollHeight
  setTimeout(() => {
    if (type === "html") autoResize(document.getElementById("htmlCode_single"));
    if (type === "css") autoResize(document.getElementById("cssCode_single"));
    if (type === "js") autoResize(document.getElementById("jsCode_single"));
  }, 10);
}

tabBtns.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    showSingle(btn.dataset.target);
  });
});

/* ==================== 自动高度适配（增强版）==================== */
function autoResize(el){
  if (!el) return;
  // 重置高度以获取正确的 scrollHeight
  el.style.height = 'auto';
  // 计算新高度：内容高度 + 上下边框高度
  let newHeight = el.scrollHeight;
  // 如果元素有边框，加上边框高度（scrollHeight 不包括边框）
  const computed = getComputedStyle(el);
  const borderTop = parseFloat(computed.borderTopWidth) || 0;
  const borderBottom = parseFloat(computed.borderBottomWidth) || 0;
  newHeight += borderTop + borderBottom;
  el.style.height = newHeight + 'px';
}

/* ==================== 缓存功能 ==================== */
const STORAGE_KEY = "codePreviewer";

function saveToStorage() {
  const data = {
    column: {
      html: document.getElementById("htmlCode_column").value,
      css: document.getElementById("cssCode_column").value,
      js: document.getElementById("jsCode_column").value
    },
    single: {
      html: document.getElementById("htmlCode_single").value,
      css: document.getElementById("cssCode_single").value,
      js: document.getElementById("jsCode_single").value
    }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      document.getElementById("htmlCode_column").value = data.column?.html || "";
      document.getElementById("cssCode_column").value = data.column?.css || "";
      document.getElementById("jsCode_column").value = data.column?.js || "";
      document.getElementById("htmlCode_single").value = data.single?.html || "";
      document.getElementById("cssCode_single").value = data.single?.css || "";
      document.getElementById("jsCode_single").value = data.single?.js || "";
    } catch (e) {
      console.warn("读取缓存失败", e);
    }
  }
  // 调整所有文本框高度
  document.querySelectorAll("textarea").forEach(el => autoResize(el));
}

/* ==================== 自动运行（实时预览） ==================== */
let previewTimer;
function setupRealtimePreview() {
  const textareas = document.querySelectorAll("textarea");
  textareas.forEach(ta => {
    ta.addEventListener("input", () => {
      autoResize(ta);          // 高度自适应
      saveToStorage();          // 保存到缓存
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        runCode();
      }, 500);
    });
  });
}

/* ==================== 复制按钮 ==================== */
document.querySelectorAll(".copy-btn").forEach(btn=>{
  btn.onclick = ()=>{
    const id = btn.dataset.target;
    const el = document.getElementById(id);
    navigator.clipboard.writeText(el.value);
    const originalText = btn.textContent;
    btn.textContent = "✓ 已复制";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1000);
  };
});

/* ==================== 删除按钮 ==================== */
document.querySelectorAll(".del-btn").forEach(btn=>{
  btn.onclick = ()=>{
    const id = btn.dataset.target;
    const el = document.getElementById(id);
    el.value = "";
    autoResize(el);
    saveToStorage();
    runCode();
  };
});

/* ==================== 清空全部代码 ==================== */
document.getElementById("clearBtn").onclick = ()=>{
  [
    "htmlCode_column","cssCode_column","jsCode_column",
    "htmlCode_single","cssCode_single","jsCode_single"
  ].forEach(id=>{
    const el = document.getElementById(id);
    el.value = "";
    autoResize(el);
  });
  
  saveToStorage();
  runCode();

  const clearBtn = document.getElementById("clearBtn");
  const originalText = clearBtn.textContent;
  clearBtn.textContent = "✓ 已清空";
  setTimeout(() => {
    clearBtn.textContent = originalText;
  }, 1000);
};

/* ==================== 弹窗控制 ==================== */
const mask = document.getElementById("mask");
const exportBtn = document.getElementById("exportBtn");
const exportMenu = document.getElementById("exportMenu");
const confirmMenu = document.getElementById("confirmMenu");
const confirmText = document.getElementById("confirmText");
const confirmCancel = document.getElementById("confirmCancel");
const confirmOk = document.getElementById("confirmOk");

let exportType = null;

exportBtn.onclick = (e)=>{
  e.stopPropagation();
  mask.style.display = "block";
  exportMenu.style.display = "block";
};

mask.onclick = closeAllPopups;

function closeAllPopups(){
  mask.style.display = "none";
  exportMenu.style.display = "none";
  confirmMenu.style.display = "none";
}

exportMenu.onclick = (e) => e.stopPropagation();
confirmMenu.onclick = (e) => e.stopPropagation();

document.querySelectorAll(".popup-item").forEach(item=>{
  item.onclick = ()=>{
    exportType = item.dataset.type;
    confirmText.textContent =
      exportType === "html"
      ? "确认导出 HTML 文件？"
      : "确认导出 ZIP 压缩包？";
    exportMenu.style.display = "none";
    confirmMenu.style.display = "block";
  };
});

confirmCancel.onclick = closeAllPopups;

confirmOk.onclick = ()=>{
  const isColumnMode = columnMode.style.display !== "none";
  
  let html, css, js;
  
  if(isColumnMode) {
    html = document.getElementById("htmlCode_column").value;
    css = document.getElementById("cssCode_column").value;
    js = document.getElementById("jsCode_column").value;
  } else {
    html = document.getElementById("htmlCode_single").value;
    css = document.getElementById("cssCode_single").value;
    js = document.getElementById("jsCode_single").value;
  }

  if(exportType === "html"){
    const fullHtml = buildDocument(html, css, js);
    const blob = new Blob([fullHtml], {type:"text/html"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if(exportType === "zip"){
    alert("ZIP 导出功能需要添加 JSZip 库，当前为演示效果");
  }

  closeAllPopups();
};

/* ==================== 构建完整 HTML ==================== */
function buildDocument(html, css, js){
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${css}</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`;
}

/* ==================== 运行代码到预览 ==================== */
function runCode(){
  const isColumnMode = columnMode.style.display !== "none";
  
  let html, css, js;
  
  if(isColumnMode) {
    html = document.getElementById("htmlCode_column").value;
    css = document.getElementById("cssCode_column").value;
    js = document.getElementById("jsCode_column").value;
  } else {
    html = document.getElementById("htmlCode_single").value;
    css = document.getElementById("cssCode_single").value;
    js = document.getElementById("jsCode_single").value;
  }

  const iframe = document.getElementById("previewFrame");
  const doc = iframe.contentDocument || iframe.contentWindow.document;

  doc.open();
  doc.write(buildDocument(html, css, js));
  doc.close();
}

document.getElementById("runBtn").onclick = ()=>{
  runCode();
  goPreview(); // 点击运行后跳转到预览页
};

/* ==================== 全屏预览 ==================== */
const fullscreenBtn = document.getElementById("fullscreenBtn");
const previewFrame = document.getElementById("previewFrame");

let isFull = false;

fullscreenBtn.onclick = ()=>{
  if(!isFull){
    previewFrame.classList.add("fullscreen");
    fullscreenBtn.textContent = "退出全屏";
    isFull = true;
  }else{
    previewFrame.classList.remove("fullscreen");
    fullscreenBtn.textContent = "全屏预览";
    isFull = false;
  }
};

/* ==================== 新增：处理移动端键盘遮挡 ==================== */
let keyboardTimer;
function handleResize() {
  const activeEl = document.activeElement;
  if (activeEl && activeEl.tagName === 'TEXTAREA') {
    clearTimeout(keyboardTimer);
    keyboardTimer = setTimeout(() => {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
}
window.addEventListener('resize', handleResize);

/* ==================== 初始化 ==================== */
window.onload = ()=>{
  // 移除所有 textarea 的内联 oninput（如果有）
  document.querySelectorAll("textarea").forEach(ta => {
    ta.removeAttribute("oninput");
  });

  loadFromStorage();           // 读取缓存（自动调整高度）
  setupRealtimePreview();      // 开启自动预览+保存（内部已包含 input 监听）
  showSingle("html");          // 单文件默认显示HTML（内部会 autoResize 对应框）
  runCode();                   // 加载后立即预览一次

  // 额外确保所有 textarea 高度正确（尤其是单文件刚显示时）
  setTimeout(() => {
    document.querySelectorAll("textarea").forEach(el => autoResize(el));
  }, 50);
};