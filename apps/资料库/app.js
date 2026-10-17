
/* ================= 分类配置 ================= */
const CATS_KEY = 'my_notes_categories_v2';

const DEFAULT_CATS_CONFIG = [
  {name:'中药材', fields:['产地','性味','功效','用量','疗程','禁忌'], builtin:true},
  {name:'养生',   fields:['适用人群','功效','方法','频率','注意'], builtin:true},
  {name:'偏方',   fields:['来源','材料','做法','用法','疗程','禁忌'], builtin:true},
  {name:'疾病',   fields:['症状','病因','调理','饮食','就医建议'], builtin:true},
  {name:'书籍',   fields:['作者','出版社','核心观点','摘录'], builtin:true},
  {name:'其他',   fields:[], builtin:true},
];

let categories = [];

function loadCats(){
  try{
    const raw = localStorage.getItem(CATS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed) && parsed.length){
        categories = parsed;
        return;
      }
    }
  }catch(e){}
  categories = JSON.parse(JSON.stringify(DEFAULT_CATS_CONFIG));
}
function saveCats(){
  localStorage.setItem(CATS_KEY, JSON.stringify(categories));
}
function getCatByName(name){
  return categories.find(c=>c.name === name);
}
function getCatFields(name){
  const c = getCatByName(name);
  return c ? c.fields.slice() : [];
}

/* ================= 数据层 ================= */
const STORE_KEY = 'my_notes_v4';
const VIEW_KEY = 'my_notes_view';
const SPLIT_KEY = 'my_notes_split';

let notes = [];
let filter = { category: '', tag: '', keyword: '' };
let currentData = [];
let currentIndex = 0;
let viewMode = localStorage.getItem(VIEW_KEY) || 'card';
let splitPercent = parseInt(localStorage.getItem(SPLIT_KEY), 10);
if(!splitPercent || splitPercent < 20 || splitPercent > 80) splitPercent = 45;

function loadLocal(){
  try{ notes = JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch(e){ notes = []; }
}
function saveLocal(){ localStorage.setItem(STORE_KEY, JSON.stringify(notes)); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function today(){ return new Date().toISOString().slice(0,10); }

/* ================= 工具 ================= */
function esc(s){
  return String(s??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function isLink(src){ return /^https?:\/\//i.test(String(src||'')); }
function hl(html, kw){
  if(!kw) return html;
  return html.replace(/(>|^)([^<]+)/g, (m, pre, text)=>{
    let out = text;
    kw.split(/\s+/).filter(Boolean).forEach(w=>{
      const re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return pre + out;
  });
}
function md(src){
  let s = String(src);
  s = s.replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  s = s.replace(/\[\[([^\]]+)\]\]/g, (m,t)=>
    `<a class="wikilink" data-wikilink="${esc(t)}">${esc(t)}</a>`);
  s = s.replace(/```([\s\S]*?)```/g, (m,c)=>`<pre>${c.trim()}</pre>`);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  s = s.replace(/^######\s+(.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^#####\s+(.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^####\s+(.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  s = s.replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>');
  s = s.replace(/^---+$/gm, '<hr>');
  s = s.replace(/(?:^[-*+]\s+.+(?:\n|$))+/gm, m=>{
    const items = m.trim().split('\n').map(l=>`<li>${l.replace(/^[-*+]\s+/,'')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  s = s.replace(/((?:^\|.+\|\s*$\n?)+)/gm, block=>{
    const lines = block.trim().split('\n');
    if(lines.length < 2) return block;
    const cells = l => l.split('|').slice(1,-1).map(c=>c.trim());
    const head = cells(lines[0]);
    const body = lines.slice(2).map(cells);
    return `<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${body.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  });
  s = s.replace(/\n/g, '<br>');
  s = s.replace(/<\/(h1|h2|h3|ul|ol|pre|blockquote|table|hr)><br>/g, '</$1>');
  s = s.replace(/<br><(h1|h2|h3|ul|ol|pre|blockquote|table|hr)/g, '<$1');
  s = s.replace(/<hr><br>/g, '<hr>');
  return s;
}

function tokenize(s){
  return new Set(String(s||'').toLowerCase()
    .replace(/[，。！？、；：""''（）《》\[\]【】,.!?;:()\[\]{}]/g,' ')
    .split(/\s+/).filter(Boolean));
}
function jaccard(a, b){
  if(!a.size && !b.size) return 0;
  let inter = 0;
  a.forEach(x=>{ if(b.has(x)) inter++; });
  return inter / (a.size + b.size - inter);
}
function similarTitle(a, b){
  a = String(a||'').trim(); b = String(b||'').trim();
  if(!a || !b) return 0;
  if(a === b) return 1;
  return jaccard(tokenize(a), tokenize(b));
}
function similarContent(a, b){
  a = String(a||'').slice(0,200); b = String(b||'').slice(0,200);
  if(!a || !b) return 0;
  return jaccard(tokenize(a), tokenize(b));
}

/* ================= 分类下拉重建 ================= */
function rebuildCategorySelect(selected){
  const sel = document.getElementById('fCategory');
  if(!sel) return;
  const cur = selected !== undefined ? selected : sel.value;
  let html = `<option value="">— 无 —</option>`;
  categories.forEach(c=>{
    html += `<option value="${esc(c.name)}">${esc(c.name)}</option>`;
  });
  sel.innerHTML = html;
  if(cur){
    sel.value = cur;
    if(sel.value !== cur) sel.value = '';
  }
}

/* ================= 侧边栏 ================= */
const sidebarEl = document.getElementById('sidebar');
const overlayEl = document.getElementById('overlay');
const catListEl = document.getElementById('catList');
const tagCloudEl = document.getElementById('tagCloud');

function openSidebar(){ sidebarEl.classList.add('open'); overlayEl.classList.add('show'); }
function closeSidebar(){ sidebarEl.classList.remove('open'); overlayEl.classList.remove('show'); }
document.getElementById('btnMenu').onclick = openSidebar;
overlayEl.onclick = closeSidebar;

function renderSidebar(){
  const catMap = {};
  notes.forEach(n=>{
    const c = n.category || '未分类';
    catMap[c] = (catMap[c]||0)+1;
  });
  const cats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  let html = `<div class="nav-item ${!filter.category?'active':''}" data-cat="">
      <span>全部</span><span class="count">${notes.length}</span></div>`;
  cats.forEach(([c,n])=>{
    html += `<div class="nav-item ${filter.category===c?'active':''}" data-cat="${esc(c)}">
      <span>${esc(c)}</span><span class="count">${n}</span></div>`;
  });
  catListEl.innerHTML = html;

  const tagMap = {};
  notes.forEach(n=>(n.tags||[]).forEach(t=>{ tagMap[t]=(tagMap[t]||0)+1; }));
  const tags = Object.entries(tagMap).sort((a,b)=>b[1]-a[1]);
  tagCloudEl.innerHTML = tags.length
    ? tags.map(([t,n])=>`<span class="tag-chip ${filter.tag===t?'active':''}" data-tag="${esc(t)}">${esc(t)}<span class="n">${n}</span></span>`).join('')
    : `<span style="color:#aaa;font-size:12px;padding:4px 8px;">暂无标签</span>`;
}

catListEl.addEventListener('click', e=>{
  const item = e.target.closest('.nav-item'); if(!item) return;
  filter.category = item.dataset.cat;
  currentIndex = 0;
  renderAll();
  closeSidebar();
});
tagCloudEl.addEventListener('click', e=>{
  const chip = e.target.closest('.tag-chip'); if(!chip) return;
  filter.tag = filter.tag === chip.dataset.tag ? '' : chip.dataset.tag;
  currentIndex = 0;
  renderAll();
  closeSidebar();
});

/* ================= 主渲染 ================= */
const swiperEl = document.getElementById('swiper');
const listviewEl = document.getElementById('listview');
const counterEl = document.getElementById('counter');

function matchKw(n, kw){
  if(!kw) return true;
  const hay = [
    n.title, n.category, (n.tags||[]).join(' '),
    Object.entries(n.fields||{}).map(([k,v])=>k+' '+v).join(' '),
    n.content
  ].join(' ').toLowerCase();
  return kw.split(/\s+/).every(w=>hay.includes(w));
}

function getFiltered(){
  const kw = filter.keyword.trim().toLowerCase();
  let data = notes.filter(n=>{
    if(filter.category && (n.category||'未分类') !== filter.category) return false;
    if(filter.tag && !(n.tags||[]).includes(filter.tag)) return false;
    return matchKw(n, kw);
  });
  data.sort((a,b)=>{
    if(!!b.star !== !!a.star) return b.star ? 1 : -1;
    return (b.updatedAt||'').localeCompare(a.updatedAt||'');
  });
  return data;
}

function getRelated(n){
  const myTags = new Set(n.tags||[]);
  if(!myTags.size) return [];
  return notes
    .filter(x=>x.id !== n.id)
    .map(x=>{
      const t = new Set(x.tags||[]);
      let inter = 0;
      myTags.forEach(v=>{ if(t.has(v)) inter++; });
      return { note: x, score: inter };
    })
    .filter(x=>x.score > 0)
    .sort((a,b)=>b.score - a.score)
    .slice(0,5)
    .map(x=>x.note);
}

function getBacklinks(n){
  const title = String(n.title||'').trim();
  if(!title) return [];
  const pattern = '[[' + title + ']]';
  return notes.filter(x=>x.id !== n.id && String(x.content||'').includes(pattern));
}

function getLinkImg(n){
  return (n.images||[]).find(src=>isLink(src)) || '';
}
function getLocalImgs(n){
  return (n.images||[]).filter(src=>!isLink(src));
}

function cardHTML(n, kw){
  const titleHTML = `<h3 class="card-title">${hl(esc(n.title||'（无标题）'), kw)}</h3>`;
  const catHTML = n.category ? `<span class="card-cat">${esc(n.category)}</span>` : '';
  const tagsHTML = (n.tags||[]).map(t=>`<span class="card-tag">${esc(t)}</span>`).join('');
  const metaHTML = (catHTML || tagsHTML)
    ? `<div class="card-meta">${catHTML}${tagsHTML}</div>` : '';

  const linkImg = getLinkImg(n);
  const localImgs = getLocalImgs(n);

  const copyLinkBtn = linkImg
    ? `<button class="card-copy-link" data-act="copyLink" data-id="${n.id}" title="复制图片链接">📋 复制链接</button>`
    : '';
  const imgBadge = localImgs.length
    ? `<button class="card-imgs-badge" data-act="imgs" data-id="${n.id}" title="查看本地图片">🖼 ${localImgs.length}</button>`
    : '';

  const fieldRows = Object.entries(n.fields||{})
    .filter(([k,v])=>k||v)
    .map(([k,v])=>
      `<div class="field-row">
         <span class="fk">${esc(k)}</span>
         <span class="fv">${hl(esc(v), kw)}</span>
       </div>`
    ).join('');
  const fieldsHTML = fieldRows ? `<div class="card-fields">${fieldRows}</div>` : '';

  const contentHTML = n.content
    ? `<div class="content">${md(hl(n.content, kw))}</div>`
    : '<div class="content" style="color:#bbb;font-size:12px;">（无正文）</div>';

  const related = getRelated(n);
  const backlinks = getBacklinks(n);
  let relationsHTML = '';
  if(related.length || backlinks.length){
    relationsHTML = `<div class="card-relations">`;
    if(related.length){
      relationsHTML += `<div class="rel-line">
        <span class="rel-label">相关：</span>
        ${related.map(r=>`<span class="rel-item" data-act="jump" data-title="${esc(r.title)}">${esc(r.title)}</span>`).join('')}
      </div>`;
    }
    if(backlinks.length){
      relationsHTML += `<div class="rel-line">
        <span class="rel-label">被引用：</span>
        ${backlinks.map(b=>`<span class="rel-item" data-act="jump" data-title="${esc(b.title)}">${esc(b.title)}</span>`).join('')}
      </div>`;
    }
    relationsHTML += `</div>`;
  }

  return `
  <div class="card" data-id="${n.id}">
    <div class="card-body">
      <div class="card-head">
        ${titleHTML}
        ${copyLinkBtn}
        ${imgBadge}
        <button class="card-star ${n.star?'on':''}" data-act="star" title="收藏">
          ${n.star?'★':'☆'}
        </button>
      </div>
      ${metaHTML}
      <div class="card-split">
        <div class="card-upper">
          ${fieldsHTML}
        </div>
        <div class="split-handle" data-split-handle title="上下拖动调整比例">
          <span class="sh-label">
            <span class="sh-grip"><i></i><i></i></span>
            <span class="sh-text">正文</span>
            <span class="sh-num">0 / 0</span>
            <span class="sh-grip"><i></i><i></i></span>
          </span>
        </div>
        <div class="card-lower">
          ${contentHTML}
        </div>
      </div>
    </div>
    ${relationsHTML}
    <div class="card-time">
      <span>创建：${n.createdAt||''}</span>
      <span>更新：${n.updatedAt||''}</span>
    </div>
    <div class="ops">
      <button data-act="edit">编辑</button>
      <button data-act="copy">复制</button>
      <button data-act="history">历史</button>
      <button data-act="del" class="danger">删除</button>
    </div>
  </div>`;
}

function listItemHTML(n){
  const cat = n.category ? `<span class="lc">${esc(n.category)}</span>` : '';
  const tags = (n.tags||[]).slice(0,3).map(t=>`<span class="tag-mini">${esc(t)}</span>`).join('');
  const localCount = getLocalImgs(n).length;
  const hasLink = !!getLinkImg(n);
  let imgBadge = '';
  if(localCount) imgBadge += `<span class="img-badge">🖼 ${localCount}</span>`;
  if(hasLink) imgBadge += `<span class="img-badge">📋 链接</span>`;
  let summary = '';
  const firstField = Object.entries(n.fields||{})[0];
  if(firstField) summary = `${firstField[0]} ${firstField[1]}`;
  else if(n.content) summary = String(n.content).replace(/\[\[|\]\]/g,'').slice(0,60);
  return `
  <div class="list-item" data-id="${n.id}">
    <div class="row1">
      <span class="lt">${esc(n.title||'（无标题）')}</span>
      <span class="ls ${n.star?'on':''}">${n.star?'★':'☆'}</span>
    </div>
    <div class="row2">${cat}${tags}${imgBadge}
      ${summary?`<span style="margin-left:6px;color:#888;">${esc(summary)}</span>`:''}
    </div>
  </div>`;
}

function renderAll(){
  currentData = getFiltered();
  const kw = filter.keyword.trim().toLowerCase();

  if(!currentData.length){
    const emptyHTML = `<div class="empty-slide">
      <div class="big">🗂️</div>
      <div>${filter.category || filter.tag || kw ? '没有匹配的结果' : '还没有资料，点「＋ 新建」开始吧'}</div>
    </div>`;
    swiperEl.innerHTML = emptyHTML;
    listviewEl.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#888;">${filter.category || filter.tag || kw ? '没有匹配的结果' : '还没有资料'}</div>`;
    updateCounter();
    renderSidebar();
    return;
  }

  swiperEl.innerHTML = currentData.map(n=>
    `<div class="slide">${cardHTML(n, kw)}</div>`
  ).join('');

  listviewEl.innerHTML = currentData.map(n=>listItemHTML(n)).join('');

  if(currentIndex >= currentData.length) currentIndex = currentData.length - 1;
  if(currentIndex < 0) currentIndex = 0;

  requestAnimationFrame(()=>{
    swiperEl.scrollLeft = currentIndex * swiperEl.clientWidth;
    updateCounter();
    applyViewMode();
  });

  renderSidebar();
}

function applyViewMode(){
  if(viewMode === 'list'){
    swiperEl.classList.add('hide');
    listviewEl.classList.add('show');
    document.getElementById('btnView').textContent = '▢';
  }else{
    swiperEl.classList.remove('hide');
    listviewEl.classList.remove('show');
    document.getElementById('btnView').textContent = '▤';
  }
}

function updateCounter(){
  const total = currentData.length;
  const idx = total ? currentIndex + 1 : 0;
  const catLabel = filter.category || (filter.tag ? '#'+filter.tag : '全部');

  if(!total){
    counterEl.innerHTML = `<span class="cat">${esc(catLabel)}</span>
      <span class="num"><span class="now">0</span></span>`;
    return;
  }

  counterEl.innerHTML = `
    <span class="cat">${esc(catLabel)}</span>
    <span class="num" id="numClick">
      <span class="now">${idx}</span>
      <span class="sep">/</span>
      <span class="total">${total}</span>
    </span>`;
  const numClick = document.getElementById('numClick');
  if(numClick) numClick.onclick = openJump;
}

let scrollTimer = null;
swiperEl.addEventListener('scroll', ()=>{
  if(scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(()=>{
    const w = swiperEl.clientWidth;
    const i = Math.round(swiperEl.scrollLeft / w);
    if(i !== currentIndex){
      currentIndex = i;
      updateCounter();
    }
  }, 60);
}, {passive:true});

swiperEl.addEventListener('wheel', e=>{
  if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
    e.preventDefault();
    swiperEl.scrollLeft += e.deltaY;
  }
}, {passive:false});

document.addEventListener('keydown', e=>{
  if(document.getElementById('editor').classList.contains('show')) return;
  if(document.getElementById('cmd').classList.contains('show')) return;
  if(document.getElementById('jump').classList.contains('show')) return;
  if(document.getElementById('catMgr').classList.contains('show')) return;
  if(document.getElementById('catEdit').classList.contains('show')) return;
  if(document.getElementById('switchConfirm').classList.contains('show')) return;
  if(document.getElementById('syncPanel').classList.contains('show')) return;
  if(document.getElementById('gallery').classList.contains('show')){
    if(e.key === 'Escape') closeGallery();
    if(e.key === 'ArrowLeft') galleryPrev();
    if(e.key === 'ArrowRight') galleryNext();
    return;
  }
  if(e.target.matches('input, textarea, select')) return;
  if(viewMode !== 'card') return;
  if(e.key === 'ArrowLeft'){ e.preventDefault(); goTo(currentIndex - 1); }
  if(e.key === 'ArrowRight'){ e.preventDefault(); goTo(currentIndex + 1); }
});

function goTo(i){
  if(i<0 || i>=currentData.length) return;
  currentIndex = i;
  if(viewMode === 'card'){
    swiperEl.scrollTo({left: i*swiperEl.clientWidth, behavior:'smooth'});
  }else{
    const item = listviewEl.children[i];
    if(item) item.scrollIntoView({block:'center', behavior:'smooth'});
  }
  updateCounter();
}

function jumpToTitle(title){
  const idx = currentData.findIndex(n=>String(n.title||'').trim() === String(title).trim());
  if(idx >= 0){ goTo(idx); return; }
  const idxAll = notes.findIndex(n=>String(n.title||'').trim() === String(title).trim());
  if(idxAll >= 0){
    filter = {category:'',tag:'',keyword:''};
    viewMode = 'card';
    renderAll();
    setTimeout(()=>goTo(idxAll), 80);
    return;
  }
  toast(`未找到「${title}」`);
}

function handleCardClick(e){
  if(e.target.closest('.split-handle')) return;

  const copyLinkBtn = e.target.closest('.card-copy-link');
  if(copyLinkBtn){
    const note = notes.find(n=>n.id===copyLinkBtn.dataset.id);
    if(note){
      const link = getLinkImg(note);
      if(link) copyText(link, '已复制图片链接');
    }
    return;
  }

  const imgBadge = e.target.closest('.card-imgs-badge');
  if(imgBadge){
    const note = notes.find(n=>n.id===imgBadge.dataset.id);
    if(!note) return;
    const local = getLocalImgs(note);
    if(local.length) openGallery(local, 0);
    return;
  }

  const wikilink = e.target.closest('[data-wikilink]');
  if(wikilink){ e.preventDefault(); jumpToTitle(wikilink.dataset.wikilink); return; }

  const btn = e.target.closest('button[data-act], .rel-item[data-act]');
  if(!btn) return;

  const card = btn.closest('.card');
  const id = card ? card.dataset.id : null;
  const note = notes.find(n=>n.id===id);
  const act = btn.dataset.act;

  if(act === 'jump'){ jumpToTitle(btn.dataset.title); return; }
  if(act === 'copyLink'){
    if(note){
      const link = getLinkImg(note);
      if(link) copyText(link, '已复制图片链接');
    }
    return;
  }
  if(!note) return;

  if(act==='edit') openEditor(note);
  if(act==='copy') copyNote(note);
  if(act==='star'){ note.star = !note.star; saveLocal(); renderAll(); }
  if(act==='del'){
    if(confirm('确定删除？')){
      notes = notes.filter(n=>n.id!==id);
      saveLocal();
      if(currentIndex >= currentData.length - 1 && currentIndex > 0) currentIndex--;
      renderAll();
    }
  }
  if(act==='history') showHistory(note);
  if(act==='imgs'){
    const local = getLocalImgs(note);
    if(local.length) openGallery(local, 0);
    else toast('这条资料没有本地图片');
  }
}
swiperEl.addEventListener('click', handleCardClick);
listviewEl.addEventListener('click', e=>{
  const item = e.target.closest('.list-item'); if(!item) return;
  const id = item.dataset.id;
  const idx = currentData.findIndex(n=>n.id===id);
  if(idx >= 0){
    viewMode = 'card';
    localStorage.setItem(VIEW_KEY, 'card');
    applyViewMode();
    currentIndex = idx;
    renderAll();
  }
});

document.getElementById('btnView').onclick = ()=>{
  viewMode = viewMode === 'card' ? 'list' : 'card';
  localStorage.setItem(VIEW_KEY, viewMode);
  applyViewMode();
  if(viewMode === 'card'){
    requestAnimationFrame(()=>{
      swiperEl.scrollLeft = currentIndex * swiperEl.clientWidth;
    });
  }
};

/* ================= 拖动条 ================= */
let dragState = null;

function updateSplitDisplay(percent){
  document.documentElement.style.setProperty('--split', percent + '%');
  if(dragState){
    const num = dragState.handle.querySelector('.sh-num');
    if(num) num.textContent = `${percent} / ${100 - percent}`;
  }
}
function beginDrag(e, handle){
  e.preventDefault(); e.stopPropagation();
  const splitEl = handle.closest('.card-split');
  if(!splitEl) return;
  const rect = splitEl.getBoundingClientRect();
  const startY = getEventY(e);
  const startPercent = splitPercent;
  dragState = { handle, splitEl, rect, startY, startPercent };
  handle.classList.add('active');
  document.body.classList.add('dragging');
  const num = handle.querySelector('.sh-num');
  if(num) num.textContent = `${splitPercent} / ${100 - splitPercent}`;
}
function moveDrag(e){
  if(!dragState) return;
  e.preventDefault();
  const { rect, startY, startPercent } = dragState;
  const y = getEventY(e);
  const deltaY = y - startY;
  const deltaPercent = (deltaY / rect.height) * 100;
  let newPercent = Math.round(startPercent + deltaPercent);
  if(newPercent < 20) newPercent = 20;
  if(newPercent > 80) newPercent = 80;
  splitPercent = newPercent;
  updateSplitDisplay(splitPercent);
}
function endDrag(){
  if(!dragState) return;
  const handle = dragState.handle;
  handle.classList.remove('active');
  document.body.classList.remove('dragging');
  dragState = null;
  localStorage.setItem(SPLIT_KEY, String(splitPercent));
}
function getEventY(e){
  if(e.touches && e.touches.length) return e.touches[0].clientY;
  if(e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientY;
  return e.clientY;
}
swiperEl.addEventListener('mousedown', e=>{
  const handle = e.target.closest('.split-handle');
  if(handle) beginDrag(e, handle);
});
swiperEl.addEventListener('touchstart', e=>{
  const handle = e.target.closest('.split-handle');
  if(handle) beginDrag(e, handle);
}, {passive:false});
document.addEventListener('mousemove', moveDrag);
document.addEventListener('touchmove', moveDrag, {passive:false});
document.addEventListener('mouseup', endDrag);
document.addEventListener('touchend', endDrag);
document.addEventListener('touchcancel', endDrag);

updateSplitDisplay(splitPercent);

/* ================= 复制 ================= */
function copyNote(n){
  const parts = [];
  parts.push(`【${n.title || '（无标题）'}】`);
  if(n.category) parts.push(`分类：${n.category}`);
  if(n.tags && n.tags.length) parts.push(`标签：${n.tags.join(', ')}`);
  const fields = Object.entries(n.fields||{}).filter(([k,v])=>k||v);
  if(fields.length){
    parts.push('');
    fields.forEach(([k,v])=>parts.push(`${k}：${v}`));
  }
  if(n.content){
    parts.push('');
    parts.push('───────────');
    parts.push(String(n.content).replace(/\[\[|\]\]/g,''));
  }
  copyText(parts.join('\n'), '已复制到剪贴板');
}
function copyText(text, okMsg){
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(()=>toast(okMsg))
      .catch(()=>fallbackCopy(text, okMsg));
  }else{
    fallbackCopy(text, okMsg);
  }
}
function fallbackCopy(text, okMsg){
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast(okMsg); }
  catch(e){ toast('复制失败'); }
  document.body.removeChild(ta);
}

/* ================= 历史 ================= */
function showHistory(note){
  if(!note.history || !note.history.length){ alert('暂无历史版本'); return; }
  const list = note.history.map((h,i)=>
    `${i+1}. [${h.updatedAt||''}] ${h.title}`
  ).join('\n');
  const pick = prompt(`历史版本（输入序号回滚）：\n\n${list}`);
  if(!pick) return;
  const idx = parseInt(pick,10) - 1;
  if(idx<0 || idx>=note.history.length) return;
  const old = note.history[idx];
  if(!confirm(`确定回滚到「${old.title}」？当前版本会存入历史`)) return;
  note.history.unshift({
    title: note.title, category: note.category, tags: note.tags,
    fields: note.fields, content: note.content, images: note.images || [],
    updatedAt: note.updatedAt
  });
  note.history = note.history.slice(0, 10);
  Object.assign(note, old, { updatedAt: today() });
  saveLocal(); renderAll();
}

/* ================= 编辑面板 ================= */
const editor = document.getElementById('editor');
let editingId = null;
let editingImages = [];
let pendingCategory = '';

function openEditor(note){
  editingId = note ? note.id : null;
  editingImages = note && note.images ? note.images.slice() : [];
  document.getElementById('editorTitle').textContent = note ? '编辑资料' : '新建资料';
  document.getElementById('fTitle').value = note?.title || '';
  document.getElementById('fTags').value = (note?.tags||[]).join(',');
  document.getElementById('fFields').value = Object.entries(note?.fields||{})
      .map(([k,v])=>`${k}=${v}`).join('\n');
  document.getElementById('fContent').value = note?.content || '';
  rebuildCategorySelect(note?.category || '');
  renderImgEdit();
  editor.classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(()=>document.getElementById('fTitle').focus(), 100);
}
function closeEditor(){
  editor.classList.remove('show');
  document.body.style.overflow = '';
  editingId = null;
  editingImages = [];
}

function fieldsHaveValues(){
  const text = document.getElementById('fFields').value.trim();
  if(!text) return false;
  const lines = text.split('\n');
  return lines.some(line=>{
    const i = line.indexOf('=');
    if(i < 0) return line.trim().length > 0;
    const v = line.slice(i+1).trim();
    return v.length > 0;
  });
}

function parseFieldsText(){
  const text = document.getElementById('fFields').value;
  const result = [];
  text.split('\n').forEach(line=>{
    if(!line.trim()) return;
    const i = line.indexOf('=');
    if(i < 0){
      result.push({name: line.trim(), value: ''});
    }else{
      result.push({
        name: line.slice(0,i).trim(),
        value: line.slice(i+1).trim()
      });
    }
  });
  return result;
}

function writeFieldsText(arr){
  document.getElementById('fFields').value = arr
    .filter(x=>x.name)
    .map(x=> x.value ? `${x.name}=${x.value}` : `${x.name}=`)
    .join('\n');
}

function applyTemplateAppend(catName){
  const tmpl = getCatFields(catName);
  if(!tmpl.length) return;
  const current = parseFieldsText();
  const existing = new Set(current.map(x=>x.name));
  tmpl.forEach(f=>{
    if(!existing.has(f)) current.push({name: f, value: ''});
  });
  writeFieldsText(current);
}

function applyTemplateReplace(catName){
  const tmpl = getCatFields(catName);
  const current = parseFieldsText();
  const valueMap = {};
  current.forEach(x=>{ if(x.value) valueMap[x.name] = x.value; });
  const result = tmpl.map(f=>({
    name: f,
    value: valueMap[f] || ''
  }));
  writeFieldsText(result);
}

document.getElementById('fCategory').addEventListener('change', e=>{
  const newCat = e.target.value;
  const oldText = document.getElementById('fFields').value;

  if(!oldText.trim()){
    const tmpl = getCatFields(newCat);
    if(tmpl.length){
      document.getElementById('fFields').value = tmpl.map(f=>`${f}=`).join('\n');
    }
    return;
  }

  if(!fieldsHaveValues()){
    if(newCat){
      applyTemplateReplace(newCat);
    }else{
      document.getElementById('fFields').value = '';
    }
    return;
  }

  pendingCategory = newCat;
  document.getElementById('switchCatName').textContent = newCat || '无';
  document.getElementById('switchConfirm').classList.add('show');
});

const switchConfirm = document.getElementById('switchConfirm');
function closeSwitchConfirm(){
  switchConfirm.classList.remove('show');
}
document.getElementById('switchClose').onclick = ()=>{
  closeSwitchConfirm();
  rebuildCategorySelect(pendingCategoryOld);
};
document.getElementById('switchCancel').onclick = ()=>{
  closeSwitchConfirm();
  rebuildCategorySelect(pendingCategoryOld);
};
document.getElementById('switchAppend').onclick = ()=>{
  closeSwitchConfirm();
  applyTemplateAppend(pendingCategory);
  rebuildCategorySelect(pendingCategory);
};
document.getElementById('switchReplace').onclick = ()=>{
  closeSwitchConfirm();
  applyTemplateReplace(pendingCategory);
  rebuildCategorySelect(pendingCategory);
};

let pendingCategoryOld = '';
document.getElementById('fCategory').addEventListener('focus', e=>{
  pendingCategoryOld = e.target.value;
});

/* ================= 分类管理窗口 ================= */
const catMgr = document.getElementById('catMgr');
const catMgrBody = document.getElementById('catMgrBody');

function openCatMgr(){
  renderCatMgr();
  catMgr.classList.add('show');
}
function closeCatMgr(){
  catMgr.classList.remove('show');
}
document.getElementById('catMgrClose').onclick = closeCatMgr;
catMgr.addEventListener('click', e=>{
  if(e.target === catMgr) closeCatMgr();
});
document.getElementById('catMgrAdd').onclick = ()=>{
  openCatEdit(null);
};

function renderCatMgr(){
  const countMap = {};
  notes.forEach(n=>{
    const c = n.category || '';
    if(c) countMap[c] = (countMap[c]||0) + 1;
  });
  catMgrBody.innerHTML = categories.map((c, i)=>{
    const n = countMap[c.name] || 0;
    return `<div class="catmgr-item" data-cat-i="${i}">
      <span class="cname">${esc(c.name)}</span>
      ${c.builtin?`<span class="builtin-tag">自带</span>`:''}
      <span class="cnum">${n} 条</span>
      <span class="arrow">›</span>
    </div>`;
  }).join('');
}
catMgrBody.addEventListener('click', e=>{
  const item = e.target.closest('[data-cat-i]');
  if(!item) return;
  const i = parseInt(item.dataset.catI, 10);
  openCatEdit(i);
});

/* ================= 分类编辑窗口 ================= */
const catEdit = document.getElementById('catEdit');
let catEditIndex = -1;
let catEditFieldsArr = [];

function openCatEdit(index){
  if(index === null || index === undefined) index = -1;
  catEditIndex = index;
  if(index === -1){
    document.getElementById('catEditTitle').textContent = '新增分类';
    document.getElementById('catEditName').value = '';
    catEditFieldsArr = [];
  }else{
    const c = categories[index];
    document.getElementById('catEditTitle').textContent = `修改分类「${c.name}」`;
    document.getElementById('catEditName').value = c.name;
    catEditFieldsArr = c.fields.slice();
  }
  const delBtn = document.getElementById('catEditDel');
  if(index === -1 || (index >= 0 && categories[index].builtin)){
    delBtn.disabled = true;
    delBtn.textContent = index === -1 ? '' : '自带分类不可删';
    delBtn.style.visibility = index === -1 ? 'hidden' : 'visible';
  }else{
    delBtn.disabled = false;
    delBtn.textContent = '删除此分类';
    delBtn.style.visibility = 'visible';
  }
  renderCatEditFields();
  catEdit.classList.add('show');
  setTimeout(()=>document.getElementById('catEditName').focus(), 100);
}
function closeCatEdit(){
  catEdit.classList.remove('show');
  catEditIndex = -1;
  catEditFieldsArr = [];
}
document.getElementById('catEditClose').onclick = closeCatEdit;
document.getElementById('catEditCancel').onclick = closeCatEdit;
catEdit.addEventListener('click', e=>{
  if(e.target === catEdit) closeCatEdit();
});

function renderCatEditFields(){
  const box = document.getElementById('catEditFields');
  if(!catEditFieldsArr.length){
    box.innerHTML = `<div class="field-empty">还没有字段，点下方"添加字段"</div>`;
    return;
  }
  box.innerHTML = catEditFieldsArr.map((f, i)=>
    `<div class="field-row-item" data-fi="${i}">
      <span class="fname">${esc(f)}</span>
      <button type="button" class="fbtn" data-edit-field="${i}" title="改名">✎</button>
      <button type="button" class="fbtn del" data-del-field="${i}" title="删除">×</button>
    </div>`
  ).join('');
}
document.getElementById('catEditFields').addEventListener('click', e=>{
  const edit = e.target.closest('[data-edit-field]');
  if(edit){
    const i = parseInt(edit.dataset.editField,10);
    const old = catEditFieldsArr[i];
    const nv = prompt('修改字段名：', old);
    if(nv === null) return;
    const trimmed = nv.trim();
    if(!trimmed){ toast('字段名不能为空'); return; }
    if(catEditFieldsArr.includes(trimmed) && trimmed !== old){
      toast('字段名已存在'); return;
    }
    catEditFieldsArr[i] = trimmed;
    renderCatEditFields();
    return;
  }
  const del = e.target.closest('[data-del-field]');
  if(del){
    const i = parseInt(del.dataset.delField,10);
    if(!confirm(`删除字段「${catEditFieldsArr[i]}」？`)) return;
    catEditFieldsArr.splice(i,1);
    renderCatEditFields();
  }
});
document.getElementById('catEditAddField').onclick = ()=>{
  const name = prompt('输入新字段名：', '');
  if(!name) return;
  const trimmed = name.trim();
  if(!trimmed){ return; }
  if(catEditFieldsArr.includes(trimmed)){
    toast('字段名已存在');
    return;
  }
  catEditFieldsArr.push(trimmed);
  renderCatEditFields();
};

document.getElementById('catEditOk').onclick = ()=>{
  const newName = document.getElementById('catEditName').value.trim();
  if(!newName){ alert('请填写分类名'); return; }
  if(catEditIndex === -1){
    if(categories.some(c=>c.name === newName)){
      alert('分类名已存在');
      return;
    }
    categories.push({
      name: newName,
      fields: catEditFieldsArr.slice(),
      builtin: false
    });
    saveCats();
    rebuildCategorySelect(newName);
    renderAll();
    toast(`已添加分类「${newName}」`);
  }else{
    const c = categories[catEditIndex];
    const oldName = c.name;
    if(newName !== oldName){
      if(categories.some((x, i)=> i !== catEditIndex && x.name === newName)){
        alert('分类名已存在');
        return;
      }
      c.name = newName;
      let changed = 0;
      notes.forEach(n=>{
        if(n.category === oldName){ n.category = newName; changed++; }
      });
      if(changed) saveLocal();
    }
    c.fields = catEditFieldsArr.slice();
    saveCats();
    rebuildCategorySelect(c.name);
    renderAll();
    toast(`已保存分类「${c.name}」`);
  }
  closeCatEdit();
  renderCatMgr();
};

document.getElementById('catEditDel').onclick = ()=>{
  if(catEditIndex < 0) return;
  const c = categories[catEditIndex];
  if(c.builtin){
    toast('自带分类不可删除');
    return;
  }
  const used = notes.filter(n=>n.category === c.name).length;
  let ok = true;
  if(used > 0){
    ok = confirm(`「${c.name}」有 ${used} 条资料在使用。\n\n删除后这些资料将变为「未分类」，确定吗？`);
  }else{
    ok = confirm(`确定删除分类「${c.name}」？`);
  }
  if(!ok) return;
  categories.splice(catEditIndex, 1);
  saveCats();
  let changed = 0;
  notes.forEach(n=>{
    if(n.category === c.name){ n.category = ''; changed++; }
  });
  if(changed) saveLocal();
  rebuildCategorySelect('');
  renderAll();
  renderCatMgr();
  closeCatEdit();
  toast(changed ? `已删除分类，${changed} 条资料改为未分类` : `已删除分类「${c.name}」`);
};

/* ================= 图片编辑 ================= */
function renderImgEdit(){
  const wrap = document.getElementById('imgEdit');
  const hint = document.getElementById('imgHint');
  const MAX_LOCAL = 5;

  const localImgs = editingImages.filter(s=>!isLink(s));
  const linkImg = editingImages.find(s=>isLink(s));

  let html = '';
  localImgs.forEach((src)=>{
    const i = editingImages.indexOf(src);
    html += `<div class="thumb">
      <img src="${src}" alt="">
      <span class="open" data-open="${i}"></span>
      <button class="x" data-i="${i}" title="删除" type="button">×</button>
    </div>`;
  });
  if(localImgs.length < MAX_LOCAL){
    html += `<button type="button" class="img-add-btn" id="btnAddLocal">📷 拍照/相册</button>`;
  }
  if(linkImg){
    html += `<div class="img-link-row">
      <span class="lk-icon">🔗</span>
      <span class="lk-url" title="${esc(linkImg)}">${esc(linkImg)}</span>
      <button type="button" class="lk-btn" data-copy-link title="复制链接">📋</button>
      <button type="button" class="lk-btn del" data-del-link title="删除">×</button>
    </div>`;
  }else{
    html += `<button type="button" class="img-add-btn" id="btnAddLink">🔗 添加链接</button>`;
  }

  wrap.innerHTML = html;

  let msg = `本地图 ${localImgs.length}/${MAX_LOCAL}`;
  if(linkImg) msg += ` · 已添加链接（限 1 条）`;
  hint.textContent = msg;
}

document.getElementById('imgEdit').addEventListener('click', e=>{
  const del = e.target.closest('.x');
  if(del){
    editingImages.splice(parseInt(del.dataset.i,10),1);
    renderImgEdit();
    return;
  }
  const open = e.target.closest('[data-open]');
  if(open){
    const i = parseInt(open.dataset.open,10);
    const src = editingImages[i];
    if(!isLink(src)) openGallery([src], 0);
    return;
  }
  if(e.target.closest('#btnAddLocal')) addLocalImage();
  if(e.target.closest('#btnAddLink')) addLinkImage();
  if(e.target.closest('[data-copy-link]')){
    const link = editingImages.find(s=>isLink(s));
    if(link) copyText(link, '已复制图片链接');
    return;
  }
  if(e.target.closest('[data-del-link]')){
    const idx = editingImages.findIndex(s=>isLink(s));
    if(idx >= 0){ editingImages.splice(idx, 1); renderImgEdit(); }
  }
});

function addLocalImage(){
  const localCount = editingImages.filter(s=>!isLink(s)).length;
  if(localCount >= 5){ toast('本地图最多 5 张'); return; }
  const input = document.createElement('input');
  input.type='file'; input.accept='image/*';
  input.onchange = ()=>{
    const file = input.files[0]; if(!file) return;
    if(file.size > 300 * 1024){
      const go = confirm(`图片 ${(file.size/1024).toFixed(0)}KB，超过 300KB。\n\n点「确定」压缩后内嵌，点「取消」放弃。`);
      if(!go) return;
      compressImage(file, 300*1024, dataUrl=>{
        editingImages.push(dataUrl);
        renderImgEdit();
      });
    }else{
      const reader = new FileReader();
      reader.onload = ()=>{
        editingImages.push(reader.result);
        renderImgEdit();
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function addLinkImage(){
  if(editingImages.some(s=>isLink(s))){ toast('链接只能添加 1 条'); return; }
  const url = prompt('输入图片 URL：', 'https://');
  if(!url) return;
  if(!/^https?:\/\//i.test(url)){ toast('URL 必须以 http/https 开头'); return; }
  editingImages.push(url);
  renderImgEdit();
}

function compressImage(file, maxSize, cb){
  const reader = new FileReader();
  reader.onload = ()=>{
    const img = new Image();
    img.onload = ()=>{
      const canvas = document.createElement('canvas');
      let {width, height} = img;
      const MAX_DIM = 1200;
      if(width > MAX_DIM || height > MAX_DIM){
        const ratio = Math.min(MAX_DIM/width, MAX_DIM/height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      let q = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', q);
      while(dataUrl.length > maxSize * 1.4 && q > 0.4){
        q -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', q);
      }
      cb(dataUrl);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById('btnNew').onclick = ()=>openEditor(null);
document.getElementById('btnCancel').onclick = closeEditor;

document.getElementById('btnSave').onclick = ()=>{
  const title = document.getElementById('fTitle').value.trim();
  if(!title){ alert('请填写标题'); return; }

  const fields = {};
  document.getElementById('fFields').value.split('\n').forEach(line=>{
    const i = line.indexOf('=');
    if(i>0){
      const k = line.slice(0,i).trim();
      const v = line.slice(i+1).trim();
      if(k) fields[k]=v;
    }
  });

  const tags = document.getElementById('fTags').value
      .split(/[,，]/).map(s=>s.trim()).filter(Boolean);
  const content = document.getElementById('fContent').value;
  const now = today();
  let category = document.getElementById('fCategory').value;
  if(category === '__add__' || category === '__manage__') category = '';

  const others = notes.filter(n=>n.id !== editingId);
  for(const o of others){
    const ts = similarTitle(title, o.title);
    if(ts >= 0.8){
      if(!confirm(`⚠️ 标题与已有资料「${o.title}」相似度 ${Math.round(ts*100)}%\n\n仍要保存吗？`)) return;
      break;
    }
  }
  if(content.trim().length > 20){
    for(const o of others){
      if(!o.content) continue;
      const cs = similarContent(content, o.content);
      if(cs >= 0.9){
        if(!confirm(`⚠️ 正文与「${o.title}」高度相似（${Math.round(cs*100)}%）\n\n仍要保存吗？`)) return;
        break;
      }
    }
  }

  if(editingId){
    const n = notes.find(x=>x.id===editingId);
    n.history = n.history || [];
    n.history.unshift({
      title: n.title, category: n.category, tags: n.tags,
      fields: n.fields, content: n.content, images: n.images || [],
      updatedAt: n.updatedAt
    });
    n.history = n.history.slice(0, 10);
    Object.assign(n, {
      title, category: category.trim(),
      tags, fields, content,
      images: editingImages.slice(),
      updatedAt: now
    });
  }else{
    notes.unshift({
      id: uid(), title,
      category: category.trim(),
      tags, fields, content,
      images: editingImages.slice(),
      createdAt: now, updatedAt: now, star: false, history: []
    });
    currentIndex = 0;
  }
  saveLocal(); renderAll(); closeEditor();
  toast('已保存');
};

/* ================= 图片查看器 ================= */
const gallery = document.getElementById('gallery');
const gImg = document.getElementById('gImg');
const gCount = document.getElementById('gCount');
const gPrev = document.getElementById('gPrev');
const gNext = document.getElementById('gNext');
let galleryImages = [];
let galleryIndex = 0;

function openGallery(images, index){
  galleryImages = images || [];
  galleryIndex = index || 0;
  if(!galleryImages.length) return;
  updateGallery();
  gallery.classList.add('show');
}
function closeGallery(){
  gallery.classList.remove('show');
  gImg.src = '';
  galleryImages = [];
  galleryIndex = 0;
}
function updateGallery(){
  if(!galleryImages.length) return;
  if(galleryIndex < 0) galleryIndex = 0;
  if(galleryIndex >= galleryImages.length) galleryIndex = galleryImages.length - 1;
  gImg.src = galleryImages[galleryIndex];
  gCount.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
  gPrev.classList.toggle('hide', galleryImages.length <= 1);
  gNext.classList.toggle('hide', galleryImages.length <= 1);
}
function galleryPrev(){ if(galleryIndex > 0){ galleryIndex--; updateGallery(); } }
function galleryNext(){ if(galleryIndex < galleryImages.length - 1){ galleryIndex++; updateGallery(); } }

document.getElementById('gClose').onclick = closeGallery;
gPrev.onclick = galleryPrev;
gNext.onclick = galleryNext;
gallery.addEventListener('click', e=>{
  if(e.target === gallery) closeGallery();
});

let gTouchX = 0;
gallery.addEventListener('touchstart', e=>{
  if(e.touches.length === 1) gTouchX = e.touches[0].clientX;
}, {passive:true});
gallery.addEventListener('touchend', e=>{
  if(e.changedTouches.length === 1){
    const dx = e.changedTouches[0].clientX - gTouchX;
    if(dx > 50) galleryPrev();
    else if(dx < -50) galleryNext();
  }
}, {passive:true});

/* ================= 命令面板 ================= */
const cmd = document.getElementById('cmd');
const cmdInput = document.getElementById('cmdInput');
const cmdList = document.getElementById('cmdList');
let cmdIndex = 0;

function openCmd(){
  cmd.classList.add('show');
  cmdInput.value = '';
  renderCmd('');
  setTimeout(()=>cmdInput.focus(), 50);
}
function closeCmd(){ cmd.classList.remove('show'); }

function renderCmd(q){
  q = q.trim().toLowerCase();
  let items = [];

  const commands = [
    {name:'新建资料', run:()=>openEditor(null)},
    {name:'管理分类修改', run:()=>openCatMgr()},
    {name:'Gitee 同步', run:()=>openSyncPanel()},
    {name:'导入 JSON', run:()=>importJSON()},
    {name:'导出 JSON', run:()=>exportJSON()},
    {name:'切换视图（卡片/列表）', run:()=>document.getElementById('btnView').click()},
    {name:'重置字段/正文比例', run:()=>{
      splitPercent = 45;
      localStorage.setItem(SPLIT_KEY, '45');
      updateSplitDisplay(45);
      toast('已重置 45 / 55');
    }},
    {name:'清除筛选（显示全部）', run:()=>{
      filter = {category:'',tag:'',keyword:''};
      currentIndex = 0; renderAll();
    }},
  ];
  commands.forEach(c=>{
    if(!q || c.name.toLowerCase().includes(q)) items.push({type:'cmd', name:c.name, run:c.run});
  });

  if(q){
    const cats = new Set(), tags = new Set();
    notes.forEach(n=>{
      if(n.category) cats.add(n.category);
      (n.tags||[]).forEach(t=>tags.add(t));
    });
    [...cats].filter(c=>c.toLowerCase().includes(q)).slice(0,4).forEach(c=>{
      items.push({type:'cmd', name:`筛选分类：${c}`, run:()=>{
        filter.category=c; filter.tag=''; filter.keyword=''; currentIndex=0; renderAll();
      }});
    });
    [...tags].filter(t=>t.toLowerCase().includes(q)).slice(0,4).forEach(t=>{
      items.push({type:'cmd', name:`筛选标签：#${t}`, run:()=>{
        filter.tag=t; filter.category=''; filter.keyword=''; currentIndex=0; renderAll();
      }});
    });
  }

  if(q){
    const pool = currentData.length ? currentData : notes;
    pool.filter(n=>matchKw(n, q)).slice(0,8).forEach(n=>{
      const idx = currentData.findIndex(x=>x.id===n.id);
      items.push({type:'note', name:n.title || '（无标题）', run:()=>{
        if(idx >= 0){
          viewMode = 'card'; localStorage.setItem(VIEW_KEY, 'card');
          applyViewMode(); goTo(idx);
        }else{
          filter.keyword = n.title; currentIndex=0; renderAll();
        }
      }});
    });
  }

  cmdList.innerHTML = items.length
    ? items.map((it,i)=>`<div class="cmd-item ${i===cmdIndex?'sel':''}" data-i="${i}">
        <span>${it.type==='cmd'?'⚡ ':'📄 '}${esc(it.name)}</span></div>`).join('')
    : `<div class="cmd-item">无匹配</div>`;
  cmdList._items = items;
}

cmdInput.addEventListener('input', e=>{ cmdIndex=0; renderCmd(e.target.value); });
cmdInput.addEventListener('keydown', e=>{
  const items = cmdList._items || [];
  if(e.key==='ArrowDown'){ e.preventDefault(); cmdIndex=Math.min(cmdIndex+1, items.length-1); renderCmd(cmdInput.value); }
  if(e.key==='ArrowUp'){ e.preventDefault(); cmdIndex=Math.max(cmdIndex-1, 0); renderCmd(cmdInput.value); }
  if(e.key==='Enter'){
    e.preventDefault();
    const it = items[cmdIndex];
    if(it){ closeCmd(); setTimeout(it.run, 50); }
  }
  if(e.key==='Escape') closeCmd();
});
cmdList.addEventListener('click', e=>{
  const item = e.target.closest('.cmd-item'); if(!item) return;
  const items = cmdList._items || [];
  const it = items[parseInt(item.dataset.i,10)];
  if(it){ closeCmd(); setTimeout(it.run, 50); }
});
cmd.addEventListener('click', e=>{ if(e.target===cmd) closeCmd(); });
document.getElementById('btnCmd').onclick = openCmd;

/* ================= 跳转面板 ================= */
const jump = document.getElementById('jump');
const jumpList = document.getElementById('jumpList');
const jumpTotal = document.getElementById('jumpTotal');

function openJump(){
  if(!currentData.length) return;
  jumpTotal.textContent = currentData.length;
  jumpList.innerHTML = currentData.map((n,i)=>{
    return `<div class="jump-item ${i===currentIndex?'cur':''}" data-i="${i}">
      <span>${esc(n.title || '（无标题）')}</span>
      <span class="idx">${i+1}</span>
    </div>`;
  }).join('');
  jump.classList.add('show');
  setTimeout(()=>{
    const cur = jumpList.querySelector('.jump-item.cur');
    if(cur) cur.scrollIntoView({block:'center'});
  }, 30);
}
function closeJump(){ jump.classList.remove('show'); }

jumpList.addEventListener('click', e=>{
  const item = e.target.closest('.jump-item'); if(!item) return;
  const i = parseInt(item.dataset.i, 10);
  closeJump();
  if(viewMode !== 'card'){
    viewMode = 'card'; localStorage.setItem(VIEW_KEY, 'card'); applyViewMode();
  }
  requestAnimationFrame(()=>goTo(i));
});
jump.addEventListener('click', e=>{ if(e.target===jump) closeJump(); });

/* ================= 导入导出 ================= */
function exportJSON(){
  const payload = {
    _version: 5,
    _exportedAt: new Date().toISOString(),
    categories: categories,
    notes: notes
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `notes_${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`已导出 ${notes.length} 条（含图片和分类）`);
}

function importJSON(){
  const input = document.createElement('input');
  input.type='file'; input.accept='.json,application/json';
  input.onchange = ()=>{
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const raw = JSON.parse(reader.result);
        let data, cats = null;
        if(Array.isArray(raw)){
          data = raw;
        }else if(raw && Array.isArray(raw.notes)){
          data = raw.notes;
          if(Array.isArray(raw.categories)) cats = raw.categories;
        }else{
          throw new Error('格式应为数组或 {notes:[...]}');
        }
        if(cats){
          cats.forEach(c=>{
            if(!c || !c.name) return;
            if(!categories.some(x=>x.name === c.name)){
              categories.push({
                name: c.name,
                fields: Array.isArray(c.fields) ? c.fields.slice() : [],
                builtin: false
              });
            }
          });
          saveCats();
        }
        const ids = new Set(notes.map(n=>n.id));
        let added = 0;
        data.forEach(n=>{
          if(!n.id) n.id = uid();
          if(!ids.has(n.id)){ notes.push(n); added++; }
        });
        saveLocal(); renderAll(); rebuildCategorySelect();
        toast(`导入成功，新增 ${added} 条`);
      }catch(err){ alert('导入失败：'+err.message); }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* ================= Toast ================= */
let toastTimer = null;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 1800);
}

/* ================= Gitee 同步 ================= */
const SYNC_KEY = 'my_notes_gitee_cfg';

function buildSyncPayload(){
  return {
    _version: 5,
    _exportedAt: new Date().toISOString(),
    categories: categories,
    notes: notes
  };
}

function getSyncCfg(){
  try{ return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; }
  catch(e){ return {}; }
}
function saveSyncCfg(cfg){
  localStorage.setItem(SYNC_KEY, JSON.stringify(cfg));
}

const syncPanel = document.getElementById('syncPanel');
const syncMsgEl = document.getElementById('syncMsg');

function openSyncPanel(){
  const cfg = getSyncCfg();
  document.getElementById('syncUser').value = cfg.owner || '';
  document.getElementById('syncPass').value = cfg.token || '';
  document.getElementById('syncPath').value = cfg.repo || '';
  document.getElementById('syncFilePath').value = cfg.filePath || '我的数据库/资料库.json';
  syncMsgEl.textContent = '';
  syncMsgEl.classList.remove('err');
  syncPanel.classList.add('show');
}
function closeSyncPanel(){ syncPanel.classList.remove('show'); }

document.getElementById('syncClose').onclick = closeSyncPanel;
syncPanel.addEventListener('click', e=>{
  if(e.target === syncPanel) closeSyncPanel();
});

function syncMsg(msg, isErr){
  syncMsgEl.textContent = msg;
  syncMsgEl.classList.toggle('err', !!isErr);
}

document.getElementById('syncSave').onclick = ()=>{
  const owner = document.getElementById('syncUser').value.trim();
  const token = document.getElementById('syncPass').value.trim();
  const repo = document.getElementById('syncPath').value.trim();
  const filePath = document.getElementById('syncFilePath').value.trim() || '我的数据库/资料库.json';
  if(!owner){ syncMsg('请填写 Gitee 用户名', true); return; }
  if(!token){ syncMsg('请填写私人令牌', true); return; }
  if(!repo){ syncMsg('请填写仓库名', true); return; }
  saveSyncCfg({owner, token, repo, filePath});
  syncMsg('✅ 已保存设置');
};

const GITEE_API = 'https://gitee.com/api/v5';

function giteeFilePath(){
  const cfg = getSyncCfg();
  return cfg.filePath || '我的数据库/资料库.json';
}

const EMPTY_PLACEHOLDER = ['{}', '', 'null', '{"notes":[]}', '{"notes":[],"categories":[]}'];

async function doSyncUpload(skipConfirm){
  const cfg = getSyncCfg();
  if(!cfg.owner || !cfg.token || !cfg.repo){ syncMsg('请先保存设置', true); return; }
  const btn = document.getElementById('syncUpload');
  btn.disabled = true;
  syncMsg('⏳ 正在检查远端…');

  try{
    const path = giteeFilePath();
    const encodedPath = path.split('/').map(s=>encodeURIComponent(s)).join('/');
    const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodedPath}`;

    // 1. 查文件是否存在
    let sha = null;
    const r1 = await fetch(`${url}?access_token=${encodeURIComponent(cfg.token)}`);
    if(r1.ok){
      const data = await r1.json();
      sha = data.sha;
    }else if(r1.status === 404){
      sha = null;
    }else{
      const err = await r1.text();
      syncMsg(`❌ 查询文件失败：${r1.status}\n${err}`, true);
      btn.disabled = false;
      return;
    }

    // 2. 如果文件已存在，确认是否覆盖
    if(sha && !skipConfirm){
      const tmpText = JSON.stringify(buildSyncPayload(), null, 2);
      const ok = confirm(
        `远端已存在文件：\n${path}\n\n` +
        `本地当前 ${notes.length} 条资料\n` +
        `本次将上传大小约 ${(tmpText.length/1024).toFixed(1)} KB\n\n` +
        `是否覆盖远端？\n\n` +
        `点「确定」= 覆盖远端\n` +
        `点「取消」= 取消上传`
      );
      if(!ok){
        syncMsg('已取消上传');
        btn.disabled = false;
        return;
      }
    }

    // 3. 构造并上传
    syncMsg(sha ? '⏳ 正在覆盖远端…' : '⏳ 正在新建远端文件…');
    const text = JSON.stringify(buildSyncPayload(), null, 2);
    const content = btoa(unescape(encodeURIComponent(text)));

    const body = {
      access_token: cfg.token,
      content: content,
      message: `同步 ${new Date().toLocaleString()}`
    };
    if(sha) body.sha = sha;

    const r2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if(r2.ok){
      syncMsg(`✅ ${sha ? '覆盖' : '新建'}成功\n路径：${path}\n大小：${(text.length/1024).toFixed(1)} KB`);
    }else{
      const err = await r2.text();
      syncMsg(`❌ 上传失败：${r2.status}\n${err}`, true);
    }
  }catch(e){
    syncMsg('❌ 上传出错：' + e.message, true);
  }
  btn.disabled = false;
}

async function doSyncDownload(silent){
  const cfg = getSyncCfg();
  if(!cfg.owner || !cfg.token || !cfg.repo){ syncMsg('请先保存设置', true); return; }
  const btn = document.getElementById('syncDownload');
  if(btn) btn.disabled = true;
  syncMsg('⏳ 正在下载…');

  try{
    const path = giteeFilePath();
    const encodedPath = path.split('/').map(s=>encodeURIComponent(s)).join('/');
    const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodedPath}?access_token=${encodeURIComponent(cfg.token)}`;
    const r = await fetch(url);
    if(!r.ok){
      syncMsg(`❌ 下载失败：${r.status}\n（仓库里还没有 ${path} ？）`, true);
      if(btn) btn.disabled = false;
      return;
    }
    const data = await r.json();
    let text = '';
    try{
      text = decodeURIComponent(escape(atob(data.content.replace(/\n/g,''))));
    }catch(e){
      text = '';
    }

    const trimmed = (text || '').trim();
    if(!trimmed || EMPTY_PLACEHOLDER.includes(trimmed)){
      syncMsg('ℹ️ 远端是空占位文件，先点「⬆ 仅上传」上传数据', true);
      if(btn) btn.disabled = false;
      return;
    }

    let payload;
    try{
      payload = JSON.parse(text);
    }catch(e){
      syncMsg('❌ 远端不是有效 JSON', true);
      if(btn) btn.disabled = false;
      return;
    }

    if(!payload || !Array.isArray(payload.notes)){
      syncMsg('❌ 远端数据格式错误（没有 notes 字段）', true);
      if(btn) btn.disabled = false;
      return;
    }

    if(!silent){
      if(!confirm('下载成功，是否用远端数据覆盖本地？\n\n注意：本地当前资料会被替换。')){
        if(btn) btn.disabled = false;
        syncMsg('已下载，未覆盖本地');
        return;
      }
    }
    notes = payload.notes;
    if(Array.isArray(payload.categories)){
      categories = payload.categories;
      saveCats();
    }
    saveLocal();
    rebuildCategorySelect();
    renderAll();
    syncMsg(`✅ 已用远端数据覆盖本地（${notes.length} 条）`);
  }catch(e){
    syncMsg('❌ 下载出错：' + e.message, true);
  }
  if(btn) btn.disabled = false;
}

document.getElementById('syncUpload').onclick = ()=>doSyncUpload(false);
document.getElementById('syncDownload').onclick = ()=>doSyncDownload(false);

document.getElementById('syncNow').onclick = async ()=>{
  const cfg = getSyncCfg();
  if(!cfg.owner || !cfg.token || !cfg.repo){ syncMsg('请先保存设置', true); return; }
  const btn = document.getElementById('syncNow');
  btn.disabled = true;
  syncMsg('⏳ 正在检查远端…');

  try{
    const path = giteeFilePath();
    const encodedPath = path.split('/').map(s=>encodeURIComponent(s)).join('/');
    const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodedPath}?access_token=${encodeURIComponent(cfg.token)}`;

    let remote = null;
    try{
      const r = await fetch(url);
      if(r.ok){
        const data = await r.json();
        let text = '';
        try{
          text = decodeURIComponent(escape(atob(data.content.replace(/\n/g,''))));
        }catch(e){ text = ''; }
        const trimmed = (text || '').trim();
        if(trimmed && !EMPTY_PLACEHOLDER.includes(trimmed)){
          try{ remote = JSON.parse(text); }catch(e){ remote = null; }
        }
      }
    }catch(e){}

    if(!remote || !Array.isArray(remote.notes)){
      syncMsg('远端没有有效数据，正在新建备份…');
      btn.disabled = false;
      await doSyncUpload(true);
      return;
    }

    const localCount = notes.length;
    const remoteCount = remote.notes.length;
    const localTime = notes.reduce((m,n)=> Math.max(m, new Date(n.updatedAt || 0).getTime()), 0);
    const remoteTime = remote.notes.reduce((m,n)=> Math.max(m, new Date(n.updatedAt || 0).getTime()), 0);

    if(remoteTime > localTime && remoteCount >= localCount){
      const use = confirm(
        `远端数据较新：\n本地 ${localCount} 条（更新 ${new Date(localTime).toLocaleString()}）\n` +
        `远端 ${remoteCount} 条（更新 ${new Date(remoteTime).toLocaleString()}）\n\n` +
        `点「确定」= 用远端覆盖本地\n` +
        `点「取消」= 用本地覆盖远端（会再问一次）`
      );
      if(use){
        notes = remote.notes;
        if(Array.isArray(remote.categories)){
          categories = remote.categories;
          saveCats();
        }
        saveLocal();
        rebuildCategorySelect();
        renderAll();
        syncMsg(`✅ 已下载远端数据（${notes.length} 条）`);
      }else{
        btn.disabled = false;
        await doSyncUpload(false);
        return;
      }
    }else{
      btn.disabled = false;
      await doSyncUpload(false);
      return;
    }
  }catch(e){
    syncMsg('❌ 同步出错：' + e.message, true);
  }
  btn.disabled = false;
};

document.getElementById('btnSync').onclick = openSyncPanel;

/* ================= 快捷键 ================= */
document.addEventListener('keydown', e=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){
    e.preventDefault();
    cmd.classList.contains('show') ? closeCmd() : openCmd();
  }
  if(e.key==='Escape'){
    if(editor.classList.contains('show')) closeEditor();
    if(cmd.classList.contains('show')) closeCmd();
    if(jump.classList.contains('show')) closeJump();
    if(gallery.classList.contains('show')) closeGallery();
    if(catMgr.classList.contains('show')) closeCatMgr();
    if(catEdit.classList.contains('show')) closeCatEdit();
    if(syncPanel.classList.contains('show')) closeSyncPanel();
    if(switchConfirm.classList.contains('show')){
      switchConfirm.classList.remove('show');
      rebuildCategorySelect(pendingCategoryOld);
    }
  }
});

/* ================= 启动 ================= */
loadCats();
loadLocal();
rebuildCategorySelect();
renderAll();
