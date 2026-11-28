const C='farfari-v28',F='farfari-fonts-v1';
const GF='https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;800&display=swap';

// کش کردن فونت: هم فایل محلی (اگر کنار index.html باشد) و هم فونت گوگل
async function cacheFonts(){
  const fc=await caches.open(F);
  try{
    const r=await fetch(GF,{mode:'cors'});
    if(r.ok){
      const css=await r.clone().text();
      await fc.put(GF,r);
      const urls=[...new Set((css.match(/https:\/\/fonts\.gstatic\.com[^)'"\s]+/g)||[]))];
      await Promise.all(urls.map(u=>fetch(u,{mode:'cors'}).then(x=>x.ok&&fc.put(u,x)).catch(()=>{})));
    }
  }catch(e){}
}

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(C);
    await Promise.all(['./','index.html','manifest.webmanifest','icon.png','icon-180.png','icon-192.png','icon-maskable.png'].map(u=>c.add(u)));
    await c.add('Vazirmatn.woff2').catch(()=>{});   // اگر فایل فونت کنار برنامه باشد
  })());
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==F).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  // فونت‌های گوگل: اول کش، بعد شبکه
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(F).then(fc=>fc.match(r.url).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==='opaque')fc.put(r.url,res.clone());return res}))));
    return;
  }
  if(u.origin!==location.origin)return;
  // فایل‌های خود برنامه: اول کش (فوری باز می‌شود، حتی با اینترنت ضعیف یا فیلتر)، و هم‌زمان در پس‌زمینه نسخهٔ جدید گرفته می‌شود
  const nav=r.mode==='navigate';
  const fresh=nav||/(\.html|\.webmanifest|\.js)$|\/$/.test(u.pathname);
  const key=nav?new Request('index.html'):r;
  e.respondWith((async()=>{
    const c=await caches.open(C);
    const hit=await c.match(key,{ignoreSearch:true});
    const net=fetch(fresh?new Request(u.href,{cache:'no-store'}):r).then(res=>{if(res.ok)c.put(key,res.clone());return res});
    if(hit){e.waitUntil(net.catch(()=>{}));return hit}
    return net.catch(()=>caches.match(r).then(m=>m||caches.match('index.html')||Response.error()));
  })());
});

// با زدن روی اعلان، برنامه باز یا جلو آورده می‌شود
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    for(const c of cs){if('focus' in c)return c.focus()}
    return self.clients.openWindow('./');
  }));
});
