const VERSION="cucina-offline-v1";
const ASSETS=["./","./index.html","./app.js","./manifest.webmanifest","./apple-touch-icon.png","./icon-192.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==self.location.origin)return;e.respondWith((async()=>{const c=await caches.open(VERSION);try{const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res;}catch(err){return (await c.match(r)) || (r.mode==="navigate"?await c.match("./index.html"):Response.error());}})());});
