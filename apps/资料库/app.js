
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
const STORE_KEY = 'my_notes_v6';

let notes = [];
let filter = { category: '', tag: '', keyword: '', star: false };
let currentData = [];
let currentIndex = 0;
let viewMode = localStorage.getItem('my_notes_view') || 'card';
let splitPercent = parseInt(localStorage.getItem('my_notes_split'), 10);
if(!splitPercent || splitPercent < 20 || splitPercent > 80) splitPercent = 45;

function sanitizeNote(n){
  if(!n || typeof n !== 'object') return null;
  let type = n.type === 'note' ? 'note' : 'material';
  const fields = (n.fields && typeof n.fields === 'object') ? n.fields : {};
  // 老数据没有 type：fields 为空且正文有内容 → 推断为笔记？保守起见仍按 material 处理
  return {
    id: n.id || uid(),
    type: type,
    title: String(n.title ?? ''),
    category: String(n.category ?? ''),
    tags: Array.isArray(n.tags) ? n.tags.map(t=>String(t||'')).filter(Boolean) : [],
    fields: fields,
    content: String(n.content ?? ''),
    images: Array.isArray(n.images) ? n.images.map(x=>String(x||'')) : [],
    createdAt: n.createdAt || today(),
    updatedAt: n.updatedAt || today(),
    star: !!n.star
  };
}

function loadLocal(){
  try{
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if(Array.isArray(raw)){
      notes = raw.map(sanitizeNote).filter(Boolean);
      return;
    }
  }catch(e){}
  // 兼容旧 key 迁移
  const oldKeys = ['my_notes_v5','my_notes_v4'];
  for(const k of oldKeys){
    try{
      const old = JSON.parse(localStorage.getItem(k));
      if(Array.isArray(old)){
        notes = old.map(sanitizeNote).filter(Boolean);
        localStorage.setItem(STORE_KEY, JSON.stringify(notes));
        return;
      }
    }catch(e){}
  }
  notes = [];
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

function dedupeNotesByTitle(notesArr){
  const titleMap = new Map();
  const noTitleList = [];
  for(const n of notesArr){
    if(!n || typeof n !== 'object') continue;
    const title = String(n.title || '').trim();
    if(!title){ noTitleList.push(n); continue; }
    const prev = titleMap.get(title);
    const curTime = String(n.updatedAt || '');
    const prevTime = prev ? String(prev.updatedAt || '') : '';
    if(!prev || curTime > prevTime){
      titleMap.set(title, n);
    }
  }
  return [...titleMap.values(), ...noTitleList];
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
const starListEl = document.getElementById('starList');

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
  let html = `<div class="nav-item ${!filter.category && !filter.star?'active':''}" data-cat="">
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

  const stars = notes.filter(n=>n.star)
    .sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  starListEl.innerHTML = stars.length
    ? stars.map(n=>`<div class="nav-item ${filter.star && filter.keyword===('__star__'+n.id)?'active':''}" data-star-id="${n.id}">
        <span>★ ${esc(n.title||'（无标题）')}</span>
      </div>`).join('')
    : `<div style="color:#aaa;font-size:12px;padding:8px;">暂无收藏</div>`;
}

catListEl.addEventListener('click', e=>{
  const item = e.target.closest('.nav-item'); if(!item) return;
  filter.category = item.dataset.cat;
  filter.star = false;
  currentIndex = 0;
  renderAll();
  closeSidebar();
});
tagCloudEl.addEventListener('click', e=>{
  const chip = e.target.closest('.tag-chip'); if(!chip) return;
  filter.tag = filter.tag === chip.dataset.tag ? '' : chip.dataset.tag;
  filter.star = false;
  currentIndex = 0;
  renderAll();
  closeSidebar();
});
starListEl.addEventListener('click', e=>{
  const item = e.target.closest('[data-star-id]'); if(!item) return;
  const id = item.dataset.starId;
  const n = notes.find(x=>x.id===id);
  if(!n) return;
  filter = { category:'', tag:'', keyword:'', star:false };
  currentIndex = 0;
  // 直接定位到这条
  const idxAll = notes.findIndex(x=>x.id===id);
  renderAll();
  setTimeout(()=>{
    const idx = currentData.findIndex(x=>x.id===id);
    if(idx >= 0) goTo(idx);
  }, 60);
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
    if(filter.star && !n.star) return false;
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
  const isNote = n.type === 'note';
  const titleHTML = `<h3 class="card-title">${hl(esc(n.title||'（无标题）'), kw)}</h3>`;
  const catHTML = n.category ? `<span class="card-cat">${esc(n.category)}</span>` : '';
  const typeHTML = isNote ? `<span class="card-type-note">📝 笔记</span>` : '';
  const tagsHTML = (n.tags||[]).map(t=>`<span class="card-tag">${esc(t)}</span>`).join('');
  const metaHTML = (catHTML || tagsHTML || typeHTML)
    ? `<div class="card-meta">${catHTML}${typeHTML}${tagsHTML}</div>` : '';

  const linkImg = getLinkImg(n);
  const localImgs = getLocalImgs(n);

  const copyLinkBtn = linkImg
    ? `<button class="card-copy-link" data-act="copyLink" data-id="${n.id}" title="复制图片链接">📋 复制链接</button>`
    : '';
  const imgBadge = localImgs.length
    ? `<button class="card-imgs-badge" data-act="imgs" data-id="${n.id}" title="查看本地图片">🖼 ${localImgs.length}</button>`
    : '';

  const fieldRows = isNote ? '' : Object.entries(n.fields||{})
    .filter(([k,v])=>k||v)
    .map(([k,v])=>
      `<div class="field-row">
         <span class="fk">${esc(k)}</span>
         <span class="fv">${hl(esc(v), kw)}</span>
       </div>`
    ).join('');
  const hasFields = !!fieldRows;
  const fieldsHTML = hasFields ? `<div class="card-fields">${fieldRows}</div>` : '';

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

  // 笔记：不渲染 upper 和 split-handle，正文直接占满
  const splitInner = isNote
    ? `<div class="card-lower" style="flex:1;">${contentHTML}</div>`
    : `<div class="card-upper">${fieldsHTML}</div>
       <div class="split-handle" data-split-handle title="上下拖动调整比例">
         <span class="sh-label">
           <span class="sh-grip"><i></i><i></i></span>
           <span class="sh-text">正文</span>
           <span class="sh-num">0 / 0</span>
           <span class="sh-grip"><i></i><i></i></span>
         </span>
       </div>
       <div class="card-lower">${contentHTML}</div>`;

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
        ${splitInner}
      </div>
    </div>
    ${relationsHTML}
    <div class="ops">
      <button data-act="edit">编辑</button>
      <button data-act="copy">复制</button>
      <button data-act="del" class="danger">删除</button>
    </div>
  </div>`;
}

function listItemHTML(n){
  const isNote = n.type === 'note';
  const cat = n.category ? `<span class="lc">${esc(n.category)}</span>` : '';
  const typeTag = isNote ? `<span class="lc" style="background:#fdf3e0;color:#8a6d3b;">📝 笔记</span>` : '';
  const tags = (n.tags||[]).slice(0,3).map(t=>`<span class="tag-mini">${esc(t)}</span>`).join('');
  const localCount = getLocalImgs(n).length;
  const hasLink = !!getLinkImg(n);
  let imgBadge = '';
  if(localCount) imgBadge += `<span class="img-badge">🖼 ${localCount}</span>`;
  if(hasLink) imgBadge += `<span class="img-badge">📋 链接</span>`;
  let summary = '';
  if(!isNote){
    const firstField = Object.entries(n.fields||{})[0];
    if(firstField) summary = `${firstField[0]} ${firstField[1]}`;
  }
  if(!summary && n.content) summary = String(n.content).replace(/\[\[|\]\]/g,'').slice(0,60);
  return `
  <div class="list-item" data-id="${n.id}">
    <div class="row1">
      <span class="lt">${esc(n.title||'（无标题）')}</span>
      <span class="ls ${n.star?'on':''}">${n.star?'★':'☆'}</span>
    </div>
    <div class="row2">${cat}${typeTag}${tags}${imgBadge}
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
      <div>${filter.category || filter.tag || filter.star || kw ? '没有匹配的结果' : '还没有资料，点「＋ 新建」开始吧'}</div>
    </div>`;
    swiperEl.innerHTML = emptyHTML;
    listviewEl.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#888;">${filter.category || filter.tag || filter.star || kw ? '没有匹配的结果' : '还没有资料'}</div>`;
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
  let catLabel = '全部';
  if(filter.star) catLabel = '★ 收藏';
  else if(filter.category) catLabel = filter.category;
  else if(filter.tag) catLabel = '#' + filter.tag;

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
  if(document.getElementById('giteeSet').classList.contains('show')) return;
  if(document.getElementById('dlChoice').classList.contains('show')) return;
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
    filter = {category:'',tag:'',keyword:'',star:false};
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
    localStorage.setItem('my_notes_view', 'card');
    applyViewMode();
    currentIndex = idx;
    renderAll();
  }
});

document.getElementById('btnView').onclick = ()=>{
  viewMode = viewMode === 'card' ? 'list' : 'card';
  localStorage.setItem('my_notes_view', viewMode);
  applyViewMode();
  if(viewMode === 'card'){
    requestAnimationFrame(()=>{
      swiperEl.scrollLeft = currentIndex * swiperEl.clientWidth;
    });
  }
};

document.getElementById('btnRefresh').onclick = ()=>{
  if(confirm('刷新页面？\n（会重新加载最新代码，本地数据不丢）')){
    location.reload(true);
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
  localStorage.setItem('my_notes_split', String(splitPercent));
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
  if(n.type !== 'note'){
    const fields = Object.entries(n.fields||{}).filter(([k,v])=>k||v);
    if(fields.length){
      parts.push('');
      fields.forEach(([k,v])=>parts.push(`${k}：${v}`));
    }
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

/* ================= 编辑面板（资料/笔记 Tab） ================= */
const editor = document.getElementById('editor');
let editingId = null;
let editingImages = [];
let editingType = 'material';
let pendingCategory = '';
let pendingCategoryOld = '';

function setEditorType(type){
  editingType = type === 'note' ? 'note' : 'material';
  const tabs = document.querySelectorAll('#typeTabs .type-tab');
  tabs.forEach(t=>t.classList.toggle('active', t.dataset.type === editingType));
  const fieldBlock = document.getElementById('fieldBlock');
  if(editingType === 'note'){
    fieldBlock.classList.add('hide');
  }else{
    fieldBlock.classList.remove('hide');
  }
}

document.getElementById('typeTabs').addEventListener('click', e=>{
  const tab = e.target.closest('.type-tab');
  if(!tab) return;
  const newType = tab.dataset.type;
  if(newType === editingType) return;

  // 资料→笔记：字段框可能有内容，确认
  if(editingType === 'material' && newType === 'note'){
    if(fieldsHaveValues()){
      if(!confirm('切换到「笔记」会清空当前结构化字段，继续？')){
        return;
      }
    }
    document.getElementById('fFields').value = '';
    setEditorType('note');
    return;
  }

  // 笔记→资料：按当前分类填字段模板
  if(editingType === 'note' && newType === 'material'){
    if(!confirm('切换为「资料」后将出现结构化字段，按分类模板填充，继续？')){
      return;
    }
    setEditorType('material');
    const cat = document.getElementById('fCategory').value;
    const tmpl = getCatFields(cat);
    if(tmpl.length){
      document.getElementById('fFields').value = tmpl.map(f=>`${f}=`).join('\n');
    }else{
      document.getElementById('fFields').value = '';
    }
    return;
  }
});

function openEditor(note){
  editingId = note ? note.id : null;
  editingImages = note && note.images ? note.images.slice() : [];
  editingType = note && note.type === 'note' ? 'note' : 'material';

  document.getElementById('editorTitle').textContent = note ? '编辑' : '新建';
  document.getElementById('fTitle').value = note?.title || '';
  document.getElementById('fTags').value = (note?.tags||[]).join(',');
  document.getElementById('fFields').value = Object.entries(note?.fields||{})
      .map(([k,v])=>`${k}=${v}`).join('\n');
  document.getElementById('fContent').value = note?.content || '';
  rebuildCategorySelect(note?.category || '');
  setEditorType(editingType);
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
  editingType = 'material';
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
  // 笔记模式不触发字段模板逻辑
  if(editingType === 'note') return;

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
  if(editingType !== 'note'){
    document.getElementById('fFields').value.split('\n').forEach(line=>{
      const i = line.indexOf('=');
      if(i>0){
        const k = line.slice(0,i).trim();
        const v = line.slice(i+1).trim();
        if(k) fields[k]=v;
      }
    });
  }

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
    if(n){
      n.type = editingType;
      n.title = title;
      n.category = category.trim();
      n.tags = tags;
      n.fields = fields;
      n.content = content;
      n.images = editingImages.slice();
      n.updatedAt = now;
      delete n.history;
    }
  }else{
    notes.unshift({
      id: uid(), type: editingType, title,
      category: category.trim(),
      tags, fields, content,
      images: editingImages.slice(),
      createdAt: now, updatedAt: now, star: false
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
    {name:'Gitee 设置', run:()=>openGiteeSet()},
    {name:'导入 JSON', run:()=>importJSON()},
    {name:'导出 JSON', run:()=>exportJSON()},
    {name:'切换视图（卡片/列表）', run:()=>document.getElementById('btnView').click()},
    {name:'重置字段/正文比例', run:()=>{
      splitPercent = 45;
      localStorage.setItem('my_notes_split', '45');
      updateSplitDisplay(45);
      toast('已重置 45 / 55');
    }},
    {name:'清除筛选（显示全部）', run:()=>{
      filter = {category:'',tag:'',keyword:'',star:false};
      currentIndex = 0; renderAll();
    }},
    {name:'⚠️ 清空数据', danger:true, run:()=>openClearData()},
  ];
  commands.forEach(c=>{
    if(!q || c.name.toLowerCase().includes(q)) items.push({type:'cmd', name:c.name, run:c.run, danger:c.danger});
  });

  if(q){
    const cats = new Set(), tags = new Set();
    notes.forEach(n=>{
      if(n.category) cats.add(n.category);
      (n.tags||[]).forEach(t=>tags.add(t));
    });
    [...cats].filter(c=>c.toLowerCase().includes(q)).slice(0,4).forEach(c=>{
      items.push({type:'cmd', name:`筛选分类：${c}`, run:()=>{
        filter={category:c,tag:'',keyword:'',star:false}; currentIndex=0; renderAll();
      }});
    });
    [...tags].filter(t=>t.toLowerCase().includes(q)).slice(0,4).forEach(t=>{
      items.push({type:'cmd', name:`筛选标签：#${t}`, run:()=>{
        filter={category:'',tag:t,keyword:'',star:false}; currentIndex=0; renderAll();
      }});
    });
  }

  if(q){
    const pool = currentData.length ? currentData : notes;
    pool.filter(n=>matchKw(n, q)).slice(0,8).forEach(n=>{
      const idx = currentData.findIndex(x=>x.id===n.id);
      items.push({type:'note', name:n.title || '（无标题）', run:()=>{
        if(idx >= 0){
          viewMode = 'card'; localStorage.setItem('my_notes_view', 'card');
          applyViewMode(); goTo(idx);
        }else{
          filter.keyword = n.title; currentIndex=0; renderAll();
        }
      }});
    });
  }

  cmdList.innerHTML = items.length
    ? items.map((it,i)=>`<div class="cmd-item ${i===cmdIndex?'sel':''} ${it.danger?'danger':''}" data-i="${i}">
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
    viewMode = 'card'; localStorage.setItem('my_notes_view', 'card'); applyViewMode();
  }
  requestAnimationFrame(()=>goTo(i));
});
jump.addEventListener('click', e=>{ if(e.target===jump) closeJump(); });

/* ================= 导入导出 ================= */
function buildCleanNotes(){
  const arr = dedupeNotesByTitle(notes);
  return arr.map(n => ({
    id: n.id,
    type: n.type === 'note' ? 'note' : 'material',
    title: n.title,
    category: n.category,
    tags: Array.isArray(n.tags) ? n.tags : [],
    fields: n.fields || {},
    content: n.content || '',
    images: Array.isArray(n.images) ? n.images : [],
    createdAt: n.createdAt || '',
    updatedAt: n.updatedAt || '',
    star: !!n.star
  }));
}

function exportJSON(){
  const cleanNotes = buildCleanNotes();
  const payload = {
    _version: 7,
    _exportedAt: new Date().toISOString(),
    categories: categories,
    notes: cleanNotes
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `notes_${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`已导出 ${cleanNotes.length} 条`);
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
        const titles = new Set(notes.map(n=>String(n.title||'').trim()).filter(Boolean));
        let added = 0;
        data.forEach(raw=>{
          const n = sanitizeNote(raw);
          if(!n) return;
          if(ids.has(n.id)) return;
          const title = String(n.title||'').trim();
          if(title && titles.has(title)) return;
          notes.push(n);
          ids.add(n.id);
          if(title) titles.add(title);
          added++;
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

/* ================= 清空数据 ================= */
function openClearData(){
  closeCmd();
  setTimeout(()=>{
    if(notes.length === 0){
      toast('资料库已经是空的');
      return;
    }
    const total = notes.length;
    const input = prompt(
      `⚠️ 清空全部资料？\n\n` +
      `当前共 ${total} 条资料，将全部删除。\n` +
      `（分类配置、Gitee 设置会保留）\n\n` +
      `此操作不可撤销！\n` +
      `如果确定，请输入「清空」两个字：`
    );
    if(input === null) return;
    if(input.trim() !== '清空'){
      toast('已取消');
      return;
    }
    if(!confirm(`最后确认：删除全部 ${total} 条资料？\n\n确定后不可恢复。`)){
      return;
    }
    notes = [];
    saveLocal();
    currentIndex = 0;
    filter = {category:'',tag:'',keyword:'',star:false};
    renderAll();
    toast(`已清空 ${total} 条资料`);
  }, 100);
}

/* ================= Gitee 配置 ================= */
const SYNC_KEY = 'my_notes_gitee_cfg';

function buildSyncPayload(){
  return {
    _version: 7,
    _exportedAt: new Date().toISOString(),
    categories: categories,
    notes: buildCleanNotes()
  };
}

function getSyncCfg(){
  try{ return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; }
  catch(e){ return {}; }
}
function saveSyncCfg(cfg){
  localStorage.setItem(SYNC_KEY, JSON.stringify(cfg));
}

const GITEE_API = 'https://gitee.com/api/v5';

function giteeFilePath(){
  const cfg = getSyncCfg();
  return cfg.filePath || '我的数据库/资料库.json';
}
function giteeDirPath(){
  const p = giteeFilePath();
  const i = p.lastIndexOf('/');
  return i >= 0 ? p.slice(0, i) : '';
}

function encodeGiteePath(path){
  return path.split('/').map(s=>encodeURIComponent(s)).join('/');
}

const EMPTY_PLACEHOLDER = ['{}', '', 'null', '{"notes":[]}', '{"notes":[],"categories":[]}'];

async function giteeGet(path){
  const cfg = getSyncCfg();
  const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}?access_token=${encodeURIComponent(cfg.token)}`;
  return fetch(url);
}
async function giteePut(path, contentBase64, message, sha){
  const cfg = getSyncCfg();
  const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}`;
  const body = {
    access_token: cfg.token,
    content: contentBase64,
    message: message || `同步 ${new Date().toLocaleString()}`
  };
  if(sha) body.sha = sha;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
async function giteeDelete(path, sha, message){
  const cfg = getSyncCfg();
  const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}`;
  const body = {
    access_token: cfg.token,
    sha: sha,
    message: message || `删除 ${new Date().toLocaleString()}`
  };
  return fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
async function giteeListDir(dirPath){
  const cfg = getSyncCfg();
  const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(dirPath)}?access_token=${encodeURIComponent(cfg.token)}`;
  const r = await fetch(url);
  if(!r.ok) return null;
  return await r.json();
}

/* ================= Gitee 设置弹窗（带锁） ================= */
const giteeSet = document.getElementById('giteeSet');
const gsetMsgEl = document.getElementById('gsetMsg');

let gsetLocked = true;
let gsetLockTimer = null;
const GSET_LOCK_TIMEOUT = 5000;

function setGsetLocked(locked){
  gsetLocked = locked;
  const mask = document.getElementById('gsetLockMask');
  const saveBtn = document.getElementById('gsetSave');
  const unlockBtn = document.getElementById('gsetUnlock');
  const lockIcon = document.getElementById('gsetLockIcon');
  const inputs = document.querySelectorAll('#giteeSet .gset-body input');

  if(locked){
    mask.style.display = 'flex';
    saveBtn.disabled = true;
    unlockBtn.textContent = '● 开启';
    lockIcon.textContent = '🔒';
    inputs.forEach(inp=>{ inp.disabled = true; });
    if(gsetLockTimer){ clearTimeout(gsetLockTimer); gsetLockTimer = null; }
    const pass = document.getElementById('gsetPass');
    if(pass) pass.type = 'password';
    updateTokenEye();
  }else{
    mask.style.display = 'none';
    saveBtn.disabled = false;
    unlockBtn.textContent = '🔓 已解锁';
    lockIcon.textContent = '🔓';
    inputs.forEach(inp=>{ inp.disabled = false; });
  }
}

function scheduleAutoLock(){
  if(gsetLockTimer) clearTimeout(gsetLockTimer);
  if(gsetLocked) return;
  gsetLockTimer = setTimeout(()=>{
    setGsetLocked(true);
  }, GSET_LOCK_TIMEOUT);
}

function updateTokenEye(){
  const eye = document.getElementById('gsetPassEye');
  const pass = document.getElementById('gsetPass');
  if(!eye || !pass) return;
  if(pass.type === 'password'){
    eye.textContent = '👁';
    eye.title = '显示 Token';
  }else{
    eye.textContent = '🙈';
    eye.title = '隐藏 Token';
  }
}

function openGiteeSet(){
  const cfg = getSyncCfg();
  document.getElementById('gsetUser').value = cfg.owner || '';
  document.getElementById('gsetPass').value = cfg.token || '';
  document.getElementById('gsetRepo').value = cfg.repo || '';
  document.getElementById('gsetPath').value = cfg.filePath || '我的数据库/资料库.json';
  gsetMsgEl.textContent = '';
  gsetMsgEl.classList.remove('err');

  document.getElementById('gsetPass').type = 'password';
  updateTokenEye();
  setGsetLocked(true);

  giteeSet.classList.add('show');
}
function closeGiteeSet(){
  giteeSet.classList.remove('show');
  if(gsetLockTimer){ clearTimeout(gsetLockTimer); gsetLockTimer = null; }
  setGsetLocked(true);
}

document.getElementById('gsetClose').onclick = closeGiteeSet;
giteeSet.addEventListener('click', e=>{
  if(e.target === giteeSet) closeGiteeSet();
});

function gsetMsg(msg, isErr){
  gsetMsgEl.textContent = msg;
  gsetMsgEl.classList.toggle('err', !!isErr);
}

document.getElementById('gsetUnlock').onclick = ()=>{
  if(gsetLocked){
    setGsetLocked(false);
    scheduleAutoLock();
  }else{
    setGsetLocked(true);
  }
};

document.getElementById('gsetPassEye').onclick = ()=>{
  if(gsetLocked) return;
  const pass = document.getElementById('gsetPass');
  if(!pass) return;
  if(pass.type === 'password'){
    pass.type = 'text';
    updateTokenEye();
    scheduleAutoLock();
  }else{
    pass.type = 'password';
    updateTokenEye();
    scheduleAutoLock();
  }
};

document.querySelectorAll('#giteeSet .gset-body input').forEach(inp=>{
  inp.addEventListener('input', ()=>{
    if(!gsetLocked) scheduleAutoLock();
  });
  inp.addEventListener('focus', ()=>{
    if(!gsetLocked) scheduleAutoLock();
  });
});

document.getElementById('gsetSave').onclick = ()=>{
  if(gsetLocked){ gsetMsg('请先点「● 开启」解锁', true); return; }
  const owner = document.getElementById('gsetUser').value.trim();
  const token = document.getElementById('gsetPass').value.trim();
  const repo = document.getElementById('gsetRepo').value.trim();
  const filePath = document.getElementById('gsetPath').value.trim() || '我的数据库/资料库.json';
  if(!owner){ gsetMsg('请填写 Gitee 用户名', true); return; }
  if(!token){ gsetMsg('请填写私人令牌', true); return; }
  if(!repo){ gsetMsg('请填写仓库名', true); return; }
  saveSyncCfg({owner, token, repo, filePath});
  gsetMsg('✅ 已保存设置');
  scheduleAutoLock();
};

/* ================= Gitee 同步弹窗 ================= */
const syncPanel = document.getElementById('syncPanel');
const syncMsgEl = document.getElementById('syncMsg');
const syncInfoEl = document.getElementById('syncInfo');
const syncFileListWrap = document.getElementById('syncFileListWrap');
const syncFileListEl = document.getElementById('syncFileList');

function openSyncPanel(){
  const cfg = getSyncCfg();
  if(!cfg.owner || !cfg.token || !cfg.repo){
    toast('请先在 ⌘ 面板设置 Gitee 账号');
    return;
  }
  syncInfoEl.innerHTML = `
    账号：<b>${esc(cfg.owner)}</b><br>
    仓库：<b>${esc(cfg.repo)}</b><br>
    主文件：<b>${esc(cfg.filePath || '我的数据库/资料库.json')}</b>
  `;
  syncMsgEl.textContent = '';
  syncMsgEl.classList.remove('err');
  syncFileListWrap.style.display = 'none';
  syncFileListEl.innerHTML = '';
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

async function doSyncUpload(){
  const cfg = getSyncCfg();
  if(!cfg.owner || !cfg.token || !cfg.repo){ syncMsg('请先保存设置', true); return; }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async ()=>{
    const file = input.files[0]; if(!file) return;

    const prefix = prompt('请输入文件名前缀（比如 A厂、资料库）：', '');
    if(!prefix){
      syncMsg('已取消上传', true);
      return;
    }
    const trimmedPrefix = prefix.trim();
    if(!trimmedPrefix){
      syncMsg('文件名前缀不能为空', true);
      return;
    }

    const btn = document.getElementById('syncUpload');
    btn.disabled = true;
    syncMsg('⏳ 正在读取文件…');

    try{
      const text = await file.text();
      try{ JSON.parse(text); }catch(e){ throw new Error('文件不是有效 JSON'); }

      const dir = giteeDirPath();
      const dateStr = today();
      syncMsg('⏳ 正在检查远端文件…');
      let existingNames = [];
      const list = await giteeListDir(dir);
      if(Array.isArray(list)){
        existingNames = list.map(x=>x.name);
      }

      let num = 1;
      let fileName;
      while(true){
        fileName = `${trimmedPrefix}-${dateStr}T${num}.json`;
        if(!existingNames.includes(fileName)) break;
        num++;
      }

      const fullPath = dir ? `${dir}/${fileName}` : fileName;
      syncMsg(`⏳ 正在上传：${fileName}…`);

      const contentB64 = btoa(unescape(encodeURIComponent(text)));
      const r = await giteePut(fullPath, contentB64, `上传 ${fileName}`);
      if(r.ok){
        syncMsg(`✅ 上传成功\n文件名：${fileName}\n大小：${(text.length/1024).toFixed(1)} KB`);
      }else{
        const err = await r.text();
        syncMsg(`❌ 上传失败：${r.status}\n${err}`, true);
      }
    }catch(e){
      syncMsg('❌ 出错：' + e.message, true);
    }
    btn.disabled = false;
  };

  input.click();
}

async function doSyncDownload(){
  const cfg = getSyncCfg();
  if(!cfg.owner || !cfg.token || !cfg.repo){ syncMsg('请先保存设置', true); return; }
  const btn = document.getElementById('syncDownload');
  btn.disabled = true;
  syncMsg('⏳ 正在读取远端文件列表…');

  try{
    const dir = giteeDirPath();
    const list = await giteeListDir(dir);
    if(!list || !Array.isArray(list)){
      syncMsg('❌ 无法列出目录（可能目录为空或路径不对）', true);
      btn.disabled = false;
      return;
    }
    const files = list
      .filter(x => x.type === 'file' && /\.json$/i.test(x.name))
      .sort((a,b)=> (b.name||'').localeCompare(a.name||''));

    if(!files.length){
      syncMsg('ℹ️ 目录里还没有 JSON 文件');
      btn.disabled = false;
      return;
    }

    syncMsg(`📂 共 ${files.length} 个文件，点选要下载的：`);
    syncFileListWrap.style.display = 'block';
    syncFileListEl.innerHTML = files.map((f, i)=>{
      const size = f.size ? `${(f.size/1024).toFixed(1)} KB` : '';
      return `<div class="file-item" data-fi="${i}">
        <span class="fi-name">${esc(f.name)}</span>
        <span class="fi-meta">${size}</span>
      </div>`;
    }).join('');

    syncFileListEl._files = files;
    syncFileListEl._dir = dir;
  }catch(e){
    syncMsg('❌ 出错：' + e.message, true);
  }
  btn.disabled = false;
}

syncFileListEl.addEventListener('click', e=>{
  const item = e.target.closest('.file-item'); if(!item) return;
  const i = parseInt(item.dataset.fi, 10);
  const files = syncFileListEl._files || [];
  const f = files[i];
  if(!f) return;
  openDownloadChoice(f, syncFileListEl._dir || '');
});

const dlChoice = document.getElementById('dlChoice');
const dlNameEl = document.getElementById('dlName');
const dlMetaEl = document.getElementById('dlMeta');
let dlTargetFile = null;
let dlTargetDir = '';

function openDownloadChoice(file, dir){
  dlTargetFile = file;
  dlTargetDir = dir;
  dlNameEl.textContent = file.name;
  dlMetaEl.textContent = file.size ? `${(file.size/1024).toFixed(1)} KB` : '';
  dlChoice.classList.add('show');
}
function closeDownloadChoice(){
  dlChoice.classList.remove('show');
  dlTargetFile = null;
  dlTargetDir = '';
}
document.getElementById('dlCancel').onclick = closeDownloadChoice;
dlChoice.addEventListener('click', e=>{
  if(e.target === dlChoice) closeDownloadChoice();
});

document.getElementById('dlToPhone').onclick = async ()=>{
  if(!dlTargetFile) return;
  const file = dlTargetFile;
  const dir = dlTargetDir;
  closeDownloadChoice();

  syncMsg('⏳ 正在下载文件…');
  try{
    const cfg = getSyncCfg();
    const fullPath = dir ? `${dir}/${file.name}` : file.name;
    const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(fullPath)}?access_token=${encodeURIComponent(cfg.token)}`;
    const r = await fetch(url);
    if(!r.ok){
      syncMsg(`❌ 下载失败：${r.status}`, true);
      return;
    }
    const data = await r.json();
    let text = '';
    try{
      text = decodeURIComponent(escape(atob(data.content.replace(/\n/g,''))));
    }catch(e){ text = ''; }

    const blob = new Blob([text], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
    syncMsg(`✅ 已下载到手机：${file.name}`);
  }catch(e){
    syncMsg('❌ 下载出错：' + e.message, true);
  }
};

document.getElementById('dlToLib').onclick = async ()=>{
  if(!dlTargetFile) return;
  const file = dlTargetFile;
  const dir = dlTargetDir;

  if(!confirm(`确定用「${file.name}」覆盖当前资料库？\n\n当前 ${notes.length} 条资料会被替换。`)){
    return;
  }
  closeDownloadChoice();

  syncMsg('⏳ 正在读取文件…');
  try{
    const cfg = getSyncCfg();
    const fullPath = dir ? `${dir}/${file.name}` : file.name;
    const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(fullPath)}?access_token=${encodeURIComponent(cfg.token)}`;
    const r = await fetch(url);
    if(!r.ok){
      syncMsg(`❌ 读取失败：${r.status}`, true);
      return;
    }
    const data = await r.json();
    let text = '';
    try{
      text = decodeURIComponent(escape(atob(data.content.replace(/\n/g,''))));
    }catch(e){ text = ''; }

    const payload = JSON.parse(text);
    if(!payload || !Array.isArray(payload.notes)){
      syncMsg('❌ 文件格式错误（没有 notes 字段）', true);
      return;
    }
    notes = payload.notes.map(sanitizeNote).filter(Boolean);
    notes = dedupeNotesByTitle(notes);
    if(Array.isArray(payload.categories)){
      categories = payload.categories;
      saveCats();
    }
    saveLocal();
    rebuildCategorySelect();
    renderAll();
    syncMsg(`✅ 已导入资料库（${notes.length} 条）`);
  }catch(e){
    syncMsg('❌ 导入出错：' + e.message, true);
  }
};

async function doSyncNow(){
  const cfg = getSyncCfg();
  if(!cfg.owner || !cfg.token || !cfg.repo){ syncMsg('请先保存设置', true); return; }
  const btn = document.getElementById('syncNow');
  btn.disabled = true;
  syncMsg('⏳ 正在检查远端…');

  try{
    const path = giteeFilePath();
    const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}?access_token=${encodeURIComponent(cfg.token)}`;

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
      await doSyncNowUpload(true);
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
        notes = remote.notes.map(sanitizeNote).filter(Boolean);
        notes = dedupeNotesByTitle(notes);
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
        await doSyncNowUpload(false);
        return;
      }
    }else{
      btn.disabled = false;
      await doSyncNowUpload(false);
      return;
    }
  }catch(e){
    syncMsg('❌ 同步出错：' + e.message, true);
  }
  btn.disabled = false;
}

async function doSyncNowUpload(skipConfirm){
  const cfg = getSyncCfg();
  if(!cfg.owner || !cfg.token || !cfg.repo){ syncMsg('请先保存设置', true); return; }
  const path = giteeFilePath();

  let sha = null;
  try{
    const r1 = await giteeGet(path);
    if(r1.ok){
      const data = await r1.json();
      sha = data.sha;
    }
  }catch(e){}

  if(sha && !skipConfirm){
    const tmpText = JSON.stringify(buildSyncPayload(), null, 2);
    const ok = confirm(
      `远端已存在文件：\n${path}\n\n` +
      `本地当前 ${notes.length} 条资料\n` +
      `本次将上传大小约 ${(tmpText.length/1024).toFixed(1)} KB\n\n` +
      `是否覆盖远端？`
    );
    if(!ok){
      syncMsg('已取消上传');
      return;
    }
  }

  if(sha){
    syncMsg('⏳ 正在删除旧文件…');
    const rd = await giteeDelete(path, sha);
    if(!rd.ok){
      const err = await rd.text();
      syncMsg(`❌ 删除旧文件失败：${rd.status}\n${err}`, true);
      return;
    }
  }

  syncMsg('⏳ 正在上传新文件…');
  const text = JSON.stringify(buildSyncPayload(), null, 2);
  const content = btoa(unescape(encodeURIComponent(text)));
  const r2 = await giteePut(path, content, `同步 ${new Date().toLocaleString()}`);
  if(r2.ok){
    syncMsg(`✅ 上传成功（${sha ? '已覆盖' : '新建'}）\n路径：${path}\n大小：${(text.length/1024).toFixed(1)} KB`);
  }else{
    const err = await r2.text();
    syncMsg(`❌ 上传失败：${r2.status}\n${err}`, true);
  }
}

document.getElementById('syncNow').onclick = ()=>{
  syncFileListWrap.style.display = 'none';
  doSyncNow();
};

document.getElementById('syncUpload').onclick = ()=>{
  syncFileListWrap.style.display = 'none';
  doSyncUpload();
};

document.getElementById('syncDownload').onclick = ()=>{
  doSyncDownload();
};

document.getElementById('btnGitee').onclick = openSyncPanel;

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
    if(giteeSet.classList.contains('show')) closeGiteeSet();
    if(dlChoice.classList.contains('show')) closeDownloadChoice();
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
updateTokenEye();
