
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js");
}



/* ============================================================
   原有书签核心逻辑 + Gitee 同步 + 命令面板 + 设置弹窗
   所有函数统一挂载到 window 上以便跨模块调用
   ============================================================ */
(function(){
  "use strict";

  /* ---------- 原有书签数据与渲染 ---------- */
  const STORAGE_KEY = "catBookmarks_v4";
  let categories = [];
  let editingCatIndex = null;
  let editingBookmark = { catIndex: null, bookmarkIndex: null };

  const container = document.getElementById("categoriesContainer");
  const addBookmarkBtn = document.getElementById("addBookmarkBtn");
  const importFile = document.getElementById("importFile");

  // 原有 modal 元素
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalTitle = document.getElementById("modalTitle");
  const inputCategory = document.getElementById("inputCategory");
  const inputTitle = document.getElementById("inputTitle");
  const inputUrl = document.getElementById("inputUrl");
  const inputDesc = document.getElementById("inputDesc");
  const cancelModal = document.getElementById("cancelModal");
  const okModal = document.getElementById("okModal");

  const catModalBackdrop = document.getElementById("categoryModalBackdrop");
  const inputCategoryName = document.getElementById("inputCategoryName");
  const cancelCategoryModal = document.getElementById("cancelCategoryModal");
  const okCategoryModal = document.getElementById("okCategoryModal");

  const dropdownBtn = document.getElementById("categoryDropdownBtn");
  const dropdownMenu = document.getElementById("categoryDropdownMenu");

  const descModalBackdrop = document.getElementById("descModalBackdrop");
  const descContent = document.getElementById("descContent");
  const closeDescModal = document.getElementById("closeDescModal");
  const visitLinkBtn = document.getElementById("visitLinkBtn");
  let currentVisitUrl = "";

  // 基础工具函数
  function escapeHtml(t) {
    return String(t).replace(/[&<>"']/g, m => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]
    ));
  }
  function getInitial(t) {
    t = (t || "?").trim();
    return t ? t[0].toUpperCase() : "?";
  }
  function getColor(t) {
    t = t || "?";
    let h = 0;
    for (let i = 0; i < t.length; i++) h = t.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h) % 360},60%,55%)`;
  }
  function normalizeUrl(u) {
    u = u.trim();
    return /^https?:\/\//i.test(u) ? u : "https://" + u;
  }
  function favicon(u) {
    try {
      const host = new URL(u).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    } catch (e) { return ""; }
  }

  // 保存到 localStorage
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }

  // 初始化数据
  function initData() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      try {
        categories = JSON.parse(s) || [];
        categories.forEach(cat => {
          (cat.bookmarks || []).forEach(b => {
            if (!("desc" in b)) b.desc = "";
          });
        });
      } catch (e) { categories = []; }
    }
    render();
  }

  // 下拉菜单
  dropdownBtn.onclick = e => {
    e.stopPropagation();
    renderDropdown();
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
  };
  function renderDropdown() {
    dropdownMenu.innerHTML = "";
    categories.forEach(c => {
      const d = document.createElement("div");
      d.textContent = c.name;
      d.onclick = () => { inputCategory.value = c.name; dropdownMenu.style.display = "none"; };
      dropdownMenu.appendChild(d);
    });
  }
  document.addEventListener("click", () => { dropdownMenu.style.display = "none"; });

  // 渲染分类与书签
  function render() {
    container.innerHTML = "";
    categories.forEach((cat, ci) => {
      const block = document.createElement("div");
      block.className = "category-block";
      block.draggable = true;
      block.dataset.index = ci;

      block.addEventListener("dragstart", e => {
        block.classList.add("dragging");
        e.dataTransfer.setData("text/plain", ci);
      });
      block.addEventListener("dragend", () => block.classList.remove("dragging"));
      block.addEventListener("dragover", e => {
        e.preventDefault();
        const dragging = document.querySelector(".category-block.dragging");
        if (!dragging) return;
        const blocks = [...container.children];
        const currentIndex = blocks.indexOf(block);
        const draggingIndex = blocks.indexOf(dragging);
        if (currentIndex !== draggingIndex) {
          if (currentIndex > draggingIndex) container.insertBefore(dragging, block.nextSibling);
          else container.insertBefore(dragging, block);
        }
      });
      block.addEventListener("drop", () => {
        const newOrder = [...container.children].map(b => categories[b.dataset.index]);
        categories = newOrder;
        save(); render();
      });

      const header = document.createElement("div");
      header.className = "category-header";
      header.innerHTML = `
        <span class="category-name">${escapeHtml(cat.name)}</span>
        <div class="category-actions">
          <button class="edit-cat" data-i="${ci}">改</button>
          <button class="del-cat" data-i="${ci}">删</button>
        </div>
      `;

      const grid = document.createElement("div");
      grid.className = "grid";
      (cat.bookmarks || []).forEach((b, bi) => grid.appendChild(createTile(ci, bi, b)));

      block.appendChild(header);
      block.appendChild(grid);
      container.appendChild(block);
    });

    document.querySelectorAll(".edit-cat").forEach(btn => {
      btn.onclick = () => openEditCategory(+btn.dataset.i);
    });
    document.querySelectorAll(".del-cat").forEach(btn => {
      btn.onclick = () => {
        const i = +btn.dataset.i;
        if (confirm(`删除分类“${categories[i].name}”？`)) {
          categories.splice(i, 1);
          save(); render();
        }
      };
    });
  }

  // 书签 tile
  function createTile(ci, bi, b) {
    const t = document.createElement("div");
    t.className = "tile";
    t.draggable = true;
    t.dataset.ci = ci;
    t.dataset.bi = bi;

    t.addEventListener("dragstart", () => t.classList.add("dragging"));
    t.addEventListener("dragend", () => t.classList.remove("dragging"));
    t.addEventListener("dragover", e => {
      e.preventDefault();
      const dragging = document.querySelector(".tile.dragging");
      if (!dragging) return;
      const grid = t.parentElement;
      const tiles = [...grid.children];
      const currentIndex = tiles.indexOf(t);
      const draggingIndex = tiles.indexOf(dragging);
      if (currentIndex !== draggingIndex) {
        if (currentIndex > draggingIndex) grid.insertBefore(dragging, t.nextSibling);
        else grid.insertBefore(dragging, t);
      }
    });
    t.addEventListener("drop", () => {
      const grid = t.parentElement;
      const newOrder = [...grid.children].map(tile => {
        const cci = tile.dataset.ci;
        const bbi = tile.dataset.bi;
        return categories[cci].bookmarks[bbi];
      });
      categories[ci].bookmarks = newOrder;
      save(); render();
    });

    t.onclick = e => {
      if (t.classList.contains("show-actions")) {
        currentVisitUrl = b.url;
        descContent.textContent = b.desc || "无说明";
        descModalBackdrop.style.display = "flex";
        t.classList.remove("show-actions");
      } else {
        document.querySelectorAll(".tile.show-actions").forEach(x => x.classList.remove("show-actions"));
        t.classList.add("show-actions");
      }
    };

    const logo = document.createElement("div");
    logo.className = "tile-logo";
    if (b.favicon) {
      const img = document.createElement("img");
      img.src = b.favicon;
      img.onerror = () => {
        logo.textContent = getInitial(b.title || b.url);
        logo.style.background = getColor(b.title || b.url);
      };
      logo.appendChild(img);
    } else {
      logo.textContent = getInitial(b.title || b.url);
      logo.style.background = getColor(b.title || b.url);
    }

    const title = document.createElement("div");
    title.className = "tile-title";
    title.textContent = b.title || b.url;

    const act = document.createElement("div");
    act.className = "tile-actions";

    const eBtn = document.createElement("button");
    eBtn.textContent = "改";
    eBtn.onclick = e => { e.stopPropagation(); openEditBookmark(ci, bi); };

    const dBtn = document.createElement("button");
    dBtn.textContent = "删";
    dBtn.onclick = e => {
      e.stopPropagation();
      if (confirm("删除书签？")) {
        categories[ci].bookmarks.splice(bi, 1);
        save(); render();
      }
    };

    act.append(eBtn, dBtn);
    t.append(logo, title, act);
    return t;
  }

  // 弹窗 show/hide
  function show(m) { m.style.display = "flex"; }
  function hide(m) { m.style.display = "none"; }

  function openAddBookmark() {
    modalTitle.textContent = "添加书签";
    inputCategory.value = ""; inputTitle.value = ""; inputUrl.value = ""; inputDesc.value = "";
    editingBookmark = { catIndex: null, bookmarkIndex: null };
    show(modalBackdrop);
  }

  function openEditBookmark(ci, bi) {
    modalTitle.textContent = "编辑书签";
    const b = categories[ci].bookmarks[bi];
    inputCategory.value = categories[ci].name;
    inputTitle.value = b.title || "";
    inputUrl.value = b.url || "";
    inputDesc.value = b.desc || "";
    editingBookmark = { catIndex: ci, bookmarkIndex: bi };
    show(modalBackdrop);
  }

  function openEditCategory(i) {
    inputCategoryName.value = categories[i].name;
    editingCatIndex = i;
    show(catModalBackdrop);
  }

  okModal.onclick = () => {
    let cat = inputCategory.value.trim();
    const title = inputTitle.value.trim();
    const url = inputUrl.value.trim();
    const desc = inputDesc.value.trim();
    if (!url) { alert("网址不能为空"); return; }
    if (!cat) cat = "默认";
    const u = normalizeUrl(url);
    const data = { title: title || u, url: u, favicon: favicon(u), desc: desc || "" };
    let ci = categories.findIndex(c => c.name === cat);
    if (ci === -1) { categories.push({ name: cat, bookmarks: [] }); ci = categories.length - 1; }
    if (editingBookmark.bookmarkIndex != null) {
      const old = editingBookmark;
      if (old.catIndex === ci) categories[ci].bookmarks[old.bookmarkIndex] = data;
      else {
        categories[old.catIndex].bookmarks.splice(old.bookmarkIndex, 1);
        categories[ci].bookmarks.push(data);
      }
    } else {
      categories[ci].bookmarks.push(data);
    }
    save(); render(); hide(modalBackdrop);
  };

  cancelModal.onclick = () => hide(modalBackdrop);
  modalBackdrop.onclick = e => { if (e.target === modalBackdrop) hide(modalBackdrop); };

  okCategoryModal.onclick = () => {
    const name = inputCategoryName.value.trim();
    if (!name) { alert("分类名称不能为空"); return; }
    if (editingCatIndex != null) {
      categories[editingCatIndex].name = name;
      editingCatIndex = null;
    }
    save(); render(); hide(catModalBackdrop);
  };
  cancelCategoryModal.onclick = () => hide(catModalBackdrop);
  catModalBackdrop.onclick = e => { if (e.target === catModalBackdrop) hide(catModalBackdrop); };

  addBookmarkBtn.onclick = openAddBookmark;

  // 点击空白隐藏 tile 操作
  document.addEventListener("click", e => {
    if (!e.target.closest(".tile")) {
      document.querySelectorAll(".tile.show-actions").forEach(t => t.classList.remove("show-actions"));
    }
  });

  // 说明弹窗事件
  closeDescModal.onclick = () => hide(descModalBackdrop);
  descModalBackdrop.onclick = e => { if (e.target === descModalBackdrop) hide(descModalBackdrop); };
  visitLinkBtn.onclick = () => {
    if (currentVisitUrl) { window.open(currentVisitUrl, "_blank"); hide(descModalBackdrop); }
  };

  /* ============================================================
      Gitee 同步 & 设置 & 命令面板相关底层
     ============================================================ */
  // ---------- 安全 base64 与 JSON ----------
  function safeBtoa(str) {
    try { return btoa(unescape(encodeURIComponent(str))); }
    catch (e) { console.warn('safeBtoa error', e); return ''; }
  }
  function safeAtob(b64) {
    try { return decodeURIComponent(escape(atob(b64))); }
    catch (e) { console.warn('safeAtob error', e); return ''; }
  }
  function safeParseJSON(str, fallback = null) {
    try { return JSON.parse(str); }
    catch (e) { console.warn('safeParseJSON error', e); return fallback; }
  }

  // ---------- 配置读写 ----------
  const SYNC_CFG_KEY = 'my_notes_gitee_cfg';
  function getSyncCfg() {
    const raw = localStorage.getItem(SYNC_CFG_KEY);
    return safeParseJSON(raw, { owner: '', token: '', repo: '', filePath: '我的数据库/资料库.json' }) || {};
  }
  function saveSyncCfg(cfg) {
    localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(cfg));
  }

  // ---------- 编码路径 ----------
  function encodeGiteePath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  // ---------- Gitee API 封装 ----------
  async function giteeGet(path, cfg) {
    const { owner, repo, token } = cfg;
    if (!owner || !repo || !token) throw new Error('缺少 Gitee 配置');
    const url = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${encodeGiteePath(path)}?access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${path} 失败: ${res.status}`);
    return res.json();
  }

  async function giteePut(path, contentB64, message, cfg) {
    const { owner, repo, token } = cfg;
    const url = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${encodeGiteePath(path)}`;
    // 先尝试获取 sha（如果文件存在）
    let sha = null;
    try {
      const exist = await giteeGet(path, cfg);
      if (exist && exist.sha) sha = exist.sha;
    } catch (e) { /* 文件不存在 */ }
    const body = { access_token: token, content: contentB64, message: message || 'update via app' };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`PUT ${path} 失败: ${res.status}`);
    return res.json();
  }

  async function giteeListDir(dirPath, cfg) {
    const { owner, repo, token } = cfg;
    const url = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${encodeGiteePath(dirPath)}?access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`列表 ${dirPath} 失败: ${res.status}`);
    return res.json();
  }

  // 获取文件内容并解码（返回文本）
  async function getGiteeFileContent(path, cfg) {
    const data = await giteeGet(path, cfg);
    if (!data || !data.content) throw new Error('文件内容为空');
    return safeAtob(data.content.replace(/\s/g, ''));
  }

  // ---------- 数据清洗 ----------
  function sanitizeNote(note) {
    if (!note || typeof note !== 'object') return null;
    const { history, ...rest } = note;
    return {
      title: String(rest.title || '未命名').trim(),
      url: String(rest.url || '').trim(),
      desc: String(rest.desc || '').trim(),
      favicon: String(rest.favicon || '').trim(),
    };
  }

  function dedupeNotesByTitle(notes) {
    const map = new Map();
    for (const n of notes) {
      if (!n || !n.title) continue;
      const key = n.title.trim().toLowerCase();
      if (!map.has(key)) map.set(key, n);
    }
    return [...map.values()];
  }

  const EMPTY_PLACEHOLDER = '{"notes":[]}';

  // 构建用于同步的 payload（标题去重、无 history）
  function buildSyncPayload(notes) {
    const clean = notes
      .filter(n => n && n.title && n.url)
      .map(sanitizeNote)
      .filter(Boolean);
    return JSON.stringify({ notes: dedupeNotesByTitle(clean) }, null, 2);
  }

  // 当前本地书签转化为 notes 数组
  function categoriesToNotes() {
    const notes = [];
    categories.forEach(cat => {
      (cat.bookmarks || []).forEach(b => {
        notes.push({
          title: b.title || b.url || '未命名',
          url: b.url || '',
          desc: b.desc || '',
          favicon: b.favicon || '',
          updatedAt: b.updatedAt || new Date().toISOString(),
        });
      });
    });
    return notes;
  }

  // 将 notes 合并回 categories
  function mergeNotesIntoCategories(notes) {
    if (!Array.isArray(notes)) return;
    // 收集现有分类名
    const catMap = new Map();
    categories.forEach(c => catMap.set(c.name, c));
    notes.forEach(n => {
      if (!n.title || !n.url) return;
      const catName = n.category || '导入';
      let cat = catMap.get(catName);
      if (!cat) {
        cat = { name: catName, bookmarks: [] };
        catMap.set(catName, cat);
        categories.push(cat);
      }
      // 简单判重（url + title）
      const exist = cat.bookmarks.some(b => b.url === n.url && b.title === n.title);
      if (!exist) {
        cat.bookmarks.push({
          title: n.title, url: n.url, desc: n.desc || '',
          favicon: n.favicon || favicon(n.url),
          updatedAt: n.updatedAt,
        });
      }
    });
  }

  /* ============================================================
      Gitee 同步弹窗交互
     ============================================================ */
  const giteeSyncBackdrop = document.getElementById('giteeSyncBackdrop');
  const giteeSyncClose = document.getElementById('giteeSyncClose');
  const syncOwner = document.getElementById('syncOwner');
  const syncRepo = document.getElementById('syncRepo');
  const syncFilePath = document.getElementById('syncFilePath');
  const syncStatus = document.getElementById('syncStatus');
  const syncFileList = document.getElementById('syncFileList');
  const btnSync = document.getElementById('btnSync');
  const btnUpload = document.getElementById('btnUpload');
  const btnDownload = document.getElementById('btnDownload');

  function openGiteeSync() {
    const cfg = getSyncCfg();
    syncOwner.textContent = cfg.owner || '未配置';
    syncRepo.textContent = cfg.repo || '未配置';
    syncFilePath.textContent = cfg.filePath || '我的数据库/资料库.json';
    syncStatus.classList.remove('show', 'error');
    syncFileList.classList.remove('show');
    syncFileList.innerHTML = '';
    giteeSyncBackdrop.style.display = 'flex';
  }
  function closeGiteeSync() { giteeSyncBackdrop.style.display = 'none'; }

  giteeSyncClose.onclick = closeGiteeSync;
  giteeSyncBackdrop.onclick = e => { if (e.target === giteeSyncBackdrop) closeGiteeSync(); };

  // 状态消息
  function setSyncStatus(msg, isError) {
    syncStatus.textContent = msg;
    syncStatus.classList.add('show');
    syncStatus.classList.toggle('error', !!isError);
  }

  // ☁️ 一键同步
  btnSync.onclick = async () => {
    const cfg = getSyncCfg();
    if (!cfg.owner || !cfg.token || !cfg.repo) {
      setSyncStatus('❌ 请先在 Gitee 设置中配置账号、令牌和仓库', true);
      return;
    }
    btnSync.disabled = true;
    try {
      setSyncStatus('⏳ 正在读取远端主文件...');
      let remoteNotes = [];
      let remoteValid = false;
      try {
        const text = await getGiteeFileContent(cfg.filePath, cfg);
        const parsed = safeParseJSON(text, null);
        if (parsed && Array.isArray(parsed.notes)) {
          remoteNotes = parsed.notes;
          remoteValid = remoteNotes.length > 0;
        }
      } catch (e) { /* 远端无效 */ }

      const localNotes = categoriesToNotes();

      if (!remoteValid) {
        setSyncStatus('📤 远端为空，自动上传本地数据...');
        const payload = buildSyncPayload(localNotes);
        await giteePut(cfg.filePath, safeBtoa(payload), 'sync: 初始上传', cfg);
        setSyncStatus('✅ 远端无有效数据，已上传本地');
        return;
      }

      // 比较数量和最新 updatedAt
      const remoteCount = remoteNotes.length;
      const localCount = localNotes.length;
      const remoteLatest = remoteNotes.reduce((max, n) => Math.max(max, new Date(n.updatedAt || 0).getTime()), 0);
      const localLatest = localNotes.reduce((max, n) => Math.max(max, new Date(n.updatedAt || 0).getTime()), 0);

      if (remoteCount >= localCount && remoteLatest >= localLatest) {
        if (confirm('远端数据较新且数量不少于本地，是否用远端覆盖本地？\n（取消则改为上传本地覆盖远端）')) {
          // 远端覆盖本地
          categories = [];
          mergeNotesIntoCategories(remoteNotes);
          save(); render();
          setSyncStatus('✅ 已用远端覆盖本地');
        } else {
          if (confirm('确定用本地数据覆盖远端吗？')) {
            const payload = buildSyncPayload(localNotes);
            await giteePut(cfg.filePath, safeBtoa(payload), 'sync: 本地覆盖远端', cfg);
            setSyncStatus('✅ 已用本地覆盖远端');
          } else {
            setSyncStatus('⏹ 已取消');
          }
        }
      } else {
        // 本地更新或更多 → 上传
        setSyncStatus('📤 本地数据较新，正在上传...');
        const payload = buildSyncPayload(localNotes);
        await giteePut(cfg.filePath, safeBtoa(payload), 'sync: 上传本地', cfg);
        setSyncStatus('✅ 已上传本地到远端');
      }
    } catch (e) {
      console.error(e);
      setSyncStatus('❌ ' + (e.message || '同步失败'), true);
    } finally {
      btnSync.disabled = false;
    }
  };

  // ⬆ 上传
  btnUpload.onclick = async () => {
    const cfg = getSyncCfg();
    if (!cfg.owner || !cfg.token || !cfg.repo) {
      setSyncStatus('❌ 请先在 Gitee 设置中配置账号、令牌和仓库', true);
      return;
    }
    btnUpload.disabled = true;
    try {
      // 选择本地 JSON
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,application/json';
      const file = await new Promise(res => {
        fileInput.onchange = e => res(e.target.files[0]);
        fileInput.click();
      });
      if (!file) { setSyncStatus('⏹ 未选择文件'); return; }

      const prefix = prompt('输入文件名前缀（如 A厂、资料库）', '资料库');
      if (!prefix || !prefix.trim()) { setSyncStatus('⏹ 已取消上传'); return; }

      const text = await file.text();
      const parsed = safeParseJSON(text, null);
      if (!parsed || !Array.isArray(parsed.notes)) {
        setSyncStatus('❌ 文件格式不正确，需要 { notes: [...] }', true);
        return;
      }

      // 查远端目录，自动编号
      const dir = cfg.filePath.substring(0, cfg.filePath.lastIndexOf('/')) || '';
      let existingNames = [];
      try {
        const list = await giteeListDir(dir, cfg);
        if (Array.isArray(list)) existingNames = list.map(item => item.name);
      } catch (e) { /* 目录可能不存在 */ }

      const today = new Date().toISOString().slice(0, 10);
      const base = prefix.trim() + '-' + today;
      let seq = 1, finalName;
      do {
        finalName = base + 'T' + seq + '.json';
        seq++;
      } while (existingNames.includes(finalName));

      const targetPath = (dir ? dir + '/' : '') + finalName;
      const payload = JSON.stringify({ notes: parsed.notes }, null, 2);
      setSyncStatus('⏳ 正在上传 ' + finalName + ' ...');
      await giteePut(targetPath, safeBtoa(payload), 'upload: ' + finalName, cfg);
      setSyncStatus('✅ 已上传 ' + finalName);
    } catch (e) {
      console.error(e);
      setSyncStatus('❌ 上传失败：' + (e.message || ''), true);
    } finally {
      btnUpload.disabled = false;
    }
  };

  // ⬇ 下载
  btnDownload.onclick = async () => {
    const cfg = getSyncCfg();
    if (!cfg.owner || !cfg.token || !cfg.repo) {
      setSyncStatus('❌ 请先在 Gitee 设置中配置账号、令牌和仓库', true);
      return;
    }
    btnDownload.disabled = true;
    try {
      const dir = cfg.filePath.substring(0, cfg.filePath.lastIndexOf('/')) || '';
      setSyncStatus('⏳ 正在获取文件列表...');
      const list = await giteeListDir(dir, cfg);
      const jsonFiles = (Array.isArray(list) ? list : [])
        .filter(item => item.name.endsWith('.json'))
        .sort((a, b) => b.name.localeCompare(a.name));

      if (jsonFiles.length === 0) {
        setSyncStatus('⚠️ 远端没有 .json 文件');
        return;
      }

      syncFileList.innerHTML = '';
      jsonFiles.forEach(f => {
        const row = document.createElement('div');
        row.className = 'sync-file-item';
        row.innerHTML = `<span class="fname">${escapeHtml(f.name)}</span><span class="fsize">${(f.size / 1024).toFixed(1)} KB</span>`;
        row.onclick = () => openDlPick(f, cfg);
        syncFileList.appendChild(row);
      });
      syncFileList.classList.add('show');
      setSyncStatus('✅ 请选择要下载的文件');
    } catch (e) {
      console.error(e);
      setSyncStatus('❌ 获取列表失败：' + (e.message || ''), true);
    } finally {
      btnDownload.disabled = false;
    }
  };

  /* ---------- 下载选择小窗 ---------- */
  const dlPickBackdrop = document.getElementById('dlPickBackdrop');
  const dlPickName = document.getElementById('dlPickName');
  const dlPickSize = document.getElementById('dlPickSize');
  const dlToPhone = document.getElementById('dlToPhone');
  const dlImportLib = document.getElementById('dlImportLib');
  const dlCancel = document.getElementById('dlCancel');
  let currentDlFile = null;
  let currentDlCfg = null;

  function openDlPick(file, cfg) {
    currentDlFile = file;
    currentDlCfg = cfg;
    dlPickName.textContent = file.name;
    dlPickSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
    dlPickBackdrop.style.display = 'flex';
  }
  function closeDlPick() {
    dlPickBackdrop.style.display = 'none';
    currentDlFile = null;
    currentDlCfg = null;
  }

  dlCancel.onclick = closeDlPick;
  dlPickBackdrop.onclick = e => { if (e.target === dlPickBackdrop) closeDlPick(); };

  // 下载到手机
  dlToPhone.onclick = async () => {
    if (!currentDlFile || !currentDlCfg) return;
    try {
      const cfg = currentDlCfg;
      const text = await getGiteeFileContent(currentDlFile.path, cfg);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentDlFile.name;
      a.click();
      URL.revokeObjectURL(url);
      closeDlPick();
      setSyncStatus('✅ 已下载 ' + currentDlFile.name);
    } catch (e) {
      console.error(e);
      setSyncStatus('❌ 下载失败：' + (e.message || ''), true);
    }
  };

  // 导入资料库
  dlImportLib.onclick = async () => {
    if (!currentDlFile || !currentDlCfg) return;
    if (!confirm(`确定导入 “${currentDlFile.name}” 并覆盖当前资料库吗？`)) return;
    try {
      const cfg = currentDlCfg;
      const text = await getGiteeFileContent(currentDlFile.path, cfg);
      const parsed = safeParseJSON(text, null);
      if (!parsed || !Array.isArray(parsed.notes)) {
        alert('文件格式错误：缺少 notes 数组');
        return;
      }
      // 清洗并合并
      const cleanNotes = parsed.notes.map(sanitizeNote).filter(Boolean);
      const deduped = dedupeNotesByTitle(cleanNotes);
      categories = [];
      mergeNotesIntoCategories(deduped);
      save(); render();
      closeDlPick();
      closeGiteeSync();
      alert('✅ 导入成功');
    } catch (e) {
      console.error(e);
      setSyncStatus('❌ 导入失败：' + (e.message || ''), true);
    }
  };

  /* ============================================================
      ⌘ 命令面板
     ============================================================ */
  const cmdBackdrop = document.getElementById('cmdBackdrop');
  const cmdList = document.getElementById('cmdList');

  const CMD_ITEMS = [
    { id: 'gitee', label: '⚙️ Gitee 设置', desc: '配置仓库 · 导入 · 导出', run: () => openGiteeSet() },
    { id: 'import', label: '📥 导入 JSON', desc: '从文件合并到资料库', run: () => importJSON() },
    { id: 'export', label: '📤 导出 JSON', desc: '导出到本地文件', run: () => exportJSON() },
    { id: 'clear', label: '⚠️ 清空数据', desc: '删除全部资料（不可恢复）', run: () => openClearData(), danger: true },
  ];

  let cmdVisible = false;
  let cmdSelIndex = 0;

  function openCmd() {
    cmdVisible = true;
    cmdBackdrop.style.display = 'flex';
    renderCmd('');
    setTimeout(() => {
      const first = cmdList.querySelector('.cmd-item');
      if (first) { cmdSelIndex = 0; first.classList.add('sel'); }
    }, 50);
  }

  function closeCmd() {
    cmdVisible = false;
    cmdBackdrop.style.display = 'none';
  }

  function renderCmd(q) {
    const query = (q || '').trim().toLowerCase();
    const filtered = query
      ? CMD_ITEMS.filter(it => it.label.toLowerCase().includes(query) || it.desc.toLowerCase().includes(query))
      : CMD_ITEMS;

    cmdList.innerHTML = '';
    if (filtered.length === 0) {
      cmdList.innerHTML = '<div class="cmd-empty">无匹配</div>';
      return;
    }

    filtered.forEach((it, idx) => {
      const el = document.createElement('div');
      el.className = 'cmd-item' + (it.danger ? ' danger' : '') + (idx === cmdSelIndex ? ' sel' : '');
      el.dataset.id = it.id;
      el.innerHTML = `
        <span class="cmd-icon">${it.label.slice(0, 2)}</span>
        <div class="cmd-text">
          <div class="cmd-label">${it.label.slice(2)}</div>
          <div class="cmd-desc">${it.desc}</div>
        </div>
      `;
      el.onclick = (e) => {
        e.stopPropagation();
        closeCmd();
        setTimeout(() => it.run(), 50);
      };
      cmdList.appendChild(el);
    });
  }

  // 键盘 ↑↓ Enter Esc
  document.addEventListener('keydown', (e) => {
    if (!cmdVisible) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCmd();
      }
      return;
    }
    const items = [...cmdList.querySelectorAll('.cmd-item')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      cmdSelIndex = (cmdSelIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle('sel', i === cmdSelIndex));
      items[cmdSelIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = items[cmdSelIndex];
      if (sel) sel.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCmd();
    }
  });

  // 点击遮罩关闭
  cmdBackdrop.onclick = (e) => { if (e.target === cmdBackdrop) closeCmd(); };

  // 外部按钮打开命令面板
  document.getElementById('cmdPanelBtn').onclick = () => openCmd();

  // 快捷键 Ctrl/⌘+K 注册完成

  /* ============================================================
      Gitee 设置弹窗（带锁）
     ============================================================ */
  const giteeSetBackdrop = document.getElementById('giteeSetBackdrop');
  const giteeSetClose = document.getElementById('giteeSetClose');
  const giteeSetBody = document.getElementById('giteeSetBody');
  const setOwner = document.getElementById('setOwner');
  const setToken = document.getElementById('setToken');
  const setRepo = document.getElementById('setRepo');
  const setFilePath = document.getElementById('setFilePath');
  const unlockGiteeSet = document.getElementById('unlockGiteeSet');
  const lockOverlay = document.getElementById('lockOverlay');
  const saveGiteeSet = document.getElementById('saveGiteeSet');
  const toggleTokenEye = document.getElementById('toggleTokenEye');

  let isLocked = true;
  let lockTimer = null;

  function resetLockTimer() {
    if (lockTimer) clearTimeout(lockTimer);
    lockTimer = setTimeout(() => {
      if (!isLocked) setLocked(true);
    }, 10000);
  }

  function setLocked(locked) {
    isLocked = locked;
    [setOwner, setToken, setRepo, setFilePath].forEach(el => el.disabled = locked);
    saveGiteeSet.disabled = locked;
    unlockGiteeSet.disabled = !locked;
    lockOverlay.classList.toggle('show', locked);
    if (locked) {
      unlockGiteeSet.textContent = '● 开启';
    } else {
      unlockGiteeSet.textContent = '🔓 已解锁';
      resetLockTimer();
    }
  }

  unlockGiteeSet.onclick = () => {
    if (isLocked) {
      setLocked(false);
      setOwner.focus();
    } else {
      setLocked(true);
    }
  };

  // 加载配置到设置弹窗
  function loadGiteeSetFields() {
    const cfg = getSyncCfg();
    setOwner.value = cfg.owner || '';
    setToken.value = cfg.token || '';
    setRepo.value = cfg.repo || '';
    setFilePath.value = cfg.filePath || '我的数据库/资料库.json';
  }

  function openGiteeSet() {
    loadGiteeSetFields();
    setLocked(true);
    giteeSetBackdrop.style.display = 'flex';
  }
  function closeGiteeSet() {
    giteeSetBackdrop.style.display = 'none';
    if (lockTimer) clearTimeout(lockTimer);
  }

  giteeSetClose.onclick = closeGiteeSet;
  giteeSetBackdrop.onclick = e => { if (e.target === giteeSetBackdrop) closeGiteeSet(); };

  // 令牌可见切换
  toggleTokenEye.onclick = () => {
    if (setToken.type === 'password') {
      setToken.type = 'text';
      toggleTokenEye.textContent = '🙈 隐藏令牌';
    } else {
      setToken.type = 'password';
      toggleTokenEye.textContent = '👁 显示令牌';
    }
  };

  // 保存设置
  saveGiteeSet.onclick = () => {
    const cfg = {
      owner: setOwner.value.trim(),
      token: setToken.value.trim(),
      repo: setRepo.value.trim(),
      filePath: setFilePath.value.trim() || '我的数据库/资料库.json',
    };
    if (!cfg.owner || !cfg.token || !cfg.repo) {
      alert('用户名、令牌、仓库名不能为空');
      return;
    }
    saveSyncCfg(cfg);
    alert('✅ 设置已保存');
    setLocked(true);
  };

  // 命令面板用到的导入/导出/清空
  function importJSON() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const data = safeParseJSON(text, null);
        if (!data || !Array.isArray(data.notes)) {
          alert('文件格式不正确，需要 { notes: [...] }');
          return;
        }
        const clean = data.notes.map(sanitizeNote).filter(Boolean);
        const deduped = dedupeNotesByTitle(clean);
        mergeNotesIntoCategories(deduped);
        save(); render();
        alert('✅ 导入成功');
      } catch (err) {
        alert('导入失败：' + (err.message || 'JSON 解析错误'));
      }
    };
    fileInput.click();
  }

  function exportJSON() {
    const notes = categoriesToNotes();
    const payload = buildSyncPayload(notes);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function openClearData() {
    const input = prompt('请输入「清空」以确认删除所有数据（分类和Gitee设置将保留）');
    if (input !== '清空') { alert('已取消'); return; }
    if (!confirm('再次确认：删除全部书签和分类？此操作不可恢复！')) return;
    categories = [];
    save(); render();
    alert('✅ 已清空');
  }

  // 顶部 Gitee 同步按钮
  document.getElementById('giteeSyncBtn').onclick = () => openGiteeSync();

  // 刷新按钮
  document.getElementById('refreshBtn').onclick = () => {
    if (confirm('刷新页面？')) location.reload();
  };

  // 挂载全局供命令面板调用
  window.openGiteeSet = openGiteeSet;
  window.importJSON = importJSON;
  window.exportJSON = exportJSON;
  window.openClearData = openClearData;

  // 启动
  initData();

  // 全局按 Esc 关闭所有弹窗（按层级）
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (cmdVisible) { closeCmd(); return; }
    if (giteeSetBackdrop.style.display === 'flex') { closeGiteeSet(); return; }
    if (dlPickBackdrop.style.display === 'flex') { closeDlPick(); return; }
    if (giteeSyncBackdrop.style.display === 'flex') { closeGiteeSync(); return; }
  });

})();
