// 翻页
const pages = document.getElementById("pages");
document.getElementById("toPreview").onclick = () => {
  pages.style.transform = "translateX(-50%)";
  document.getElementById("toPreview").style.display = "none";
  document.getElementById("toEditor").style.display = "block";
};
document.getElementById("toEditor").onclick = () => {
  pages.style.transform = "translateX(0)";
  document.getElementById("toPreview").style.display = "block";
  document.getElementById("toEditor").style.display = "none";
};

// 自动高度
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

// 复制
document.querySelectorAll(".copy-btn").forEach(btn => {
  btn.onclick = () => {
    const el = document.getElementById(btn.dataset.target);
    navigator.clipboard.writeText(el.value);
  };
});

// 删除
document.querySelectorAll(".del-btn").forEach(btn => {
  btn.onclick = () => {
    const el = document.getElementById(btn.dataset.target);
    el.value = "";
    autoResize(el);
  };
});

// 清空全部
document.getElementById("clearBtn").onclick = () => {
  [
    "htmlCode_column","cssCode_column","jsCode_column",
    "htmlCode_single","cssCode_single","jsCode_single"
  ].forEach(id => {
    const el = document.getElementById(id);
    el.value = "";
    autoResize(el);
  });
};

// 弹窗控制
const mask = document.getElementById("mask");
const exportMenu = document.getElementById("exportMenu");
const confirmMenu = document.getElementById("confirmMenu");
const confirmText = document.getElementById("confirmText");

function hidePopup() {
  mask.style.display = "none";
  exportMenu.style.display = "none";
  confirmMenu.style.display = "none";
}

mask.onclick = hidePopup;

// 打开导出菜单
document.getElementById("exportBtn").onclick = () => {
  mask.style.display = "block";
  exportMenu.style.display = "block";
};

// 选择导出类型
let exportType = null;
document.querySelectorAll(".popup-item").forEach(item => {
  item.onclick = () => {
    exportType = item.dataset.type;
    confirmText.textContent =
      exportType === "html" ? "确认导出 HTML 文件？" : "确认导出 ZIP 压缩包？";

    exportMenu.style.display = "none";
    confirmMenu.style.display = "block";
  };
});

// 取消
document.getElementById("confirmCancel").onclick = hidePopup;

// 确认导出
document.getElementById("confirmOk").onclick = () => {
  const html = document.getElementById("htmlCode_column").value;
  const css = document.getElementById("cssCode_column").value;
  const js = document.getElementById("jsCode_column").value;

  if (exportType === "html") {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "index.html";
    a.click();
  }

  if (exportType === "zip") {
    alert("ZIP 导出功能可扩展（JSZip）");
  }

  hidePopup();
};

// 运行
document.getElementById("runBtn").onclick = () => {
  const html = document.getElementById("htmlCode_column").value;
  const css = document.getElementById("cssCode_column").value;
  const js = document.getElementById("jsCode_column").value;

  const iframe = document.getElementById("previewFrame");
  const doc = iframe.contentDocument;

  doc.open();
  doc.write(`
    <style>${css}</style>
    ${html}
    <script>${js}<\/script>
  `);
  doc.close();

  pages.style.transform = "translateX(-50%)";
};

// 全屏预览
document.getElementById("fullscreenBtn").onclick = () => {
  const frame = document.getElementById("previewFrame");
  frame.classList.toggle("fullscreen");
};
