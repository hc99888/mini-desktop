/* 翻页按钮 */
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

/* 手势滑动 */
let startX = 0;
document.addEventListener("touchstart", e=>{
  startX = e.touches[0].clientX;
});
document.addEventListener("touchend", e=>{
  const diff = e.changedTouches[0].clientX - startX;
  if(diff < -80) goPreview();
  if(diff > 80) goEditor();
});

/* 模式切换 */
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

/* 单文件切换 */
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
}

tabBtns.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    showSingle(btn.dataset.target);
  });
});

/* 自动高度适配 */
function autoResize(el){
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

/* 复制按钮 */
document.querySelectorAll(".copy-btn").forEach(btn=>{
  btn.onclick = ()=>{
    const id = btn.dataset.target;
    const el = document.getElementById(id);
    navigator.clipboard.writeText(el.value);
    // 添加复制成功的视觉反馈
    const originalText = btn.textContent;
    btn.textContent = "✓ 已复制";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1000);
  };
});

/* 删除按钮 */
document.querySelectorAll(".del-btn").forEach(btn=>{
  btn.onclick = ()=>{
    const id = btn.dataset.target;
    const el = document.getElementById(id);
    el.value = "";
    autoResize(el);
  };
});

/* 清空全部代码 */
document.getElementById("clearBtn").onclick = ()=>{
  [
    "htmlCode_column","cssCode_column","jsCode_column",
    "htmlCode_single","cssCode_single","jsCode_single"
  ].forEach(id=>{
    const el = document.getElementById(id);
    el.value = "";
    autoResize(el);
  });
  
  // 添加清空反馈
  const clearBtn = document.getElementById("clearBtn");
  const originalText = clearBtn.textContent;
  clearBtn.textContent = "✓ 已清空";
  setTimeout(() => {
    clearBtn.textContent = originalText;
  }, 1000);
};

/* 弹窗控制 */
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

/* 阻止弹窗点击事件冒泡到遮罩层 */
exportMenu.onclick = (e) => e.stopPropagation();
confirmMenu.onclick = (e) => e.stopPropagation();

/* 选择导出类型 */
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

/* 取消 */
confirmCancel.onclick = closeAllPopups;

/* 确认导出 */
confirmOk.onclick = ()=>{
  // 获取当前模式下的代码
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

/* 运行代码 */
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

function runCode(){
  // 获取当前模式下的代码
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

  goPreview();
}

document.getElementById("runBtn").onclick = runCode;

/* 全屏预览 */
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

/* 初始化文本框自动高度 */
window.onload = ()=>{
  document.querySelectorAll("textarea").forEach(el => autoResize(el));
  
  // 默认显示竖列模式
  showSingle("html");
};