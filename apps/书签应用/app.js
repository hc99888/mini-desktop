
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js");
}



(function(){
/* ======================= 原书签核心逻辑（保留并适配） ======================= */
const STORAGE_KEY="catBookmarks_v4";
let categories=[];
let editingCatIndex=null;
let editingBookmark={catIndex:null,bookmarkIndex:null};

const container=document.getElementById("categoriesContainer");
const addBookmarkBtn=document.getElementById("addBookmarkBtn");
const importFile=document.getElementById("importFile");

const modalBackdrop=document.getElementById("modalBackdrop");
const modalTitle=document.getElementById("modalTitle");
const inputCategory=document.getElementById("inputCategory");
const inputTitle=document.getElementById("inputTitle");
const inputUrl=document.getElementById("inputUrl");
const inputDesc=document.getElementById("inputDesc");
const cancelModal=document.getElementById("cancelModal");
const okModal=document.getElementById("okModal");

const catModalBackdrop=document.getElementById("categoryModalBackdrop");
const inputCategoryName=document.getElementById("inputCategoryName");
const cancelCategoryModal=document.getElementById("cancelCategoryModal");
const okCategoryModal=document.getElementById("okCategoryModal");

const dropdownBtn=document.getElementById("categoryDropdownBtn");
const dropdownMenu=document.getElementById("categoryDropdownMenu");

const descModalBackdrop=document.getElementById("descModalBackdrop");
const descContent=document.getElementById("descContent");
const closeDescModal=document.getElementById("closeDescModal");
const visitLinkBtn=document.getElementById("visitLinkBtn");
let currentVisitUrl="";

function escapeHtml(t){
  return String(t).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}
function getInitial(t){
  t=(t||"?").trim();
  return t?t[0].toUpperCase():"?";
}
function getColor(t){
  t=t||"?";
  let h=0;
  for(let i=0;i<t.length;i++)h=t.charCodeAt(i)+((h<<5)-h);
  return`hsl(${Math.abs(h)%360},60%,55%)`;
}
function normalizeUrl(u){
  u=u.trim();
  return/^https?:\/\//i.test(u)?u:"https://"+u;
}
function favicon(u){
  try{
    const host=new URL(u).hostname;
    return`https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  }catch(e){return"";}
}

dropdownBtn.onclick=e=>{
  e.stopPropagation();
  renderDropdown();
  dropdownMenu.style.display=
    dropdownMenu.style.display==="block"?"none":"block";
};
function renderDropdown(){
  dropdownMenu.innerHTML="";
  categories.forEach(c=>{
    const d=document.createElement("div");
    d.textContent=c.name;
    d.onclick=()=>{
      inputCategory.value=c.name;
      dropdownMenu.style.display="none";
    };
    dropdownMenu.appendChild(d);
  });
}
document.onclick=()=>dropdownMenu.style.display="none";

function render(){
  container.innerHTML="";

  categories.forEach((cat,ci)=>{
    const block=document.createElement("div");
    block.className="category-block";
    block.draggable=true;
    block.dataset.index=ci;

    block.addEventListener("dragstart",e=>{
      block.classList.add("dragging");
      e.dataTransfer.setData("text/plain",ci);
    });
    block.addEventListener("dragend",()=>{
      block.classList.remove("dragging");
    });

    block.addEventListener("dragover",e=>{
      e.preventDefault();
      const dragging=document.querySelector(".category-block.dragging");
      if(!dragging)return;
      const blocks=[...container.children];
      const currentIndex=blocks.indexOf(block);
      const draggingIndex=blocks.indexOf(dragging);
      if(currentIndex!==draggingIndex){
        if(currentIndex>draggingIndex){
          container.insertBefore(dragging,block.nextSibling);
        }else{
          container.insertBefore(dragging,block);
        }
      }
    });

    block.addEventListener("drop",()=>{
      const newOrder=[...container.children].map(b=>{
        return categories[b.dataset.index];
      });
      categories=newOrder;
      save();
      render();
    });

    const header=document.createElement("div");
    header.className="category-header";
    header.innerHTML=`
      <span class="category-name">${escapeHtml(cat.name)}</span>
      <div class="category-actions">
        <button class="edit-cat" data-i="${ci}">改</button>
        <button class="del-cat" data-i="${ci}">删</button>
      </div>
    `;

    const grid=document.createElement("div");
    grid.className="grid";

    cat.bookmarks.forEach((b,bi)=>{
      grid.appendChild(createTile(ci,bi,b));
    });

    block.appendChild(header);
    block.appendChild(grid);
    container.appendChild(block);
  });

  document.querySelectorAll(".edit-cat").forEach(btn=>{
    btn.onclick=()=>openEditCategory(+btn.dataset.i);
  });
  document.querySelectorAll(".del-cat").forEach(btn=>{
    btn.onclick=()=>{
      const i=+btn.dataset.i;
      if(confirm(`删除分类“${categories[i].name}”？`)){
        categories.splice(i,1);
        save();render();
      }
    };
  });
}

function createTile(ci,bi,b){
  const t=document.createElement("div");
  t.className="tile";
  t.draggable=true;
  t.dataset.ci=ci;
  t.dataset.bi=bi;

  t.addEventListener("dragstart",()=>{
    t.classList.add("dragging");
  });
  t.addEventListener("dragend",()=>{
    t.classList.remove("dragging");
  });

  t.addEventListener("dragover",e=>{
    e.preventDefault();
    const dragging=document.querySelector(".tile.dragging");
    if(!dragging)return;

    const grid=t.parentElement;
    const tiles=[...grid.children];
    const currentIndex=tiles.indexOf(t);
    const draggingIndex=tiles.indexOf(dragging);

    if(currentIndex!==draggingIndex){
      if(currentIndex>draggingIndex){
        grid.insertBefore(dragging,t.nextSibling);
      }else{
        grid.insertBefore(dragging,t);
      }
    }
  });

  t.addEventListener("drop",()=>{
    const grid=t.parentElement;
    const newOrder=[...grid.children].map(tile=>{
      const ci=tile.dataset.ci;
      const bi=tile.dataset.bi;
      return categories[ci].bookmarks[bi];
    });
    categories[ci].bookmarks=newOrder;
    save();
    render();
  });

  t.onclick=e=>{
    if(t.classList.contains("show-actions")){
      currentVisitUrl=b.url;
      descContent.textContent=b.desc || "无说明";
      descModalBackdrop.style.display="flex";
      t.classList.remove("show-actions");
    }else{
      document.querySelectorAll(".tile.show-actions")
        .forEach(x=>x.classList.remove("show-actions"));
      t.classList.add("show-actions");
    }
  };

  const logo=document.createElement("div");
  logo.className="tile-logo";
  if(b.favicon){
    const img=document.createElement("img");
    img.src=b.favicon;
    img.onerror=()=>{
      logo.textContent=getInitial(b.title||b.url);
      logo.style.background=getColor(b.title||b.url);
    };
    logo.appendChild(img);
  }else{
    logo.textContent=getInitial(b.title||b.url);
    logo.style.background=getColor(b.title||b.url);
  }

  const title=document.createElement("div");
  title.className="tile-title";
  title.textContent=b.title||b.url;

  const act=document.createElement("div");
  act.className="tile-actions";

  const eBtn=document.createElement("button");
  eBtn.textContent="改";
  eBtn.onclick=e=>{
    e.stopPropagation();
    openEditBookmark(ci,bi);
  };

  const dBtn=document.createElement("button");
  dBtn.textContent="删";
  dBtn.onclick=e=>{
    e.stopPropagation();
    if(confirm("删除书签？")){
      categories[ci].bookmarks.splice(bi,1);
      save();render();
    }
  };

  act.append(eBtn,dBtn);
  t.append(logo,title,act);
  return t;
}

function show(m){m.style.display="flex";}
function hide(m){m.style.display="none";}

function openAddBookmark(){
  modalTitle.textContent="添加书签";
  inputCategory.value="";
  inputTitle.value="";
  inputUrl.value="";
  inputDesc.value="";
  editingBookmark={catIndex:null,bookmarkIndex:null};
  show(modalBackdrop);
}

function openEditBookmark(ci,bi){
  modalTitle.textContent="编辑书签";
  const b=categories[ci].bookmarks[bi];
  inputCategory.value=categories[ci].name;
  inputTitle.value=b.title||"";
  inputUrl.value=b.url||"";
  inputDesc.value=b.desc||"";
  editingBookmark={catIndex:ci,bookmarkIndex:bi};
  show(modalBackdrop);
}

function openEditCategory(i){
  inputCategoryName.value=categories[i].name;
  editingCatIndex=i;
  show(catModalBackdrop);
}

okModal.onclick=()=>{
  let cat=inputCategory.value.trim();
  const title=inputTitle.value.trim();
  const url=inputUrl.value.trim();
  const desc=inputDesc.value.trim();

  if(!url){
    alert("网址不能为空");
    return;
  }

  if(!cat)cat="默认";

  const u=normalizeUrl(url);
  const data={
    title:title||u,
    url:u,
    favicon:favicon(u),
    desc:desc||""
  };

  let ci = categories.findIndex(c => c.name === cat);
  if (ci === -1) {
    categories.push({ name: cat, bookmarks: [] });
    ci = categories.length - 1;
  }

  if (editingBookmark.bookmarkIndex != null) {
    const old = editingBookmark;
    if (old.catIndex === ci) {
      categories[ci].bookmarks[old.bookmarkIndex] = data;
    } else {
      categories[old.catIndex].bookmarks.splice(old.bookmarkIndex, 1);
      categories[ci].bookmarks.push(data);
    }
  } else {
    categories[ci].bookmarks.push(data);
  }

  save();
  render();
  hide(modalBackdrop);
};

cancelModal.onclick = () => hide(modalBackdrop);
modalBackdrop.onclick = e => { if (e.target === modalBackdrop) hide(modalBackdrop); };

okCategoryModal.onclick = () => {
  const name = inputCategoryName.value.trim();
  if (!name) {
    alert("分类名称不能为空");
    return;
  }
  if (editingCatIndex != null) {
    categories[editingCatIndex].name = name;
    editingCatIndex = null;
  }
  save();
  render();
  hide(catModalBackdrop);
};

cancelCategoryModal.onclick = () => hide(catModalBackdrop);
catModalBackdrop.onclick = e => { if (e.target === catModalBackdrop) hide(catModalBackdrop); };

addBookmarkBtn.onclick = openAddBookmark;

// 导出
function exportJSON(){
  const blob = new Blob([JSON.stringify(categories, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bookmarks.json";
  a.click();
  URL.revokeObjectURL(url);
}

// 导入
function importJSONFromFile(){
  importFile.click();
}

importFile.onchange = () => {
  const f = importFile.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) {
        alert("导入格式不正确");
        return;
      }

      // 自动兼容旧数据
      data.forEach(cat => {
        cat.bookmarks.forEach(b => {
          if (!("desc" in b)) b.desc = "";
        });
      });

      categories = data;
      save();
      render();
      alert("导入成功");
    } catch (err) {
      alert("导入失败：JSON 解析错误");
    }
  };
  r.readAsText(f, "utf-8");
  importFile.value = ""; // 允许重复导入
};

function openClearData(){
  // 命令面板调用：prompt 输入“清空” → 二次确认
  const v = prompt("此操作将删除全部书签分类和书签（分类和 Gitee 设置保留）。\n请输入「清空」以确认：");
  if (v !== "清空") return;
  if (confirm("再次确认：确定要清空所有书签数据吗？此操作不可恢复。")) {
    categories = [];
    save();
    render();
    alert("已清空全部数据");
  }
}

// 点击空白处隐藏 tile 操作按钮
document.addEventListener("click", e => {
  if (!e.target.closest(".tile")) {
    document.querySelectorAll(".tile.show-actions")
      .forEach(t => t.classList.remove("show-actions"));
  }
});

// 说明弹窗事件
closeDescModal.onclick = () => hide(descModalBackdrop);
descModalBackdrop.onclick = e => { if (e.target === descModalBackdrop) hide(descModalBackdrop); };
visitLinkBtn.onclick = () => {
  if (currentVisitUrl) {
    window.open(currentVisitUrl, "_blank");
    hide(descModalBackdrop);
  }
};

// 保存到 localStorage
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

// 初始化
function init() {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s) {
    try {
      categories = JSON.parse(s) || [];

      // 自动兼容旧数据
      categories.forEach(cat => {
        cat.bookmarks.forEach(b => {
          if (!("desc" in b)) b.desc = "";
        });
      });

    } catch (e) {
      categories = [];
    }
  }
  render();
}

/* ======================= Gitee 同步模块 ======================= */
const GITEE_CFG_KEY = "my_notes_gitee_cfg";
const EMPTY_PLACEHOLDER = { notes: [] };

/** 读取配置 */
function getSyncCfg() {
  try {
    const raw = localStorage.getItem(GITEE_CFG_KEY);
    return raw ? JSON.parse(raw) : { owner:'', token:'', repo:'', filePath:'我的数据库/资料库.json' };
  } catch(e) {
    return { owner:'', token:'', repo:'', filePath:'我的数据库/资料库.json' };
  }
}
function saveSyncCfg(cfg) {
  localStorage.setItem(GITEE_CFG_KEY, JSON.stringify(cfg));
}

/** Gitee API 基础 */
function encodeGiteePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}
async function giteeGet(path) {
  const cfg = getSyncCfg();
  const url = `https://gitee.com/api/v5/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}?access_token=${cfg.token}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.json();
}
async function giteePut(path, contentBase64, message) {
  const cfg = getSyncCfg();
  const url = `https://gitee.com/api/v5/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}`;
  const body = {
    access_token: cfg.token,
    content: contentBase64,
    message: message || 'sync update',
    branch: 'master'
  };
  // 如果已存在文件，需要 sha
  try {
    const existing = await giteeGet(path);
    if (existing && existing.sha) body.sha = existing.sha;
  } catch(e) { /* 文件不存在则新建 */ }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.json();
}
async function giteeListDir(path) {
  const cfg = getSyncCfg();
  const url = `https://gitee.com/api/v5/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}?access_token=${cfg.token}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

/** 工具函数 */
function sanitizeNote(note) {
  const n = { ...note };
  delete n.history; // 去掉历史
  return n;
}
function dedupeNotesByTitle(notes) {
  const seen = new Set();
  return notes.filter(n => {
    const t = (n.title || '').trim();
    if (!t) return true;
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}
function buildSyncPayload(notes) {
  const cleaned = dedupeNotesByTitle(notes).map(sanitizeNote);
  return { notes: cleaned };
}

/** Gitee 同步 UI 逻辑 */
const giteeSyncBackdrop = document.getElementById('giteeSyncBackdrop');
const closeGiteeSync = document.getElementById('closeGiteeSync');
const giteeInfoBar = document.getElementById('giteeInfoBar');
const giOwner = document.getElementById('giOwner');
const giRepo = document.getElementById('giRepo');
const giFile = document.getElementById('giFile');
const giteeStatusBar = document.getElementById('giteeStatusBar');
const giteeFileList = document.getElementById('giteeFileList');
const giteeSyncAction = document.getElementById('giteeSyncAction');
const giteeUploadAction = document.getElementById('giteeUploadAction');
const giteeDownloadAction = document.getElementById('giteeDownloadAction');
const dlPicker = document.getElementById('dlPicker');
const dlFileName = document.getElementById('dlFileName');
const dlFileSize = document.getElementById('dlFileSize');
const dlToPhone = document.getElementById('dlToPhone');
const dlImport = document.getElementById('dlImport');
const dlCancel = document.getElementById('dlCancel');

let giteeFileListData = []; // 暂存列表

function updateGiteeInfo() {
  const cfg = getSyncCfg();
  giOwner.textContent = cfg.owner || '未设置';
  giRepo.textContent = cfg.repo || '未设置';
  giFile.textContent = cfg.filePath || '我的数据库/资料库.json';
}

function setGiteeStatus(msg, type) {
  giteeStatusBar.textContent = msg;
  giteeStatusBar.className = 'status-bar' + (type ? ' ' + type : '');
  giteeStatusBar.style.display = msg ? 'block' : 'none';
}
function clearGiteeStatus() { setGiteeStatus(''); }

function openGiteeSync() {
  updateGiteeInfo();
  clearGiteeStatus();
  giteeFileList.style.display = 'none';
  giteeFileList.innerHTML = '';
  giteeFileListData = [];
  giteeSyncBackdrop.style.display = 'flex';
}
function closeGiteeSyncModal() {
  giteeSyncBackdrop.style.display = 'none';
  dlPicker.style.display = 'none';
}

closeGiteeSync.onclick = closeGiteeSyncModal;
giteeSyncBackdrop.onclick = e => { if (e.target === giteeSyncBackdrop) closeGiteeSyncModal(); };

// ---------- 一键同步 ----------
giteeSyncAction.onclick = async () => {
  const cfg = getSyncCfg();
  if (!cfg.owner || !cfg.token || !cfg.repo) {
    setGiteeStatus('❌ 请先在「⚙️ Gitee 设置」中配置账号、令牌和仓库', 'error');
    return;
  }
  giteeSyncAction.disabled = true;
  try {
    setGiteeStatus('⏳ 正在读取远端主文件…', 'info');
    let remoteNotes = [];
    try {
      const fileData = await giteeGet(cfg.filePath);
      const content = atob(fileData.content.replace(/\s/g, ''));
      const remoteJson = JSON.parse(content);
      remoteNotes = remoteJson.notes || [];
    } catch(e) {
      // 远端文件不存在或无效
      remoteNotes = [];
    }

    const localPayload = buildSyncPayload(categories);
    const localNotes = localPayload.notes;

    // 远端无效或空 → 直接上传
    if (!remoteNotes || remoteNotes.length === 0) {
      setGiteeStatus('⏳ 远端无有效数据，正在上传本地数据…', 'info');
      const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(localPayload))));
      await giteePut(cfg.filePath, base64, 'sync: 初始化上传');
      setGiteeStatus('✅ 已上传本地数据到远端', '');
      giteeSyncAction.disabled = false;
      return;
    }

    // 比较条数和最新更新时间
    const localCount = localNotes.length;
    const remoteCount = remoteNotes.length;
    const localLatest = localNotes.reduce((max, n) => Math.max(max, new Date(n.updatedAt || 0).getTime()), 0);
    const remoteLatest = remoteNotes.reduce((max, n) => Math.max(max, new Date(n.updatedAt || 0).getTime()), 0);

    if (remoteLatest > localLatest && remoteCount >= localCount) {
      // 远端更新
      if (confirm('远端数据比本地新且条数不少于本地。\n\n确定：用远端覆盖本地\n取消：用本地覆盖远端（将再次确认）')) {
        // 远端覆盖本地
        categories = remoteNotes.map(n => ({
          name: n.category || '默认',
          bookmarks: n.bookmarks || []
        }));
        save();
        render();
        setGiteeStatus('✅ 已使用远端数据覆盖本地', '');
      } else {
        if (confirm('再次确认：用本地数据覆盖远端？')) {
          setGiteeStatus('⏳ 正在上传本地数据…', 'info');
          const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(localPayload))));
          await giteePut(cfg.filePath, base64, 'sync: 本地覆盖远端');
          setGiteeStatus('✅ 已用本地数据覆盖远端', '');
        } else {
          setGiteeStatus('已取消操作', 'info');
        }
      }
    } else {
      // 本地更新或条数更多 → 上传
      setGiteeStatus('⏳ 本地数据较新，正在上传…', 'info');
      const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(localPayload))));
      await giteePut(cfg.filePath, base64, 'sync: 上传本地更新');
      setGiteeStatus('✅ 已上传本地数据到远端', '');
    }
  } catch(err) {
    setGiteeStatus('❌ 同步失败：' + err.message, 'error');
  } finally {
    giteeSyncAction.disabled = false;
  }
};

// ---------- 上传 ----------
giteeUploadAction.onclick = async () => {
  const cfg = getSyncCfg();
  if (!cfg.owner || !cfg.token || !cfg.repo) {
    setGiteeStatus('❌ 请先在「⚙️ Gitee 设置」中配置账号、令牌和仓库', 'error');
    return;
  }
  // 选择本地文件
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.onchange = async () => {
    const f = fileInput.files[0];
    if (!f) return;
    let localData;
    try {
      const text = await f.text();
      localData = JSON.parse(text);
      if (!localData || !Array.isArray(localData.notes)) {
        setGiteeStatus('❌ 文件格式错误：必须包含 notes 数组', 'error');
        return;
      }
    } catch(e) {
      setGiteeStatus('❌ 文件解析失败：' + e.message, 'error');
      return;
    }

    const prefix = prompt('请输入文件名前缀（如 A厂、资料库）：', '资料库');
    if (!prefix) {
      setGiteeStatus('已取消上传', 'info');
      return;
    }

    giteeUploadAction.disabled = true;
    try {
      const dir = cfg.filePath.split('/').slice(0, -1).join('/') || '';
      const dateStr = new Date().toISOString().slice(0,10);
      // 查找同目录已有文件
      let existingFiles = [];
      try {
        existingFiles = await giteeListDir(dir);
      } catch(e) {}
      const samePrefix = existingFiles.filter(item => item.name.startsWith(prefix + '-' + dateStr));
      let index = 1;
      const usedIndices = samePrefix.map(item => {
        const m = item.name.match(new RegExp(prefix + '-' + dateStr + 'T(\\d+)\\.json'));
        return m ? parseInt(m[1]) : 0;
      }).filter(n => n > 0);
      if (usedIndices.length > 0) index = Math.max(...usedIndices) + 1;
      const fileName = `${prefix}-${dateStr}T${index}.json`;
      const fullPath = dir ? dir + '/' + fileName : fileName;

      setGiteeStatus('⏳ 正在上传 ' + fileName + ' …', 'info');
      const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(localData))));
      await giteePut(fullPath, base64, 'upload: ' + fileName);
      setGiteeStatus('✅ 上传成功：' + fullPath, '');
    } catch(err) {
      setGiteeStatus('❌ 上传失败：' + err.message, 'error');
    } finally {
      giteeUploadAction.disabled = false;
    }
  };
  fileInput.click();
};

// ---------- 下载（列出文件） ----------
giteeDownloadAction.onclick = async () => {
  const cfg = getSyncCfg();
  if (!cfg.owner || !cfg.token || !cfg.repo) {
    setGiteeStatus('❌ 请先在「⚙️ Gitee 设置」中配置账号、令牌和仓库', 'error');
    return;
  }
  giteeDownloadAction.disabled = true;
  try {
    const dir = cfg.filePath.split('/').slice(0, -1).join('/') || '';
    setGiteeStatus('⏳ 正在获取远端文件列表…', 'info');
    const list = await giteeListDir(dir);
    const jsonFiles = list
      .filter(item => item.type === 'file' && item.name.endsWith('.json'))
      .sort((a,b) => b.name.localeCompare(a.name));

    if (jsonFiles.length === 0) {
      setGiteeStatus('ℹ️ 远端目录没有 .json 文件', 'info');
      giteeFileList.style.display = 'none';
      return;
    }

    giteeFileListData = jsonFiles;
    giteeFileList.innerHTML = jsonFiles.map((item, idx) =>
      `<div class="file-row" data-idx="${idx}">
        <span class="file-name">${escapeHtml(item.name)}</span>
        <span class="file-size">${(item.size/1024).toFixed(1)} KB</span>
      </div>`
    ).join('');
    giteeFileList.style.display = 'block';
    setGiteeStatus('✅ 共 ' + jsonFiles.length + ' 个文件，点击选择操作', '');

    // 绑定点击行 → 打开下载选择小窗
    giteeFileList.querySelectorAll('.file-row').forEach(row => {
      row.onclick = () => {
        const idx = parseInt(row.dataset.idx);
        const file = giteeFileListData[idx];
        if (file) openDlPicker(file);
      };
    });
  } catch(err) {
    setGiteeStatus('❌ 获取文件列表失败：' + err.message, 'error');
  } finally {
    giteeDownloadAction.disabled = false;
  }
};

// 下载选择小窗
let currentDlFile = null;
function openDlPicker(fileItem) {
  currentDlFile = fileItem;
  dlFileName.textContent = fileItem.name;
  dlFileSize.textContent = (fileItem.size/1024).toFixed(1) + ' KB';
  dlPicker.style.display = 'flex';
}
dlCancel.onclick = () => { dlPicker.style.display = 'none'; currentDlFile = null; };
dlPicker.onclick = e => { if (e.target === dlPicker) { dlPicker.style.display = 'none'; currentDlFile = null; } };

dlToPhone.onclick = async () => {
  if (!currentDlFile) return;
  try {
    const cfg = getSyncCfg();
    const dir = cfg.filePath.split('/').slice(0, -1).join('/') || '';
    const path = dir ? dir + '/' + currentDlFile.name : currentDlFile.name;
    setGiteeStatus('⏳ 正在下载文件…', 'info');
    const data = await giteeGet(path);
    const content = atob(data.content.replace(/\s/g, ''));
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentDlFile.name;
    a.click();
    URL.revokeObjectURL(url);
    setGiteeStatus('✅ 已下载：' + currentDlFile.name, '');
    dlPicker.style.display = 'none';
  } catch(err) {
    setGiteeStatus('❌ 下载失败：' + err.message, 'error');
  }
};

dlImport.onclick = async () => {
  if (!currentDlFile) return;
  if (!confirm('导入将覆盖当前资料库中的所有书签，确定继续？')) return;
  try {
    const cfg = getSyncCfg();
    const dir = cfg.filePath.split('/').slice(0, -1).join('/') || '';
    const path = dir ? dir + '/' + currentDlFile.name : currentDlFile.name;
    setGiteeStatus('⏳ 正在导入…', 'info');
    const data = await giteeGet(path);
    const content = atob(data.content.replace(/\s/g, ''));
    const parsed = JSON.parse(content);
    if (!parsed.notes || !Array.isArray(parsed.notes)) {
      setGiteeStatus('❌ 文件内容无效：缺少 notes 数组', 'error');
      return;
    }
    // 清洗 + 标题去重
    const cleanedNotes = dedupeNotesByTitle(parsed.notes.map(sanitizeNote));
    // 合并分类（按 title 去重，但这里直接替换整个 categories）
    // 按照原始结构重建 categories
    const catMap = new Map();
    cleanedNotes.forEach(note => {
      const catName = note.category || '默认';
      if (!catMap.has(catName)) catMap.set(catName, []);
      catMap.get(catName).push(note);
    });
    const newCategories = [];
    catMap.forEach((notes, catName) => {
      newCategories.push({
        name: catName,
        bookmarks: notes.map(n => ({
          title: n.title || n.url || '未命名',
          url: n.url || '',
          favicon: n.favicon || '',
          desc: n.desc || ''
        }))
      });
    });
    categories = newCategories;
    save();
    render();
    setGiteeStatus('✅ 导入成功，共 ' + cleanedNotes.length + ' 条书签', '');
    dlPicker.style.display = 'none';
  } catch(err) {
    setGiteeStatus('❌ 导入失败：' + err.message, 'error');
  }
};

/* ======================= Gitee 设置弹窗（带锁） ======================= */
const giteeSetBackdrop = document.getElementById('giteeSetBackdrop');
const closeGiteeSet = document.getElementById('closeGiteeSet');
const giteeSetFields = document.getElementById('giteeSetFields');
const lockOverlay = document.getElementById('lockOverlay');
const unlockBtn = document.getElementById('unlockBtn');
const setOwner = document.getElementById('setOwner');
const setToken = document.getElementById('setToken');
const setRepo = document.getElementById('setRepo');
const setFilePath = document.getElementById('setFilePath');
const toggleToken = document.getElementById('toggleToken');
const cancelGiteeSet = document.getElementById('cancelGiteeSet');
const saveGiteeSet = document.getElementById('saveGiteeSet');

let lockTimer = null;
let isLocked = true;

function lockSettings() {
  isLocked = true;
  giteeSetFields.classList.add('locked');
  lockOverlay.style.display = 'flex';
  if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
}

function unlockSettings() {
  isLocked = false;
  giteeSetFields.classList.remove('locked');
  lockOverlay.style.display = 'none';
  resetLockTimer();
}

function resetLockTimer() {
  if (lockTimer) clearTimeout(lockTimer);
  if (!isLocked) {
    lockTimer = setTimeout(() => { lockSettings(); }, 10000);
  }
}

// 解锁按钮
unlockBtn.onclick = (e) => { e.stopPropagation(); unlockSettings(); };

// 输入框聚焦时重置计时
[setOwner, setToken, setRepo, setFilePath].forEach(el => {
  el.addEventListener('focus', resetLockTimer);
  el.addEventListener('input', resetLockTimer);
});

// 密码可见切换
toggleToken.onclick = () => {
  if (setToken.type === 'password') {
    setToken.type = 'text';
    toggleToken.textContent = '🙈';
  } else {
    setToken.type = 'password';
    toggleToken.textContent = '👁';
  }
};

function loadGiteeSetForm() {
  const cfg = getSyncCfg();
  setOwner.value = cfg.owner || '';
  setToken.value = cfg.token || '';
  setRepo.value = cfg.repo || '';
  setFilePath.value = cfg.filePath || '我的数据库/资料库.json';
}
function openGiteeSet() {
  loadGiteeSetForm();
  lockSettings(); // 每次打开默认锁定
  giteeSetBackdrop.style.display = 'flex';
}
function closeGiteeSetModal() {
  giteeSetBackdrop.style.display = 'none';
  if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
}

closeGiteeSet.onclick = closeGiteeSetModal;
cancelGiteeSet.onclick = closeGiteeSetModal;
giteeSetBackdrop.onclick = e => { if (e.target === giteeSetBackdrop) closeGiteeSetModal(); };

saveGiteeSet.onclick = () => {
  if (isLocked) {
    alert('请先点击「● 开启」解锁设置');
    return;
  }
  const cfg = {
    owner: setOwner.value.trim(),
    token: setToken.value.trim(),
    repo: setRepo.value.trim(),
    filePath: setFilePath.value.trim() || '我的数据库/资料库.json'
  };
  if (!cfg.owner || !cfg.token || !cfg.repo) {
    alert('用户名、令牌、仓库名不能为空');
    return;
  }
  saveSyncCfg(cfg);
  // 同步更新 Gitee 同步弹窗的信息条
  updateGiteeInfo();
  alert('设置已保存');
  closeGiteeSetModal();
};

/* ======================= 命令面板 ======================= */
const cmdBackdrop = document.getElementById('cmdBackdrop');
const cmdInput = document.getElementById('cmdInput');
const cmdList = document.getElementById('cmdList');

const CMD_ITEMS = [
  {id:'gitee',  label:'⚙️ Gitee 设置', desc:'配置仓库 · 导入 · 导出',   run:()=>openGiteeSet()},
  {id:'import', label:'📥 导入 JSON',   desc:'从文件合并到资料库',       run:()=>importJSONFromFile()},
  {id:'export', label:'📤 导出 JSON',   desc:'导出到本地文件',           run:()=>exportJSON()},
  {id:'clear',  label:'⚠️ 清空数据',    desc:'删除全部资料（不可恢复）', run:()=>openClearData(), danger:true},
];

let cmdSelectedIndex = 0;
let cmdFiltered = [];

function renderCmd(q) {
  const query = (q||'').trim().toLowerCase();
  cmdFiltered = CMD_ITEMS.filter(item =>
    item.label.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query)
  );
  if (cmdFiltered.length === 0) {
    cmdList.innerHTML = '<div class="cmd-empty">无匹配</div>';
    cmdSelectedIndex = -1;
    return;
  }
  cmdSelectedIndex = Math.min(cmdSelectedIndex, cmdFiltered.length - 1);
  if (cmdSelectedIndex < 0) cmdSelectedIndex = 0;
  cmdList.innerHTML = cmdFiltered.map((item, idx) => {
    const sel = idx === cmdSelectedIndex ? ' sel' : '';
    const danger = item.danger ? ' danger' : '';
    return `<div class="cmd-item${sel}${danger}" data-idx="${idx}">
      <span class="cmd-label">${item.label}</span>
      <span class="cmd-desc">${item.desc}</span>
    </div>`;
  }).join('');
  // 绑定点击
  cmdList.querySelectorAll('.cmd-item').forEach(el => {
    el.onclick = () => {
      const idx = parseInt(el.dataset.idx);
      const item = cmdFiltered[idx];
      if (item) {
        closeCmd();
        setTimeout(() => item.run(), 50);
      }
    };
    el.onmouseenter = () => {
      cmdSelectedIndex = parseInt(el.dataset.idx);
      renderCmd(cmdInput.value);
    };
  });
}

function openCmd() {
  cmdInput.value = '';
  cmdSelectedIndex = 0;
  renderCmd('');
  cmdBackdrop.style.display = 'flex';
  setTimeout(() => cmdInput.focus(), 50);
}
function closeCmd() {
  cmdBackdrop.style.display = 'none';
}

cmdInput.addEventListener('input', () => {
  cmdSelectedIndex = 0;
  renderCmd(cmdInput.value);
});

cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (cmdFiltered.length === 0) return;
    cmdSelectedIndex = (cmdSelectedIndex + 1) % cmdFiltered.length;
    renderCmd(cmdInput.value);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (cmdFiltered.length === 0) return;
    cmdSelectedIndex = (cmdSelectedIndex - 1 + cmdFiltered.length) % cmdFiltered.length;
    renderCmd(cmdInput.value);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (cmdSelectedIndex >= 0 && cmdFiltered[cmdSelectedIndex]) {
      const item = cmdFiltered[cmdSelectedIndex];
      closeCmd();
      setTimeout(() => item.run(), 50);
    }
  } else if (e.key === 'Escape') {
    closeCmd();
  }
});

cmdBackdrop.onclick = e => { if (e.target === cmdBackdrop) closeCmd(); };

// 快捷键 Ctrl/⌘+K
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (cmdBackdrop.style.display === 'flex') closeCmd();
    else openCmd();
  }
  if (e.key === 'Escape') {
    if (cmdBackdrop.style.display === 'flex') closeCmd();
    if (giteeSetBackdrop.style.display === 'flex') closeGiteeSetModal();
    if (giteeSyncBackdrop.style.display === 'flex') closeGiteeSyncModal();
    if (modalBackdrop.style.display === 'flex') hide(modalBackdrop);
    if (catModalBackdrop.style.display === 'flex') hide(catModalBackdrop);
    if (descModalBackdrop.style.display === 'flex') hide(descModalBackdrop);
  }
});

/* ======================= 顶部按钮绑定 ======================= */
document.getElementById('giteeSyncBtn').onclick = () => openGiteeSync();
document.getElementById('cmdPanelBtn').onclick = () => openCmd();
document.getElementById('refreshBtn').onclick = () => location.reload();

// 启动
init();
})();
