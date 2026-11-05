"use strict";
const VERSION="myfoodworld-iphone-1.6.0-v1";
const SHELL=['./','./index.html','./app.js','./recipes.js','./recipe-additions.js','./food-tools.js','./product-tools.js','./expiry-tools.js','./kitchen-core.js','./barcode-tools.js','./daily-ui.js','./improvements.js','./recipe-tools.js','./nutrition.js','./ocr-tools.js','./brand.css','./features.css','./pwa.css','./pwa.js','./manifest.webmanifest','./apple-touch-icon.png','./icon-192.png','./icon-512.png','./brand-icon-light.webp','./brand-icon-dark.webp','./brand-logo.webp','./brand-wordmark.webp','./brand-spesa.webp','./brand-dispensa.webp','./brand-ricette.webp','./brand-nutrizione.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL.map(p=>new Request(new URL(p,self.registration.scope),{cache:'reload'}))))));
self.addEventListener('message',event=>{if(event.data&&event.data.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting())});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(key=>(key.startsWith('myfoodworld-iphone-')||key.startsWith('cucina-offline-'))&&key!==VERSION).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);
 if(url.origin==='https://images.openfoodfacts.org'){
  event.respondWith((async()=>{const cache=await caches.open('myfoodworld-product-images-v1'),saved=await cache.match(request);if(saved)return saved;const response=await fetch(request);if(response.ok||response.type==='opaque'){await cache.put(request,response.clone());const keys=await cache.keys();if(keys.length>80)await cache.delete(keys[0]);}return response;})());return;
 }
 if(url.origin!==self.location.origin)return;
 if(!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(VERSION);
  if(request.mode==='navigate'&&(url.pathname===new URL('./',self.registration.scope).pathname||url.pathname===new URL('./index.html',self.registration.scope).pathname)){const cached=await cache.match(new URL('./index.html',self.registration.scope));if(cached)return cached;}
  const known=await cache.match(request,{ignoreSearch:true});if(known)return known;
  return fetch(request);
 })());
});

