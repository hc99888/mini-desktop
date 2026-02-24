document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("demo-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    alert("{{APP_NAME}} 已经就绪，可以开始写你的逻辑了。");
  });
});
