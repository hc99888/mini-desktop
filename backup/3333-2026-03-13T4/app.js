
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js");
}



(function(){
const STORAGE_KEY="catBookmarks_v4";
let categories=[];
let editingCatIndex=null;
let editingBookmark={catIndex:null,bookmarkIndex:null};

const container=document.getElementById("categoriesContainer");
const addBookmarkBtn=document.getElementById("addBookmarkBtn");
const exportBtn=document.getElementById("exportBtn");
const importBtn=document.getElementById("importBtn");
const importFile=document.getElementById("importFile");
const clearBtn=document.getElementById("clearBtn");

const modalBackdrop=document.getElementById("modalBackdrop");
const modalTitle=document.getElementById("modalTitle");
const inputCategory=document.getElementById("inputCategory");
const inputTitle=document.getElementById("inputTitle");
const inputUrl=document.getElementById("inputUrl");
const cancelModal=document.getElementById("cancelModal");
const okModal=document.getElementById("okModal");

const catModalBackdrop=document.getElementById("categoryModalBackdrop");
const inputCategoryName=document.getElementById("inputCategoryName");
const cancelCategoryModal=document.getElementById("cancelCategoryModal");
const okCategoryModal=document.getElementById("okCategoryModal");

const dropdownBtn=document.getElementById("categoryDropdownBtn");
const dropdownMenu=document.getElementById("categoryDropdownMenu");

function escapeHtml(t){
  return t.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
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
      if(b.url)window.open(b.url,"_blank");
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
  editingBookmark={catIndex:null,bookmarkIndex:null};
  show(modalBackdrop);
}

function openEditBookmark(ci,bi){
  modalTitle.textContent="编辑书签";
  const b=categories[ci].bookmarks[bi];
  inputCategory.value=categories[ci].name;
  inputTitle.value=b.title||"";
  inputUrl.value=b.url||"";
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

  if(!url){
    alert("网址不能为空");
    return;
  }

  if(!cat)cat="默认";

  const u=normalizeUrl(url);
  const data={title:title||u,url:u,favicon:favicon(u)};

  let ci=categories.findIndex(c=>c.name===cat);
  if(ci===-1){
    categories.push({name:cat,bookmarks:[]});
    ci=categories.length-1;
  }

  if(editingBookmark.bookmarkIndex!=null){
    const old=editingBookmark;
    if(old.catIndex===ci){
      categories[ci].bookmarks[old.bookmarkIndex]=data;
    }else{
      categories[old.catIndex].bookmarks.splice(old.bookmarkIndex,1);
      categories[ci].bookmarks.push(data);
    }
  }else{
    categories[ci].bookmarks.push(data);
  }

  save();render();hide(modalBackdrop);
};

cancelModal.onclick=()=>hide(modalBackdrop);
modalBackdrop.onclick=e=>{if(e.target===modalBackdrop)hide(modalBackdrop);};

okCategoryModal.onclick=()=>{
  const name=inputCategoryName.value.trim();
  if(!name){
    alert("分类名称不能为空");
    return;
  }
  if(editingCatIndex!=null){
    categories[editingCatIndex].name=name;
    editingCatIndex=null;
  }
  save();render();hide(catModalBackdrop);
};

cancelCategoryModal.onclick=()=>hide(catModalBackdrop);
catModalBackdrop.onclick=e=>{if(e.target===catModalBackdrop)hide(catModalBackdrop);};

addBookmarkBtn.onclick=openAddBookmark;

exportBtn.onclick=()=>{
  const blob=new Blob([JSON.stringify(categories,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="bookmarks.json";
  a.click();
  URL.revokeObjectURL(url);
};

importBtn.onclick = () => importFile.click();

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
      categories = data;
      save();
      render();
      alert("导入成功");
    } catch (err) {
      alert("导入失败：JSON 解析错误");
    }
  };
  r.readAsText(f, "utf-8");
};

clearBtn.onclick = () => {
  if (confirm("确定清空全部分类和书签吗？")) {
    categories = [];
    save();
    render();
  }
};

// 点击空白处隐藏 tile 操作按钮
document.addEventListener("click", e => {
  if (!e.target.closest(".tile")) {
    document.querySelectorAll(".tile.show-actions")
      .forEach(t => t.classList.remove("show-actions"));
  }
});

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
    } catch (e) {
      categories = [];
    }
  }
  render();
}

init();
})();
