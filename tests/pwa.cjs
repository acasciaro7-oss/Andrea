const {webkit}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
const root=fs.existsSync(path.join(base,'dist'))?path.join(base,'dist'):base;
let legacy=true;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith('/Andrea/')){res.writeHead(404);return res.end()}
 let name=decodeURIComponent(url.pathname.slice('/Andrea/'.length))||'index.html';
 if(name.includes('..')){res.writeHead(400);return res.end()}
 let file=path.join(root,name);
 const old=path.join(__dirname,'legacy',name);if(legacy&&fs.existsSync(old))file=old;
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
 const type=name.endsWith('.js')?'application/javascript':name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':name.endsWith('.webmanifest')?'application/manifest+json':name.endsWith('.webp')?'image/webp':'image/png';
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/Andrea/';
 const browser=await webkit.launch({headless:true});const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'it-IT',isMobile:true,hasTouch:true,acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.evaluate(()=>navigator.serviceWorker.ready);
  const seed={items:[{id:'legacy-pasta',name:'Pasta',qty:2,unit:'confezioni',loc:'Dispensa',exp:''}],shop:[{id:'legacy-shop',name:'Uova',done:false}],people:3,meal:'Cena'};
  await page.evaluate(async seed=>{localStorage.setItem('la-mia-cucina-v1',JSON.stringify(seed));const c=await caches.open('unrelated-fixture');await c.put('./preserve-test',new Response('keep'));},seed);
  await page.reload();assert.match(await page.locator('.brandbar').textContent(),/La mia cucina/);
  await page.close();legacy=false;
  const app=await context.newPage();app.on('pageerror',e=>errors.push(e.message));await app.goto(url);
  await app.waitForFunction(()=>document.title==='MyFoodWorld');
  await app.waitForSelector('#appUpdate button',{timeout:60000});
  await Promise.all([app.waitForNavigation({waitUntil:'load'}),app.locator('#appUpdate button').click()]);
  console.log('Update state:',await app.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {url:location.href,controller:navigator.serviceWorker.controller&&navigator.serviceWorker.controller.state,active:r&&r.active&&r.active.state,waiting:r&&r.waiting&&r.waiting.state,caches:await caches.keys()}}));
  await app.waitForFunction(()=>typeof RECIPE_CATALOG!=='undefined'&&RECIPE_CATALOG.length===1000);
  await app.waitForFunction(async()=>!(await caches.keys()).includes('cucina-offline-v3-free-ocr'));
  assert.deepEqual(await app.evaluate(()=>JSON.parse(localStorage.getItem('la-mia-cucina-v1'))),seed);
  const manifest=await app.evaluate(()=>fetch('./manifest.webmanifest').then(r=>r.json()));
  assert.equal(manifest.id,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.name,'MyFoodWorld');
  const keys=await app.evaluate(()=>caches.keys());assert(keys.includes('unrelated-fixture'));assert(keys.includes('myfoodworld-iphone-1.4.0-v1'));
  assert(!keys.includes('cucina-offline-v3-free-ocr'));
  const tab=async name=>app.locator('nav.bottom [data-a="tab"][data-v="'+name+'"]').click();
  await tab('recipes');assert.match(await app.locator('#recipeCount').textContent(),/1000/);assert.equal(await app.locator('.recipe').count(),30);
  await app.locator('#recipeSearch').fill('ceci');assert.equal(await app.evaluate(()=>recipeList().every(r=>norm(r[0]+' '+r[3].join(' ')).includes('ceci'))),true);
  await tab('nutrition');await app.locator('[data-a="diaryNew"]').click();
  await app.locator('#diaryName').fill('Pasto di prova');await app.locator('#diaryAmount').fill('150');await app.locator('#diaryNkcal').fill('200');
  await app.locator('[data-a="diarySave"]').click();assert.equal(await app.evaluate(()=>db.diary.length),1);
  assert.equal(await app.evaluate(()=>Food.portion(db.diary[0].nutrition,150,'g').kcal),300);
  assert.equal(await app.evaluate(()=>Food.portion(db.diary[0].nutrition,150,'g').protein),null);
  // Test Safari-compatible file sharing without transmitting the backup.
  await app.evaluate(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__sharedName=data.files[0].name;window.__sharedBackup=JSON.parse(await data.files[0].text())}})});
  await tab('home');await app.locator('[data-a="settings"]').click();await app.locator('[data-a="export"]').click();
  assert.equal(await app.evaluate(()=>window.__sharedName),'myfoodworld-backup.json');assert.equal(await app.evaluate(()=>window.__sharedBackup.diary.length),1);
  assert.deepEqual(await app.evaluate(()=>window.__sharedBackup.items),seed.items);
  await app.locator('[data-a="close"]').click();
  const ocrText=await app.evaluate(async()=>{
   const worker=await getLocalOcrWorker();await worker.setParameters({tessedit_pageseg_mode:'6'});
   const c=document.createElement('canvas');c.width=1000;c.height=450;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#000';x.font='48px Arial';
   ['RAVIOLI ALLA ZUCCA','PESO NETTO 500 g','SCADENZA 10/12/2027'].forEach((t,i)=>x.fillText(t,40,90+i*100));
   return (await worker.recognize(c)).data.text;
  },null,{timeout:150000});
  assert.match(ocrText.toUpperCase(),/RAVIOLI/);assert.match(ocrText.toUpperCase(),/ZUCCA/);
  assert.equal(await app.evaluate(text=>parsePhotoProduct(text).length,ocrText),1);
  console.log('PASS: actual browser OCR on a synthetic Italian label:',JSON.stringify(ocrText));
  await context.setOffline(true);await app.reload();
  assert.equal(await app.title(),'MyFoodWorld');assert.equal(await app.evaluate(()=>db.diary.length),1);
  await tab('recipes');assert.equal(await app.evaluate(()=>RECIPE_CATALOG.length),1000);
  await app.locator('#recipeSearch').fill('zucca');assert((await app.locator('.recipe').count())>0);
  await tab('items');assert.match(await app.locator('.card.item').textContent(),/Pasta/);
  assert.equal(await app.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.setOffline(false);
  const output=path.join(base,'qa');fs.mkdirSync(output,{recursive:true});await app.screenshot({path:path.join(output,'iphone-dispensa.png')});await tab('nutrition');await app.screenshot({path:path.join(output,'iphone-nutrizione.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: WebKit mobile upgrade from legacy PWA, same identity/storage, cache isolation, 1000 recipes, nutrition diary, backup share and offline reload.');
 }catch(error){const p=browser.contexts().flatMap(c=>c.pages()).at(-1);if(p){try{console.log('Failure state:',await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {url:location.href,title:document.title,controller:navigator.serviceWorker.controller&&navigator.serviceWorker.controller.state,active:r&&r.active&&r.active.state,waiting:r&&r.waiting&&r.waiting.state,caches:await caches.keys(),body:document.body.innerText.slice(0,1200)}}));const dir=path.join(base,'qa');fs.mkdirSync(dir,{recursive:true});await p.screenshot({path:path.join(dir,'failure.png')})}catch(e){}}throw error}finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
