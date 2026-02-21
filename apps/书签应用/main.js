const note = document.getElementById("note");

// 加载本地内容
note.value = localStorage.getItem("note-content") || "";

// 自动保存
note.addEventListener("input", () => {
  localStorage.setItem("note-content", note.value);
});
