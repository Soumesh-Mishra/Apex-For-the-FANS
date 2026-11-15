// Only the generic offline page is cached. Race feeds, account pages and
// private-hosting responses always use the network; no stale scores are served.
const CACHE='apex-offline-v1';
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.add(new Request('/offline',{cache:'reload'}))));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('apex-offline-')&&key!==CACHE).map(key=>caches.delete(key)))));
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||event.request.mode!=='navigate'||url.pathname.startsWith('/api/')||['/login','/privacy'].includes(url.pathname))return;
 event.respondWith(fetch(event.request).catch(async()=>await caches.match('/offline')||new Response('APEX needs an internet connection.',{status:503,headers:{'Content-Type':'text/plain'}})));
});
