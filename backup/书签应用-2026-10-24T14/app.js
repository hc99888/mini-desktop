
if("serviceWorker" in navigator){navigator.serviceWorker.register("sw.js");}



(function(){
"use strict";

/* ================= 通用工具 ================= */
function safeParseJSON(str, fallback){
  try{ return JSON.parse(str); }catch(e){ return fallback; }
}
function safeAtob(b64){
  try{
    const clean = String(b64||"").replace(/\s/g,"");
    return decodeURIComponent(Array.prototype.map.call(atob(clean), c =>
      "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
  }catch(e){
    try{ return atob(String(b64||"").replace(/\s/g,"")); }catch(e2){ return ""; }
  }
}
function safeBtoa(str){
  try{
    return btoa(unescape(encodeURIComponent(String(str==null?"":str))));
  }catch(e){ return ""; }
}
const EMPTY_PLACEHOLDER = "empty";

/* ================= 书签主体逻辑 ================= */
const STORAGE_KEY="catBookmarks_v4";
let categories=[];
let editingCatIndex=null;
let editingBookmark={catIndex:null,bookmarkIndex:null};

const container=document.getElementById("categoriesContainer");
const addBookmarkBtn=document.getElementById("addBookmarkBtn");
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
function getInitial(t){t=(t||"?").trim();return t?t[0].toUpperCase():"?";}
function getColor(t){t=t||"?";let h=0;for(let i=0;i<t.length;i++)h=t.charCodeAt(i)+((h<<5)-h);return`hsl(${Math.abs(h)%360},60%,55%)`;}
function normalizeUrl(u){u=u.trim();return/^https?:\/\//i.test(u)?u:"https://"+u;}
function favicon(u){try{const host=new URL(u).hostname;return`https://www.google.com/s2/favicons?domain=${host}&sz=64`;}catch(e){return"";}}

dropdownBtn.onclick=e=>{e.stopPropagation();renderDropdown();dropdownMenu.style.display=dropdownMenu.style.display==="block"?"none":"block";};
function renderDropdown(){
  dropdownMenu.innerHTML="";
  categories.forEach(c=>{
    const d=document.createElement("div");
    d.textContent=c.name;
    d.onclick=()=>{inputCategory.value=c.name;dropdownMenu.style.display="none";};
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
    block.addEventListener("dragstart",e=>{block.classList.add("dragging");e.dataTransfer.setData("text/plain",ci);});
    block.addEventListener("dragend",()=>block.classList.remove("dragging"));
    block.addEventListener("dragover",e=>{
      e.preventDefault();
      const dragging=document.querySelector(".category-block.dragging");
      if(!dragging)return;
      const blocks=[...container.children];
      const currentIndex=blocks.indexOf(block);
      const draggingIndex=blocks.indexOf(dragging);
      if(currentIndex!==draggingIndex){
        if(currentIndex>draggingIndex)container.insertBefore(dragging,block.nextSibling);
        else container.insertBefore(dragging,block);
      }
    });
    block.addEventListener("drop",()=>{
      const newOrder=[...container.children].map(b=>categories[b.dataset.index]);
      categories=newOrder;save();render();
    });
    const header=document.createElement("div");
    header.className="category-header";
    header.innerHTML=`<span class="category-name">${escapeHtml(cat.name)}</span>
      <div class="category-actions">
        <button class="edit-cat" data-i="${ci}">改</button>
        <button class="del-cat" data-i="${ci}">删</button>
      </div>`;
    const grid=document.createElement("div");
    grid.className="grid";
    cat.bookmarks.forEach((b,bi)=>grid.appendChild(createTile(ci,bi,b)));
    block.appendChild(header);block.appendChild(grid);container.appendChild(block);
  });
  document.querySelectorAll(".edit-cat").forEach(btn=>btn.onclick=()=>openEditCategory(+btn.dataset.i));
  document.querySelectorAll(".del-cat").forEach(btn=>{
    btn.onclick=()=>{
      const i=+btn.dataset.i;
      if(confirm(`删除分类“${categories[i].name}”？`)){categories.splice(i,1);save();render();}
    };
  });
}

function createTile(ci,bi,b){
  const t=document.createElement("div");
  t.className="tile";t.draggable=true;t.dataset.ci=ci;t.dataset.bi=bi;
  t.addEventListener("dragstart",()=>t.classList.add("dragging"));
  t.addEventListener("dragend",()=>t.classList.remove("dragging"));
  t.addEventListener("dragover",e=>{
    e.preventDefault();
    const dragging=document.querySelector(".tile.dragging");
    if(!dragging)return;
    const grid=t.parentElement;
    const tiles=[...grid.children];
    const currentIndex=tiles.indexOf(t);
    const draggingIndex=tiles.indexOf(dragging);
    if(currentIndex!==draggingIndex){
      if(currentIndex>draggingIndex)grid.insertBefore(dragging,t.nextSibling);
      else grid.insertBefore(dragging,t);
    }
  });
  t.addEventListener("drop",()=>{
    const grid=t.parentElement;
    const newOrder=[...grid.children].map(tile=>categories[tile.dataset.ci].bookmarks[tile.dataset.bi]);
    categories[ci].bookmarks=newOrder;save();render();
  });
  t.onclick=e=>{
    if(t.classList.contains("show-actions")){
      currentVisitUrl=b.url;
      descContent.textContent=b.desc||"无说明";
      descModalBackdrop.style.display="flex";
      t.classList.remove("show-actions");
    }else{
      document.querySelectorAll(".tile.show-actions").forEach(x=>x.classList.remove("show-actions"));
      t.classList.add("show-actions");
    }
  };
  const logo=document.createElement("div");
  logo.className="tile-logo";
  if(b.favicon){
    const img=document.createElement("img");
    img.src=b.favicon;
    img.onerror=()=>{logo.textContent=getInitial(b.title||b.url);logo.style.background=getColor(b.title||b.url);};
    logo.appendChild(img);
  }else{
    logo.textContent=getInitial(b.title||b.url);
    logo.style.background=getColor(b.title||b.url);
  }
  const title=document.createElement("div");
  title.className="tile-title";title.textContent=b.title||b.url;
  const act=document.createElement("div");
  act.className="tile-actions";
  const eBtn=document.createElement("button");eBtn.textContent="改";
  eBtn.onclick=e=>{e.stopPropagation();openEditBookmark(ci,bi);};
  const dBtn=document.createElement("button");dBtn.textContent="删";
  dBtn.onclick=e=>{
    e.stopPropagation();
    if(confirm("删除书签？")){categories[ci].bookmarks.splice(bi,1);save();render();}
  };
  act.append(eBtn,dBtn);t.append(logo,title,act);return t;
}

function show(m){m.style.display="flex";}
function hide(m){m.style.display="none";}

function openAddBookmark(){
  modalTitle.textContent="添加书签";
  inputCategory.value="";inputTitle.value="";inputUrl.value="";inputDesc.value="";
  editingBookmark={catIndex:null,bookmarkIndex:null};
  show(modalBackdrop);
}
function openEditBookmark(ci,bi){
  modalTitle.textContent="编辑书签";
  const b=categories[ci].bookmarks[bi];
  inputCategory.value=categories[ci].name;
  inputTitle.value=b.title||"";inputUrl.value=b.url||"";inputDesc.value=b.desc||"";
  editingBookmark={catIndex:ci,bookmarkIndex:bi};
  show(modalBackdrop);
}
function openEditCategory(i){
  inputCategoryName.value=categories[i].name;editingCatIndex=i;show(catModalBackdrop);
}

okModal.onclick=()=>{
  let cat=inputCategory.value.trim();
  const title=inputTitle.value.trim();
  const url=inputUrl.value.trim();
  const desc=inputDesc.value.trim();
  if(!url){alert("网址不能为空");return;}
  if(!cat)cat="默认";
  const u=normalizeUrl(url);
  const data={title:title||u,url:u,favicon:favicon(u),desc:desc||""};
  let ci=categories.findIndex(c=>c.name===cat);
  if(ci===-1){categories.push({name:cat,bookmarks:[]});ci=categories.length-1;}
  if(editingBookmark.bookmarkIndex!=null){
    const old=editingBookmark;
    if(old.catIndex===ci){categories[ci].bookmarks[old.bookmarkIndex]=data;}
    else{categories[old.catIndex].bookmarks.splice(old.bookmarkIndex,1);categories[ci].bookmarks.push(data);}
  }else categories[ci].bookmarks.push(data);
  save();render();hide(modalBackdrop);
};
cancelModal.onclick=()=>hide(modalBackdrop);
modalBackdrop.onclick=e=>{if(e.target===modalBackdrop)hide(modalBackdrop);};
okCategoryModal.onclick=()=>{
  const name=inputCategoryName.value.trim();
  if(!name){alert("分类名称不能为空");return;}
  if(editingCatIndex!=null){categories[editingCatIndex].name=name;editingCatIndex=null;}
  save();render();hide(catModalBackdrop);
};
cancelCategoryModal.onclick=()=>hide(catModalBackdrop);
catModalBackdrop.onclick=e=>{if(e.target===catModalBackdrop)hide(catModalBackdrop);};
addBookmarkBtn.onclick=openAddBookmark;
closeDescModal.onclick=()=>hide(descModalBackdrop);
descModalBackdrop.onclick=e=>{if(e.target===descModalBackdrop)hide(descModalBackdrop);};
visitLinkBtn.onclick=()=>{if(currentVisitUrl){window.open(currentVisitUrl,"_blank");hide(descModalBackdrop);}};
document.addEventListener("click",e=>{
  if(!e.target.closest(".tile"))document.querySelectorAll(".tile.show-actions").forEach(t=>t.classList.remove("show-actions"));
});
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(categories));}
function init(){
  const s=localStorage.getItem(STORAGE_KEY);
  if(s){
    try{
      categories=JSON.parse(s)||[];
      categories.forEach(cat=>cat.bookmarks.forEach(b=>{if(!("desc" in b))b.desc="";}));
    }catch(e){categories=[];}
  }
  render();
}
init();

/* ================= Gitee 底层函数 ================= */
const GITEE_CFG_KEY="my_notes_gitee_cfg";
function getSyncCfg(){
  const raw=localStorage.getItem(GITEE_CFG_KEY);
  const def={owner:"",token:"",repo:"",filePath:"我的数据库/资料库.json"};
  if(!raw)return def;
  const o=safeParseJSON(raw,{})||{};
  return Object.assign(def,o);
}
function saveSyncCfg(cfg){
  localStorage.setItem(GITEE_CFG_KEY,JSON.stringify({
    owner:cfg.owner||"",token:cfg.token||"",repo:cfg.repo||"",
    filePath:cfg.filePath||"我的数据库/资料库.json"
  }));
}
function encodeGiteePath(p){
  return String(p||"").split("/").map(s=>encodeURIComponent(s)).join("/");
}
async function giteeGet(path){
  const cfg=getSyncCfg();
  const url=`https://gitee.com/api/v5/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodeGiteePath(path)}?access_token=${encodeURIComponent(cfg.token)}`;
  const r=await fetch(url);
  if(!r.ok)throw new Error("GET 失败 "+r.status);
  return await r.json();
}
async function giteePut(path,contentB64,message){
  const cfg=getSyncCfg();
  if(!cfg.owner||!cfg.token||!cfg.repo)throw new Error("Gitee 配置不完整");
  if(!contentB64)throw new Error("内容为空，拒绝上传");

  const api=`https://gitee.com/api/v5/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodeGiteePath(path)}`;

  // 先查是否存在，存在则拿 sha 用 PUT 更新
  let sha=null;
  try{
    const r=await fetch(`${api}?access_token=${encodeURIComponent(cfg.token)}`);
    if(r.ok){
      const info=await r.json();
      sha=info&&info.sha;
    }
  }catch(e){/* 不存在或查询失败，走新建 */}

  const body={access_token:cfg.token,content:contentB64,message:message||"sync"};
  if(sha)body.sha=sha;

  const r=await fetch(api,{
    method:sha?"PUT":"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  if(!r.ok){
    let detail="";
    try{const j=await r.json();detail=j.message||JSON.stringify(j);}catch(e){}
    throw new Error(`PUT 失败 ${r.status}${detail?"："+detail:""}`);
  }
  return await r.json();
}
async function giteeDelete(path,sha,message){
  const cfg=getSyncCfg();
  const url=`https://gitee.com/api/v5/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodeGiteePath(path)}`;
  const r=await fetch(url,{
    method:"DELETE",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({access_token:cfg.token,sha:sha,message:message||"delete"})
  });
  if(!r.ok)throw new Error("DELETE 失败 "+r.status);
  return await r.json();
}
async function giteeListDir(dir){
  const cfg=getSyncCfg();
  const url=`https://gitee.com/api/v5/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodeGiteePath(dir)}?access_token=${encodeURIComponent(cfg.token)}`;
  const r=await fetch(url);
  if(!r.ok)throw new Error("列目录失败 "+r.status);
  const data=await r.json();
  return Array.isArray(data)?data:[];
}
async function getGiteeFileContent(path){
  const info=await giteeGet(path);
  if(!info||!info.content)return {content:null,sha:info&&info.sha,raw:info};
  const text=safeAtob(String(info.content).replace(/\n/g,""));
  return {content:text,sha:info.sha,raw:info};
}
function buildSyncPayload(notes){
  const list=Array.isArray(notes)?notes:[];
  const deduped=dedupeNotesByTitle(list).map(n=>{
    const c=Object.assign({},n);
    delete c.history;
    return c;
  });
  return {notes:deduped,updatedAt:Date.now()};
}
function sanitizeNote(n){
  if(!n||typeof n!=="object")return null;
  const c=Object.assign({},n);
  delete c.history;
  if(!c.title)c.title="未命名";
  if(!c.id)c.id="n_"+Math.random().toString(36).slice(2,10);
  return c;
}
function dedupeNotesByTitle(list){
  const seen=new Set();const out=[];
  (Array.isArray(list)?list:[]).forEach(n=>{
    const key=(n&&n.title||"").trim();
    if(!key){out.push(n);return;}
    if(seen.has(key))return;
    seen.add(key);out.push(n);
  });
  return out;
}

/* ================= Gitee 同步弹窗 ================= */
const giteeSyncBackdrop=document.getElementById("giteeSyncBackdrop");
const gsInfo=document.getElementById("gsInfo");
const gsMsg=document.getElementById("gsMsg");
const gsFileList=document.getElementById("gsFileList");
const gsClose=document.getElementById("gsClose");
const gsSyncBtn=document.getElementById("gsSyncBtn");
const gsUploadBtn=document.getElementById("gsUploadBtn");
const gsDownloadBtn=document.getElementById("gsDownloadBtn");
const gsPickBackdrop=document.getElementById("gsPickBackdrop");
const gpFileName=document.getElementById("gpFileName");
const gpFileSize=document.getElementById("gpFileSize");
const gpDownloadPhone=document.getElementById("gpDownloadPhone");
const gpImportLib=document.getElementById("gpImportLib");
const gpCancel=document.getElementById("gpCancel");
let gsPickFile=null;

function gsSetMsg(t,type){
  gsMsg.textContent=t;
  gsMsg.className="gs-msg"+(type==="ok"?" ok":type==="err"?" err":"");
}
function gsClearMsg(){gsMsg.textContent="";gsMsg.className="gs-msg";}

function openGiteeSync(){
  const cfg=getSyncCfg();
  gsInfo.innerHTML=`<b>账号：</b>${escapeHtml(cfg.owner||"（未配置）")}<br>
    <b>仓库：</b>${escapeHtml(cfg.repo||"（未配置）")}<br>
    <b>主文件：</b>${escapeHtml(cfg.filePath||"我的数据库/资料库.json")}`;
  gsClearMsg();
  gsFileList.style.display="none";
  gsFileList.innerHTML="";
  show(giteeSyncBackdrop);
}
function closeGiteeSync(){hide(giteeSyncBackdrop);}
gsClose.onclick=closeGiteeSync;
giteeSyncBackdrop.onclick=e=>{if(e.target===giteeSyncBackdrop)closeGiteeSync();};

function buildNotesFromCategories(){
  const notes=[];
  categories.forEach(cat=>{
    cat.bookmarks.forEach(b=>{
      notes.push({
        id:"b_"+Math.random().toString(36).slice(2,10),
        title:b.title||b.url||"未命名",
        url:b.url||"",
        category:cat.name||"默认",
        desc:b.desc||"",
        favicon:b.favicon||"",
        updatedAt:Date.now()
      });
    });
  });
  return dedupeNotesByTitle(notes);
}

gsSyncBtn.onclick=async()=>{
  const cfg=getSyncCfg();
  if(!cfg.owner||!cfg.token||!cfg.repo){gsSetMsg("❌ 请先在 ⌘ 命令面板 → Gitee 设置 里配置账号/令牌/仓库","err");return;}
  gsSyncBtn.disabled=true;
  gsSetMsg("⏳ 正在读取远端主文件…");
  try{
    let remote=null;
    try{
      const got=await getGiteeFileContent(cfg.filePath);
      if(got.content){
        const obj=safeParseJSON(got.content,null);
        if(obj&&Array.isArray(obj.notes))remote=obj.notes;
      }
    }catch(e){remote=null;}

    const localNotes=buildNotesFromCategories();

    if(!remote||remote.length===0){
      gsSetMsg("⏳ 远端为空，改为上传…");
      await doUpload(localNotes);
      return;
    }

    const remoteLatest=Math.max(...remote.map(n=>n.updatedAt||0));
    const localLatest=Math.max(...localNotes.map(n=>n.updatedAt||0));
    const remoteNewer=(remoteLatest>localLatest)||(remote.length>=localNotes.length&&remoteLatest>=localLatest);

    if(remoteNewer){
      if(confirm("远端更新且条数≥本地，是否用远端覆盖本地？\n确定=远端覆盖本地，取消=本地覆盖远端")){
        importNotesToCategories(remote);
        gsSetMsg("✅ 已用远端覆盖本地","ok");
      }else{
        if(confirm("再确认一次：本地覆盖远端？")){
          await doUpload(localNotes);
        }else{
          gsSetMsg("已取消");
        }
      }
    }else{
      await doUpload(localNotes);
    }
  }catch(err){
    gsSetMsg("❌ "+err.message,"err");
  }finally{
    gsSyncBtn.disabled=false;
  }
};

async function doUpload(notes){
  const cfg=getSyncCfg();
  gsSetMsg("⏳ 正在上传…");
  const payload=buildSyncPayload(notes);
  const b64=safeBtoa(JSON.stringify(payload,null,2));
  if(!b64){gsSetMsg("❌ 内容编码失败（空内容），未上传","err");return;}
  await giteePut(cfg.filePath,b64,"sync "+new Date().toISOString());
  gsSetMsg("✅ 上传成功","ok");
}

gsUploadBtn.onclick=()=>{
  const cfg=getSyncCfg();
  if(!cfg.owner||!cfg.token||!cfg.repo){gsSetMsg("❌ 请先配置 Gitee 设置","err");return;}
  const input=document.createElement("input");
  input.type="file";input.accept="application/json";
  input.onchange=async()=>{
    const f=input.files[0];if(!f)return;
    const prefix=prompt("输入文件名前缀（如 A厂、资料库）","资料库");
    if(prefix===null||!prefix.trim()){gsSetMsg("已取消上传");return;}
    gsUploadBtn.disabled=true;
    try{
      const text=await f.text();
      const obj=safeParseJSON(text,null);
      if(!obj){gsSetMsg("❌ JSON 解析失败","err");return;}
      const list=Array.isArray(obj)?obj:(Array.isArray(obj.notes)?obj.notes:null);
      if(!list){gsSetMsg("❌ 文件不含 notes 数组","err");return;}

      const dir=cfg.filePath.split("/").slice(0,-1).join("/")||"我的数据库";
      const date=new Date().toISOString().slice(0,10);
      let files=[];
      try{files=await giteeListDir(dir);}catch(e){files=[];}
      const names=files.map(x=>x.name||"");
      let idx=1,fileName;
      do{
        fileName=`${prefix.trim()}-${date}T${idx}.json`;idx++;
      }while(names.includes(fileName));
      const targetPath=(dir?dir+"/":"")+fileName;
      const payload=buildSyncPayload(list.map(sanitizeNote).filter(Boolean));
      const b64=safeBtoa(JSON.stringify(payload,null,2));
      if(!b64){gsSetMsg("❌ 内容编码失败（空内容），未上传","err");return;}
      await giteePut(targetPath,b64,"upload "+fileName);
      gsSetMsg("✅ 已上传 "+fileName,"ok");
    }catch(err){
      gsSetMsg("❌ "+err.message,"err");
    }finally{gsUploadBtn.disabled=false;}
  };
  input.click();
};

gsDownloadBtn.onclick=async()=>{
  const cfg=getSyncCfg();
  if(!cfg.owner||!cfg.token||!cfg.repo){gsSetMsg("❌ 请先配置 Gitee 设置","err");return;}
  gsDownloadBtn.disabled=true;
  gsSetMsg("⏳ 正在列出远端文件…");
  try{
    const dir=cfg.filePath.split("/").slice(0,-1).join("/")||"我的数据库";
    const files=await giteeListDir(dir);
    const jsons=files.filter(f=>/\.json$/i.test(f.name||"")).sort((a,b)=>String(b.name).localeCompare(String(a.name)));
    if(!jsons.length){gsSetMsg("远端没有 .json 文件","err");gsFileList.style.display="none";return;}
    gsFileList.innerHTML="";
    const rows=[];
    jsons.forEach(f=>{
      const row=document.createElement("div");
      row.className="gs-file";
      const nameSpan=document.createElement("span");
      nameSpan.textContent=f.name;
      const sizeSpan=document.createElement("span");
      sizeSpan.className="sz";
      const initialSize=(f.size!=null?f.size:(f.raw&&f.raw.size));
      sizeSpan.textContent=formatSize(initialSize);
      row.appendChild(nameSpan);
      row.appendChild(sizeSpan);
      row.onclick=()=>openPick(f,dir);
      gsFileList.appendChild(row);
      rows.push({f,sizeSpan,dir});
    });
    gsFileList.style.display="block";
    gsSetMsg("✅ 已列出远端文件","ok");

    rows.forEach(async ({f,sizeSpan,dir})=>{
      const known=(f.size!=null?f.size:(f.raw&&f.raw.size));
      if(known!=null && Number(known)>0)return;
      try{
        const path=(dir?dir+"/":"")+f.name;
        const info=await giteeGet(path);
        if(info && info.size!=null){
          f.size=info.size;
          sizeSpan.textContent=formatSize(info.size);
        }
      }catch(e){/* 保留 — */}
    });
  }catch(err){
    gsSetMsg("❌ "+err.message,"err");
  }finally{gsDownloadBtn.disabled=false;}
};

function formatSize(n){
  const num=Number(n);
  if(!isFinite(num)||num<0)return"—";
  if(num<1024)return num+" B";
  if(num<1024*1024)return (num/1024).toFixed(1)+" KB";
  return (num/1024/1024).toFixed(2)+" MB";
}

async function openPick(file,dir){
  gsPickFile={file,dir};
  gpFileName.textContent=file.name;
  let sizeVal=(file.size!=null?file.size:(file.raw&&file.raw.size));
  gpFileSize.textContent=formatSize(sizeVal);
  show(gsPickBackdrop);
  if(sizeVal==null || Number(sizeVal)<=0){
    try{
      const path=(dir?dir+"/":"")+file.name;
      const info=await giteeGet(path);
      if(info && info.size!=null){
        file.size=info.size;
        gpFileSize.textContent=formatSize(info.size);
      }
    }catch(e){/* 保留 — */}
  }
}
gpCancel.onclick=()=>hide(gsPickBackdrop);
gsPickBackdrop.onclick=e=>{if(e.target===gsPickBackdrop)hide(gsPickBackdrop);};

gpDownloadPhone.onclick=async()=>{
  if(!gsPickFile)return;
  try{
    const path=(gsPickFile.dir?gsPickFile.dir+"/":"")+gsPickFile.file.name;
    const got=await getGiteeFileContent(path);
    if(!got.content){alert("文件内容为空");return;}
    const blob=new Blob([got.content],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=gsPickFile.file.name;a.click();
    URL.revokeObjectURL(url);
    hide(gsPickBackdrop);
  }catch(err){alert("下载失败："+err.message);}
};

gpImportLib.onclick=async()=>{
  if(!gsPickFile)return;
  if(!confirm("导入会覆盖本地资料库，确定？"))return;
  try{
    const path=(gsPickFile.dir?gsPickFile.dir+"/":"")+gsPickFile.file.name;
    const got=await getGiteeFileContent(path);
    const obj=safeParseJSON(got.content,null);
    const list=Array.isArray(obj)?obj:(obj&&Array.isArray(obj.notes)?obj.notes:null);
    if(!list){alert("文件格式不正确");return;}
    importNotesToCategories(list);
    hide(gsPickBackdrop);
    hide(giteeSyncBackdrop);
  }catch(err){alert("导入失败："+err.message);}
};

function importNotesToCategories(notes){
  const clean=dedupeNotesByTitle(notes.map(sanitizeNote).filter(Boolean));
  const map={};
  clean.forEach(n=>{
    const cat=n.category||"默认";
    if(!map[cat])map[cat]={name:cat,bookmarks:[]};
    map[cat].bookmarks.push({
      title:n.title||n.url||"未命名",
      url:n.url||"",
      favicon:n.favicon||favicon(n.url||""),
      desc:n.desc||""
    });
  });
  categories=Object.values(map);
  save();render();
  alert("已导入资料库");
}

/* ================= ⌘ 命令面板 ================= */
const cmdBackdrop=document.getElementById("cmdBackdrop");
const cmdList=document.getElementById("cmdList");
let cmdIndex=0;
const CMD_ITEMS=[
  {id:"gitee",label:"⚙️ Gitee 设置",desc:"配置仓库 · 导入 · 导出",run:()=>openGiteeSet()},
  {id:"import",label:"📥 导入 JSON",desc:"从文件合并到资料库",run:()=>importJSON()},
  {id:"export",label:"📤 导出 JSON",desc:"导出到本地文件",run:()=>exportJSON()},
  {id:"clear",label:"⚠️ 清空数据",desc:"删除全部资料（不可恢复）",run:()=>openClearData(),danger:true}
];

function openCmd(){
  cmdIndex=0;
  renderCmd("");
  show(cmdBackdrop);
  cmdBackdrop.style.display="flex";
  setTimeout(()=>{const el=cmdList.querySelector(".cmd-item.sel");if(el)el.focus();},50);
}
function closeCmd(){cmdBackdrop.style.display="none";}
function renderCmd(q){
  cmdList.innerHTML="";
  const ql=String(q||"").toLowerCase();
  const list=CMD_ITEMS.filter(it=>!ql||it.label.toLowerCase().includes(ql)||it.desc.toLowerCase().includes(ql));
  if(!list.length){cmdList.innerHTML='<div class="cmd-empty">无匹配</div>';return;}
  list.forEach((it,i)=>{
    const d=document.createElement("div");
    d.className="cmd-item"+(it.danger?" danger":"")+(i===cmdIndex?" sel":"");
    d.innerHTML=`<span class="cmd-label">${escapeHtml(it.label)}</span><span class="cmd-desc">${escapeHtml(it.desc)}</span>`;
    d.onclick=()=>{closeCmd();setTimeout(()=>it.run(),50);};
    cmdList.appendChild(d);
  });
}
document.getElementById("openCmdBtn").onclick=openCmd;
cmdBackdrop.onclick=e=>{if(e.target===cmdBackdrop)closeCmd();};
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();cmdBackdrop.style.display==="flex"?closeCmd():openCmd();return;}
  if(cmdBackdrop.style.display!=="flex")return;
  const items=[...cmdList.querySelectorAll(".cmd-item")];
  if(!items.length)return;
  if(e.key==="ArrowDown"){e.preventDefault();cmdIndex=(cmdIndex+1)%items.length;items.forEach((x,i)=>x.classList.toggle("sel",i===cmdIndex));}
  else if(e.key==="ArrowUp"){e.preventDefault();cmdIndex=(cmdIndex-1+items.length)%items.length;items.forEach((x,i)=>x.classList.toggle("sel",i===cmdIndex));}
  else if(e.key==="Enter"){e.preventDefault();const it=CMD_ITEMS[cmdIndex];if(it){closeCmd();setTimeout(()=>it.run(),50);}}
  else if(e.key==="Escape"){closeCmd();}
});

function exportJSON(){
  const notes=buildNotesFromCategories();
  const payload=buildSyncPayload(notes);
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download="notes_"+new Date().toISOString().slice(0,10)+".json";a.click();
  URL.revokeObjectURL(url);
}
function importJSON(){
  const input=document.createElement("input");
  input.type="file";input.accept="application/json";
  input.onchange=async()=>{
    const f=input.files[0];if(!f)return;
    try{
      const text=await f.text();
      const obj=safeParseJSON(text,null);
      if(!obj)throw new Error("JSON 解析失败");
      const list=Array.isArray(obj)?obj:(Array.isArray(obj.notes)?obj.notes:null);
      if(!list)throw new Error("格式不正确");
      const clean=dedupeNotesByTitle(list.map(sanitizeNote).filter(Boolean));
      const map={};
      categories.forEach(c=>{map[c.name]=c;});
      clean.forEach(n=>{
        const cat=n.category||"默认";
        if(!map[cat])map[cat]={name:cat,bookmarks:[]};
        const exists=map[cat].bookmarks.some(b=>b.title===n.title);
        if(!exists)map[cat].bookmarks.push({
          title:n.title||n.url||"未命名",url:n.url||"",
          favicon:n.favicon||favicon(n.url||""),desc:n.desc||""
        });
      });
      categories=Object.values(map);
      save();render();
      alert("导入成功");
    }catch(err){alert("导入失败："+err.message);}
  };
  input.click();
}
function openClearData(){
  const v=prompt("输入「清空」以确认删除全部资料");
  if(v!=="清空")return;
  if(!confirm("再次确认：删除全部资料？分类和 Gitee 设置会保留。"))return;
  categories=[];save();render();
  alert("已清空");
}

/* ================= Gitee 设置弹窗 ================= */
const giteeSetBackdrop=document.getElementById("giteeSetBackdrop");
const setOwner=document.getElementById("setOwner");
const setToken=document.getElementById("setToken");
const setRepo=document.getElementById("setRepo");
const setFilePath=document.getElementById("setFilePath");
const unlockGiteeSet=document.getElementById("unlockGiteeSet");
const lockOverlay=document.getElementById("lockOverlay");
const saveGiteeSetBtn=document.getElementById("saveGiteeSet");
const toggleTokenEye=document.getElementById("toggleTokenEye");
const gsetClose=document.getElementById("gsetClose");
let isLocked=true;
let lockTimer=null;

function openGiteeSet(){
  const cfg=getSyncCfg();
  setOwner.value=cfg.owner||"";
  setToken.value=cfg.token||"";
  setRepo.value=cfg.repo||"";
  setFilePath.value=cfg.filePath||"我的数据库/资料库.json";
  isLocked=true;
  setLocked(true);
  show(giteeSetBackdrop);
  giteeSetBackdrop.style.display="flex";
}
function setLocked(locked){
  isLocked=locked;
  [setOwner,setToken,setRepo,setFilePath].forEach(el=>el.disabled=locked);
  saveGiteeSetBtn.disabled=locked;
  unlockGiteeSet.disabled=!locked;
  lockOverlay.classList.toggle('show',locked);
  if(locked){unlockGiteeSet.textContent="● 开启";clearTimeout(lockTimer);}
  else{unlockGiteeSet.textContent="🔓 已解锁";resetLockTimer();}
}
function resetLockTimer(){
  clearTimeout(lockTimer);
  lockTimer=setTimeout(()=>{if(!isLocked)setLocked(true);},10000);
}
unlockGiteeSet.onclick=()=>{
  if(isLocked){setLocked(false);setOwner.focus();}
  else setLocked(true);
};
[setOwner,setToken,setRepo,setFilePath].forEach(el=>el.addEventListener("input",resetLockTimer));
toggleTokenEye.onclick=()=>{
  if(setToken.type==="password"){setToken.type="text";toggleTokenEye.textContent="🙈 隐藏令牌";}
  else{setToken.type="password";toggleTokenEye.textContent="👁 显示令牌";}
};
saveGiteeSetBtn.onclick=()=>{
  saveSyncCfg({owner:setOwner.value.trim(),token:setToken.value.trim(),repo:setRepo.value.trim(),filePath:setFilePath.value.trim()||"我的数据库/资料库.json"});
  alert("已保存");
  setLocked(true);
};
gsetClose.onclick=()=>hide(giteeSetBackdrop);
giteeSetBackdrop.onclick=e=>{if(e.target===giteeSetBackdrop)hide(giteeSetBackdrop);};

document.getElementById("openGiteeSyncBtn").onclick=openGiteeSync;
document.getElementById("refreshBtn").onclick=()=>location.reload();

})();
