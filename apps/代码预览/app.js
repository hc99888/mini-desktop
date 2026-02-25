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
  ["htmlCode","cssCode","jsCode"].forEach(id=>{
    const el = document.getElementById(id);
    el.value = "";
    autoResize(el);
  });
};

/* 导出弹窗 */
const exportBtn = document.getElementById("exportBtn");
const exportMenu = document.getElementById("exportMenu");
const exportMask = document.getElementById("exportMask");

exportBtn.onclick = ()=>{
  exportMenu.style.display = "block";
  exportMask.style.display = "block";
};

exportMask.onclick = ()=>{
  exportMenu.style.display = "none";
  exportMask.style.display = "none";
};

/* 导出 HTML / ZIP */
document.querySelectorAll(".export-item").forEach(item=>{
  item.onclick = ()=>{
    const type = item.dataset.type;

    const html = document.getElementById("htmlCode").value;
    const css  = document.getElementById("cssCode").value;
    const js   = document.getElementById("jsCode").value;

    if(type === "html"){
      const blob = new Blob([html], {type:"text/html"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "index.html";
      a.click();
    }

    if(type === "zip"){
      alert("ZIP 导出功能可扩展（JSZip）");
    }

    exportMenu.style.display = "none";
    exportMask.style.display = "none";
  };
});

/* 运行代码 */
function buildDocument(html, css, js){
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>${css}</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`;
}

function runCode(){
  const html = document.getElementById("htmlCode").value;
  const css  = document.getElementById("cssCode").value;
  const js   = document.getElementById("jsCode").value;

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
