const CACHE_NAME = 'mini-desktop-shell-v4';
const SHELL = ['./', './index.html', './manifest.json'];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async()=> {
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(SHELL.map(async p=>{
      try { const r=await fetch(new Request(new URL(p,self.registration.scope).href,{cache:'reload'})); if(r.ok) await cache.put(p,r); } catch(_){}
    }));
  })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('mini-desktop-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin!==location.origin)return;
  // Never cache configuration: each read should reach the published repository.
  if(u.pathname.endsWith('/configuration.json')||u.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(new Request(req,{cache:'no-store'})).catch(()=>new Response('配置暂时无法连接',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-store'}})));
    return;
  }
  if(req.mode==='navigate') {
    event.respondWith((async()=>{try{return await fetch(new Request(req,{cache:'no-store'}));}catch(_){return (await caches.match(req,{ignoreSearch:true}))||(await caches.match('./index.html'))||new Response('离线且没有缓存桌面页面',{status:503});}})());
  }
});
