const CACHE='fairy-high-v8';
const ASSETS=['./','./index.html','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key.startsWith('fairy-high-')&&key!==CACHE).map(key=>caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  const scopePath=new URL(self.registration.scope).pathname;

  if(url.origin!==self.location.origin || url.pathname.startsWith(scopePath+'pixel-racers/')) return;

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
        return response;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }))
  );
});