'use strict';
/* MyFoodWorld – dati salvati solo nello spazio privato dell'app Android.
 * Preserve KEY, applicationId and asset origin across the rename. */
const KEY='la-mia-cucina-v1';
const DEFAULT={items:[],shop:[],people:2,meal:'Cena',diary:[],favorites:[],plan:[],testConsent:false,testStats:{},ocrAliases:{}};
function normalizeDb(data){
 const next={...structuredClone(DEFAULT),...data};
 next.diary=Array.isArray(next.diary)?next.diary:[];
 next.favorites=Array.isArray(next.favorites)?next.favorites.filter(x=>typeof x==='string'):[];
 next.plan=Array.isArray(next.plan)?next.plan:[];
 next.testConsent=next.testConsent===true;
 next.testStats=next.testStats&&typeof next.testStats==='object'&&!Array.isArray(next.testStats)?next.testStats:{};
 next.testStats.days=Array.isArray(next.testStats.days)?next.testStats.days.filter(d=>typeof d==='string'&&d&&Kitchen.validDate(d)):[];
 next.ocrAliases=next.ocrAliases&&typeof next.ocrAliases==='object'&&!Array.isArray(next.ocrAliases)?next.ocrAliases:{};
 for(const group of ['items','shop','diary','plan'])next[group]=next[group].map((p,i)=>({...p,id:p.id||'legacy-'+group+'-'+i}));
 return next;
}
let db,storageProblem='';
try{
 const raw=localStorage.getItem(KEY),saved=raw?Kitchen.validate(JSON.parse(raw)):null;
 db=saved?normalizeDb(saved):structuredClone(DEFAULT);
}catch(e){db=structuredClone(DEFAULT);storageProblem='I dati salvati non sono leggibili. Conserva una copia e importa un backup valido.';}
let page='home',category='Tutti',query='',recQuery='',expiryWindow=0,review=[],scanType='prodotto',modal='',timer;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[x]));
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const id=()=>String(Date.now())+Math.random().toString(36).slice(2);
const today=()=>Food.localDate();
function save(){
 let before=null;
 try{
  before=localStorage.getItem(KEY);
  Kitchen.validate(db);
  if(storageProblem&&before){throw Error('Prima conserva i dati illeggibili dalle impostazioni o importa un backup valido');}
  const next=JSON.stringify(db);
  if(before&&before!==next){localStorage.setItem(KEY+'-previous',before);lastUndo=before;}
  localStorage.setItem(KEY,next);render();return true;
 }catch(error){
  if(before)try{db=normalizeDb(Kitchen.validate(JSON.parse(before)))}catch(ignored){}
  render();toast('Modifica non salvata: '+error.message);return false;
 }
}
function toast(s){let old=$('.toast');if(old)old.remove();let e=document.createElement('div');e.className='toast';e.textContent=s;document.body.append(e);clearTimeout(timer);timer=setTimeout(()=>e.remove(),2800)}
const recipeData=RECIPE_CATALOG.map(r=>[r.name,r.icon,r.minutes+' min',r.ingredients.map(i=>i.name),r.steps,r]);
const units=['pz','g','kg','ml','L','confezioni','bottiglie'];
const locations=['Frigo','Dispensa','Freezer'];
function have(ingredient){return Food.available(ingredient,db.items)}
function matched(r){return r[3].filter(x=>have(x)).length}
function daysLeft(date){return Food.days(date)}
function countExp(){return db.items.filter(p=>{let n=daysLeft(p.exp);return Number(p.qty)>0&&n!==null&&n<=3}).length}
function emojiFor(name){let s=norm(name);return /pasta|spaghett|penne|riso/.test(s)?'🍝':/uova/.test(s)?'🥚':/latte|yogurt|formaggio|mozzarella|ricotta/.test(s)?'🧀':/carne|pollo|prosciutto/.test(s)?'🍗':/frutta|mela|banana/.test(s)?'🍎':/verdura|zucchin|pomodor|carot/.test(s)?'🥦':/pesce|tonno|salmone/.test(s)?'🐟':'🥫'}
function nav(){
  return '<nav class="bottom" aria-label="Navigazione principale">'+[['home',null,'Oggi'],['items','dispensa','Dispensa'],['recipes','ricette','Ricette'],['shop','spesa','Spesa'],['nutrition','nutrizione','Nutrizione']].map(x=>'<button data-a="tab" data-v="'+x[0]+'" '+(page===x[0]?'aria-current="page" ':'')+'class="'+(page===x[0]?'active':'')+'">'+(x[1]?'<img class="nav-icon" src="brand-'+x[1]+'.webp" alt="" width="30" height="28">':'<span aria-hidden="true">⌂</span>')+x[2]+'</button>').join('')+'</nav>';
}
function banner(name,sub){return '<header class="simple"><h1>'+name+'</h1><p>'+sub+'</p></header>'}
function home(){
  const sorted=sortedRecipes(recipeData);
  return '<header class="hero"><div class="brandbar"><img class="brandicon" src="brand-icon-light.webp" alt="" width="60" height="60"><div class="brand-name"><img class="wordmark" src="brand-wordmark.webp" alt="MyFoodWorld" width="724" height="108"><small>Your food. Your world.</small></div><button class="settings" data-a="settings" aria-label="Impostazioni">⚙</button></div><div class="welcome"><span class="eyebrow">Il tuo mondo alimentare</span><h1>Cosa cucini oggi?</h1><p>Organizza frigo, freezer e dispensa. Trova idee con quello che hai già.</p></div></header>'+
  '<div class="summary"><div class="metric"><i>🥫</i><b>'+db.items.filter(p=>Number(p.qty)>0).length+'</b><small>Prodotti</small></div><div class="metric"><i>⏳</i><b>'+countExp()+'</b><small>In scadenza</small></div><div class="metric"><i>🛍️</i><b>'+db.shop.filter(x=>!x.done).length+'</b><small>Da comprare</small></div></div>'+
  '<section class="section"><h2>Aggiungi la spesa</h2><div class="photo"><div class="emoji">📸</div><div><h3>Una foto e via!</h3><p>Fotografa uno scontrino o un prodotto per aggiungerlo alle scorte.</p><button class="btn small" data-a="scanMenu">📸 Scatta o carica una foto</button></div></div></section>'+
  '<section class="section"><div class="actions"><button class="tile" data-a="new"><img class="category-icon" src="brand-dispensa.webp" alt="" width="40" height="36"><b>Nuovo prodotto</b><small>Inserimento manuale</small></button><button class="tile" data-a="tab" data-v="shop"><img class="category-icon" src="brand-spesa.webp" alt="" width="40" height="36"><b>Lista della spesa</b><small>Non dimenticare nulla</small></button></div></section>'+
  '<section class="section"><h2>Cosa cucino oggi?</h2><div class="grid2" style="margin-bottom:13px"><button class="btn '+(db.meal==='Pranzo'?'':'alt')+'" data-a="meal" data-v="Pranzo">Pranzo</button><button class="btn '+(db.meal==='Cena'?'':'alt')+'" data-a="meal" data-v="Cena">Cena</button></div>'+sorted.slice(0,3).map(recipeCard).join('')+'<button class="btn white full" data-a="tab" data-v="recipes">Esplora le '+recipeData.length+' ricette</button></section>';
}
function itemCard(p){
  let n=daysLeft(p.exp);let expiration=n===null?'':n<0?'Scaduto':n===0?'Scade oggi':n<4?'Scade tra '+n+' giorni':'Scade il '+p.exp;
  return '<div class="card item"><div class="symbol">'+emojiFor(p.name)+'</div><div class="item-info" data-a="edit" data-v="'+esc(p.id)+'"><strong>'+esc(p.name)+'</strong><small>'+esc(p.loc||'Dispensa')+(expiration?' · '+esc(expiration):'')+'</small></div><button class="qbtn" data-a="minus" data-v="'+esc(p.id)+'">−</button><strong style="font-size:12px">'+Number(p.qty||0)+' '+esc(p.unit||'pz')+'</strong><button class="qbtn" data-a="plus" data-v="'+esc(p.id)+'">+</button></div>';
}
function inventory(){
 const items=db.items.filter(p=>Number(p.qty)>0&&(category==='Tutti'||p.loc===category)&&norm(p.name).includes(norm(query))&&(!expiryWindow||Food.days(p.exp)!==null&&Food.days(p.exp)<=expiryWindow)).sort((a,b)=>a.name.localeCompare(b.name));
 return banner('La mia dispensa','Frigo, freezer e prodotti di casa')+
 '<section class="section"><button class="btn full" data-a="new">➕ Aggiungi un prodotto</button><div style="height:15px"></div><input class="field" id="inventorySearch" placeholder="Cerca tra i tuoi alimenti" value="'+esc(query)+'"><div style="height:12px"></div><div class="filter">'+['Tutti'].concat(locations).map(x=>'<button data-a="filter" data-v="'+x+'" class="'+(category===x?'on':'')+'">'+x+'</button>').join('')+'</div>'+
 '<div class="filter" aria-label="Scadenze">'+[[0,'Tutte le scadenze'],[3,'Entro 3 giorni'],[7,'Entro 7 giorni']].map(x=>'<button data-a="expiryFilter" data-v="'+x[0]+'" class="'+(expiryWindow===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div>'+(items.length?items.map(itemCard).join(''):'<div class="empty"><span>🧺</span><b>Nessun prodotto qui</b><p>Inizia con una foto o con l’inserimento manuale.</p></div>')+'</section>';
}
function recipeCard(r){
 let n=matched(r),tot=r[3].length;
 return '<div class="card recipe" data-a="detail" data-v="'+esc(r[0])+'"><div class="symbol">'+r[1]+'</div><div class="body"><b>'+esc(r[0])+'</b><small>⏱ '+r[2]+' · '+(n===tot?'Tutti gli ingredienti disponibili':n+'/'+tot+' ingredienti disponibili')+'</small><span class="pill '+(n===tot?'':'warn')+'">'+(n===tot?'Ingredienti presenti':'Mancano '+(tot-n)+' ingredienti')+'</span></div><span>›</span></div>';
}
function recipes(){
 const list=recipeList();
 return banner('Ricette',recipeData.length+' ricette e varianti casalinghe, disponibili offline')+'<section class="section"><label class="label">Per quante persone?</label><div class="row" style="margin-bottom:12px"><button class="btn white" data-a="people" data-v="-1" aria-label="Una persona in meno">−</button><strong>'+db.people+' persone</strong><button class="btn white" data-a="people" data-v="1" aria-label="Una persona in più">+</button></div>'+recipeControls()+'<p class="notice">Le dosi tengono conto delle porzioni e delle scorte con peso noto. Se manca il peso della confezione compare «Quantità da verificare». Controlla sempre condimenti, allergeni e tracce sull’etichetta.</p><p class="muted" id="recipeCount">'+list.length+' risultati</p>'+list.slice(0,recipeLimit).map(recipeCard).join('')+(list.length>recipeLimit?'<button class="btn white full" data-a="recipesMore">Mostra altre 30 ricette</button>':'')+(!list.length?'<div class="empty"><b>Nessuna ricetta con questi filtri</b><button class="btn small white" data-a="recipeReset">Azzera i filtri</button></div>':'')+'</section>';
}
function shopping(){
 return banner('Lista della spesa','Quello che manca, sempre con te')+'<section class="section"><div class="row"><input class="field" id="shopName" placeholder="Aggiungi alla lista"><button class="btn" data-a="shopAdd">+</button></div><div style="height:14px"></div>'+
 (db.shop.length?db.shop.map(p=>'<div class="card row" style="margin-bottom:8px"><label style="display:flex;align-items:center;gap:11px;flex:1;'+(p.done?'opacity:.5;text-decoration:line-through':'')+'"><input type="checkbox" data-a="shopToggle" data-v="'+esc(p.id)+'" '+(p.done?'checked':'')+' style="width:19px;height:19px;accent-color:#0b5147">'+esc(p.name)+'</label><button class="btn small alt" data-a="bought" data-v="'+esc(p.id)+'">Comprato</button><button class="btn small red" data-a="shopRemove" data-v="'+esc(p.id)+'">✕</button></div>').join(''):'<div class="empty"><span>🛒</span><b>La lista è vuota</b><p>Aggiungi gli alimenti che vuoi comprare.</p></div>')+'</section>';
}
function render(){
 $('#app').innerHTML=(storageProblem?'<section class="section"><p class="notice">'+esc(storageProblem)+'</p><button class="btn" data-a="settings">Recupera dati</button></section>':'')+(page==='home'?home():page==='items'?inventory():page==='recipes'?recipes():page==='nutrition'?nutritionPage():shopping())+nav();
}
function open(html){$('#overlay').innerHTML='<div class="scrim"><section class="sheet"><div class="handle"></div><div class="row"><h2>'+html.title+'</h2><button class="close" data-a="close">×</button></div>'+html.body+'</section></div>';modal=html.title}
function close(){$('#overlay').innerHTML='';modal=''}
function productForm(p){
 let editing=!!(p&&p.id),product=p||{id:'',name:'',qty:1,unit:'pz',loc:'Dispensa',exp:''};
 open({title:editing?'Modifica prodotto':'Nuovo prodotto',body:
 '<label class="label">Nome alimento</label><input id="prodName" class="field" value="'+esc(product.name)+'" placeholder="Es. Latte intero">'+
 '<div class="grid2"><div><label class="label">Quantità</label><input id="prodQty" class="field" type="number" min="0" step="0.1" value="'+Number(product.qty??1)+'"></div><div><label class="label">Unità</label><select class="field" id="prodUnit">'+units.map(v=>'<option '+(v===product.unit?'selected':'')+'>'+v+'</option>').join('')+'</select></div></div>'+
 '<label class="label">Dove lo conservo?</label><select id="prodLoc" class="field">'+locations.map(v=>'<option '+(v===product.loc?'selected':'')+'>'+v+'</option>').join('')+'</select>'+
 '<label class="label">Scadenza (facoltativa)</label><input id="prodExp" type="date" class="field" value="'+esc(product.exp||'')+'"><div style="height:19px"></div>'+
 productNutritionFields(product)+'<input type="hidden" id="prodShopId" value="'+esc(product.shopId||'')+'">'+
 '<button class="btn full" data-a="saveProduct" data-v="'+esc(product.id)+'">💾 Salva nella dispensa</button>'+(editing?'<div style="height:10px"></div><button class="btn red full" data-a="deleteProduct" data-v="'+esc(product.id)+'">Elimina prodotto</button>':'')});
}
function scanMenu(){
 open({title:'Aggiungi con una foto',body:
 '<p class="muted">Scegli cosa fotografare. Potrai controllare tutti i prodotti prima di salvarli.</p>'+
 '<button class="opt" data-a="scanSelect" data-v="scontrino"><span class="sym">🧾</span><span><b>Fotografa uno scontrino</b><small>Prova a importare gli alimenti della spesa</small></span></button>'+
 '<button class="opt" data-a="scanSelect" data-v="prodotto"><span class="sym">📦</span><span><b>Fotografa un prodotto</b><small>Legge l’etichetta o il codice a barre</small></span></button>'+
 '<p class="notice">Su Android la lettura del testo funziona offline. Il catalogo barcode richiede Internet per i prodotti non ancora cercati. Eventuali errori possono essere corretti prima di salvare.</p>'});
}
function photoOptions(mode){
 scanType=mode;
 open({title:mode==='scontrino'?'Foto dello scontrino':'Foto del prodotto',body:
 '<button class="opt" data-a="camera"><span class="sym">📸</span><span><b>Scatta una foto</b><small>Apri la fotocamera</small></span></button>'+
 '<button class="opt" data-a="gallery"><span class="sym">🖼️</span><span><b>Seleziona dalla galleria</b><small>Usa una foto già salvata</small></span></button>'+
 '<label class="label">Oppure digita un codice a barre (8–14 cifre)</label><div class="row"><input id="barcode" class="field" type="text" inputmode="numeric" maxlength="14" placeholder="Es. 8000500037560"><button class="btn" data-a="barcode">Cerca</button></div>'});
}
function reviewModal(){
 open({title:'Controlla gli alimenti',body:
 '<p class="notice">Verifica sempre nome, quantità, scadenza e posizione prima di aggiungere. I dati letti dalle foto possono contenere errori.</p>'+
 review.map((p,i)=>'<div class="card"><div class="row"><label><input type="checkbox" data-review="'+i+'" '+(p.checked?'checked':'')+'> Prodotto '+(i+1)+'</label><span class="pill '+(p.confidence==='alta'?'':'warn')+'">'+esc(p.confidence||'Da verificare')+'</span></div>'+
 '<label class="label">Alimento</label><input class="field" id="rvName'+i+'" value="'+esc(p.name)+'">'+
 '<div class="grid2"><div><label class="label">Quantità</label><input class="field" id="rvQty'+i+'" type="number" min=".1" step=".1" value="'+(Number(p.qty)||1)+'"></div>'+
 '<div><label class="label">Unità</label><select class="field" id="rvUnit'+i+'">'+units.map(x=>'<option '+(x===(p.unit||'pz')?'selected':'')+'>'+x+'</option>').join('')+'</select></div></div>'+
 '<label class="label">Conservazione</label><select class="field" id="rvLoc'+i+'">'+locations.map(x=>'<option '+(x===(p.loc||'Dispensa')?'selected':'')+'>'+x+'</option>').join('')+'</select>'+
 '<label class="label">Scadenza (se leggibile)</label><input class="field" type="date" id="rvExp'+i+'" value="'+esc(p.exp||'')+'">'+
 (p.note?'<p class="muted">'+esc(p.note)+'</p>':'')+'<p class="muted">Allergeni dichiarati: '+esc(p.allergens||'non noti')+'. Tracce: '+esc(p.traces||'non note')+'. Verifica l’etichetta.</p>'+(p.packageSize?'<p class="muted">Confezione: '+numText(p.packageSize.qty)+' '+esc(p.packageSize.unit)+'</p>':'')+(p.nutrition?nutritionSummary(p.nutrition)+'<details class="nutrition-editor"><summary>Correggi i valori letti</summary>'+nutrientFields('rvN'+i+'_',p.nutrition)+'<input hidden id="rvSource'+i+'" value="'+esc(p.nutrition.source)+'"></details>':'')+'</div>').join('')+
 (lastOcrText?'<details class="nutrition-editor"><summary>Controlla e correggi il testo letto</summary><textarea class="field" id="ocrText" rows="8">'+esc(lastOcrText)+'</textarea><button class="btn small white" data-a="reparseOcr">Rileggi dal testo corretto</button></details>':'')+
 '<button class="btn full" data-a="reviewSave">Conferma e aggiungi alla dispensa</button>'});
}
async function loadTess(){
 if(window.Tesseract)return window.Tesseract;
 return new Promise((resolve,reject)=>{
 const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
 s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('Motore OCR non disponibile'));
 s.onerror=()=>reject(new Error('Impossibile scaricare il lettore. Controlla Internet.'));
 document.head.appendChild(s);
 });
}
async function lookupBarcode(code){
 code=String(code).trim();if(!Kitchen.barcode(code))throw Error('Inserisci un codice di 8, 12, 13 o 14 cifre');
 const reset=p=>{const {id,...rest}=p;return {...rest,qty:1,exp:'',opened:'',minQty:0,checked:true,confidence:'media'}};
 const known=db.items.find(p=>p.barcode===code);if(known)return {...reset(known),note:'Dati già confermati su questo dispositivo. Verifica confezione e scadenza del nuovo acquisto.'};
 const cacheKey=KEY+'-barcode-cache';let cache={};try{cache=JSON.parse(localStorage.getItem(cacheKey)||'{}')}catch(e){}
 if(cache[code])return reset(cache[code]);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const fields='product_name,product_name_it,brands,quantity,product_quantity_unit,nutriments,no_nutrition_data,allergens_tags,traces_tags,ingredients_text_it,ingredients_text,last_modified_t';
  const response=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields='+fields,{signal:controller.signal});
  if(!response.ok)throw Error('Catalogo momentaneamente non disponibile');
  const data=await response.json(),p=data.product;if(!p)throw Error('Prodotto non trovato: puoi associarlo a questo codice manualmente');
  const name=String(p.product_name_it||p.product_name||'').trim();if(!name)throw Error('Il catalogo non contiene un nome per questo codice');
  const tags=v=>Array.isArray(v)?v.map(t=>String(t).replace(/^[a-z]{2}:/,'')).join(', '):'';
  const product={name,qty:1,unit:'confezioni',loc:OCR.location(name),exp:'',barcode:code,packageSize:Food.packageSize(p.quantity),nutrition:Food.fromOFF(p),allergens:tags(p.allergens_tags),traces:tags(p.traces_tags),ingredientsText:String(p.ingredients_text_it||p.ingredients_text||''),allergenSource:'Open Food Facts: confrontare con etichetta',catalogSource:'https://world.openfoodfacts.org/product/'+code,catalogRetrievedAt:new Date().toISOString(),checked:true,confidence:'media',note:'Dati Open Food Facts. Confronta nome, confezione, allergeni e valori con l’etichetta. La scadenza non è nel barcode.'};
  cache[code]=product;const keys=Object.keys(cache);if(keys.length>300)delete cache[keys[0]];try{localStorage.setItem(cacheKey,JSON.stringify(cache))}catch(e){}
  return product;
 }catch(error){if(error.name==='AbortError')throw Error('Il catalogo non risponde. Puoi usare foto o inserimento manuale.');throw error}finally{clearTimeout(timeout)}
}
function waiting(text){open({title:'Sto leggendo la foto',body:'<div class="notice" id="readStatus">'+esc(text)+'</div><p class="muted">L’operazione dipende dalla qualità della foto e dalla connessione.</p>'})}

let lastOcrText='';
const parsePhotoProduct=text=>OCR.product(text);
const parseReceipt=text=>OCR.receipt(text).map(p=>{
 const key=norm(p.name),aliases=db.ocrAliases||{},alias=Object.hasOwn(aliases,key)?aliases[key]:null;
 return alias&&typeof alias.name==='string'?{...p,name:alias.name,loc:alias.loc||p.loc,checked:true,note:'Descrizione corretta in precedenza su questo telefono. Verifica quantità e scadenza.'}:p;
});
const findExpiration=text=>OCR.expiration(text);
function makeOcrCanvas(img,options){
 const width=img.naturalWidth,height=img.naturalHeight;
 const canvas=document.createElement('canvas');
 const cropY=options.crop?Math.round(height*.02):0,cropH=options.crop?Math.round(height*.70):height;
 const scale=Math.min(2,2200/width,4000/cropH);
 canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(cropH*scale));
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(img,0,cropY,width,cropH,0,0,canvas.width,canvas.height);
 if(options.boost){
  const data=ctx.getImageData(0,0,canvas.width,canvas.height),p=data.data;
  for(let i=0;i<p.length;i+=4){
   const r=p[i],g=p[i+1],b=p[i+2];
   const gray=.299*r+.587*g+.114*b;
   // Evidenzia anche scritte rosse/arancioni su sfondo chiaro,
   // altrimenti le etichette tipo "ripieno alla zucca" scompaiono.
   const orangeText=r-g>30&&r-b>42&&g<195&&b<170;
   const value=orangeText||gray<126?0:gray>185?255:Math.max(0,Math.min(255,(gray-127)*1.7+127));
   p[i]=p[i+1]=p[i+2]=value;
  }
  ctx.putImageData(data,0,0);
 }
 return canvas;
}
let localOcrWorkerPromise=null;
async function getLocalOcrWorker(){
 if(!localOcrWorkerPromise){
  localOcrWorkerPromise=loadTess().then(t=>t.createWorker(['ita','eng']));
 }
 try{return await localOcrWorkerPromise}
 catch(e){localOcrWorkerPromise=null;throw e}
}
async function recognizePhotoOffline(file){
 const mode=scanType,url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('Immagine illeggibile'));img.src=url});
  const native=window.NativeKitchen&&typeof window.NativeKitchen.recognizeImage==='function';
  const worker=native?null:await getLocalOcrWorker();
  if(worker)await worker.setParameters({tessedit_pageseg_mode:mode==='scontrino'?'6':'11',preserve_interword_spaces:'1'});
  const recognize=async canvas=>native?requestNativeOcr(canvas):String((await worker.recognize(canvas)).data.text||'');
  let text=await recognize(makeOcrCanvas(img,{crop:false,boost:false}));
  let candidates=mode==='prodotto'?parsePhotoProduct(text):parseReceipt(text);
  if(!candidates.length||mode==='prodotto'&&!findExpiration(text)){
   if($('#readStatus'))$('#readStatus').textContent='Controllo contrasto, dettagli e scadenza…';
   const extra=await recognize(makeOcrCanvas(img,{crop:false,boost:true}));
   if(mode==='prodotto'){text+='\n'+extra;candidates=parsePhotoProduct(text)}
   else{const retry=parseReceipt(extra),seen=new Map(candidates.map(p=>[norm(p.name),p]));for(const p of retry)if(!seen.has(norm(p.name)))seen.set(norm(p.name),p);candidates=[...seen.values()];text+='\n'+extra}
  }
  lastOcrText=text.slice(0,30000);return candidates;
 }finally{URL.revokeObjectURL(url)}
}
let photoBusy=false;
async function processPhoto(file){
 if(!file)return;if(photoBusy){toast('Una foto è già in lettura');return}photoBusy=true;lastOcrText='';
 waiting('Leggo la foto sul telefono…');let barcodeProduct=null,detectedBarcode='';
 try{
  if(scanType==='prodotto'){
   let code='';try{code=await readPhotoBarcode(file)}catch(error){if(barcodeOnly)throw error}detectedBarcode=code;
   if(code){try{barcodeProduct=await lookupBarcode(code)}catch(error){if(barcodeOnly){barcodeManualFallback(code,error.message);return}}}
   else if(barcodeOnly)throw Error('Codice non leggibile. Inquadra un solo barcode oppure scrivi le cifre sotto le barre.');
  }
  if(barcodeOnly&&barcodeProduct){review=[barcodeProduct];reviewModal();return;}
  let recognized=[];try{recognized=await recognizePhotoOffline(file)}catch(error){if(!barcodeProduct)throw error;}
  if(barcodeProduct){const photo=recognized[0];review=[Object.assign({},photo||{},barcodeProduct,{exp:photo?photo.exp:'',packageSize:barcodeProduct.packageSize||photo&&photo.packageSize||null,nutrition:barcodeProduct.nutrition||photo&&photo.nutrition||null})]}
  else review=recognized.map(p=>({...p,...(detectedBarcode?{barcode:detectedBarcode}:{})}));
  if(!review.length)throw Error('Non ho individuato alimenti con sufficiente affidabilità. Prova una foto più nitida, vicina al testo, oppure inserisci manualmente.');
  reviewModal();
 }catch(error){open({title:'La foto non è stata riconosciuta',body:'<p class="notice">'+esc(error.message||'Errore nella lettura')+'</p><button class="btn full" data-a="scanMenu">Riprova con un’altra foto</button><button class="btn white full" style="margin-top:10px" data-a="new">Inserisci manualmente</button>'})}
 finally{photoBusy=false}
}
function detail(name){
 const r=recipeData.find(x=>x[0]===name);if(!r)return;const m=r[5],fav=(db.favorites||[]).includes(m.id),est=recipeNutrition(r,db.people);
 open({title:esc(r[0]),body:'<p class="muted">⏱ '+r[2]+' · '+db.people+' persone · '+esc(m.category)+'</p><button class="btn small white" data-a="favorite" data-v="'+esc(m.id)+'">'+(fav?'★ Nei preferiti':'☆ Salva nei preferiti')+'</button><h3>Ingredienti per '+db.people+' persone</h3>'+m.ingredients.map(i=>'<div class="card row" style="padding:10px"><div><strong>'+esc(i.name)+'</strong><small class="diary-meta">'+esc(formatRecipeAmount(i,db.people,m.servings))+'</small></div><span class="ingredient-status">'+(have(i.name)?'✓ Presente':'Da comprare')+'</span></div>').join('')+'<p class="notice">'+esc(m.note)+' Tempi e liquidi di cottura vanno adattati alle porzioni e agli utensili.</p><h3>Preparazione</h3><ol class="steps">'+r[4].map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol>'+(est?'<p class="notice">Stima dai prodotti della dispensa, per persona: '+numText(est.totals.kcal)+' kcal · P '+numText(est.totals.protein)+' g · C '+numText(est.totals.carbs)+' g · G '+numText(est.totals.fat)+' g. Condimenti esclusi.</p>':'<p class="muted">Stima nutrizionale non disponibile: servono etichette e unità compatibili per tutti gli ingredienti.</p>')+'<button class="btn full" data-a="missing" data-v="'+esc(r[0])+'">🛒 Aggiungi ingredienti mancanti alla spesa</button><button class="btn white full" style="margin-top:10px" data-a="diaryRecipe" data-v="'+esc(r[0])+'">Registra nel diario alimentare</button>'});
}
function settings(){
 open({title:'Impostazioni',body:
 '<img class="settings-logo" src="brand-logo.webp" alt="MyFoodWorld. Your food. Your world." width="744" height="632"><p class="brand-version">Versione 1.4.0</p>'+
 '<p class="notice">MyFoodWorld usa solo strumenti gratuiti. Su Android il lettore delle foto è incluso nell’app e funziona sul telefono anche offline; nel browser è disponibile un lettore di riserva che richiede il primo download; i codici a barre vengono cercati in Open Food Facts. Non utilizziamo GPT né servizi a pagamento.</p>'+
 '<p class="notice">Dispensa e lista sono salvate nel telefono. Fai periodicamente il backup prima di cambiare dispositivo.</p>'+
 '<button class="opt" data-a="export"><span class="sym">📤</span><span><b>Esporta backup</b><small>Salva i prodotti in un file JSON</small></span></button>'+
 '<button class="opt" data-a="import"><span class="sym">📥</span><span><b>Importa backup</b><small>Ripristina un file JSON</small></span></button>'+
 '<button class="opt" data-a="demo"><span class="sym">🧺</span><span><b>Prodotti dimostrativi</b><small>Prova con una spesa di esempio</small></span></button>'+
 '<button class="btn red full" data-a="reset">Cancella tutti i dati</button>'});
}
function addItem(p){
 const old=db.items.find(x=>Kitchen.sameLot(x,p));
 if(old)old.qty=Kitchen.rounded(Number(old.qty)+Number(p.qty));
 else db.items.push({...p,id:p.id||id()});
}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-a]');if(!el)return;
 const act=el.dataset.a,v=el.dataset.v;
 if(act==='close'){close();return}
 if(act==='tab'){page=v;close();render();return}
 if(act==='settings'){settings();return}
 if(act==='expiryFilter'){expiryWindow=Number(v);render();return}
 if(act==='recipesMore'){recipeLimit+=30;const y=scrollY;render();scrollTo(0,y);return}
 if(act==='recipeReset'){recQuery='';recipeCategory='Tutte';recipeMode='Tutte';recipeDiet='Tutte';recipeTime=0;recipeLimit=30;render();return}
 if(act==='favorite'){db.favorites=db.favorites||[];db.favorites=db.favorites.includes(v)?db.favorites.filter(x=>x!==v):db.favorites.concat(v);save();const r=recipeData.find(x=>x[5].id===v);if(r)detail(r[0]);return}
 if(act==='diaryNew'){diaryForm();return}
 if(act==='diaryProduct'){diaryForm(db.items.find(x=>x.id===v));return}
 if(act==='diaryRecipe'){diaryForm(null,v);return}
 if(act==='diarySave'){saveDiary();return}
 if(act==='diaryDelete'){if(confirm('Eliminare questa registrazione?')){db.diary=(db.diary||[]).filter(x=>x.id!==v);save()}return}

 if(act==='new'){productForm();return}
 if(act==='edit'){const p=db.items.find(x=>x.id===v);if(p)productForm(p);return}
 if(act==='filter'){category=v;render();return}
 if(act==='meal'){db.meal=v;save();return}
 if(act==='people'){db.people=Math.max(1,Math.min(12,db.people+Number(v)));save();return}
 if(act==='detail'){detail(v);return}
 if(act==='scanMenu'){scanMenu();return}
 if(act==='scanSelect'){photoOptions(v);return}
 if(act==='camera'){$('#photoCamera').click();return}
 if(act==='gallery'){$('#photoGallery').click();return}
 if(act==='saveProduct'){
  const name=$('#prodName').value.trim(),qty=Number($('#prodQty').value),loc=$('#prodLoc').value,unit=$('#prodUnit').value,exp=$('#prodExp').value;
  if(!name||qty<0||!Number.isFinite(qty)){toast('Controlla nome e quantità');return}
  const old=db.items.find(x=>x.id===v);let p=Object.assign({},old||{},{id:v||id(),name,qty,loc,unit,exp,nutrition:readNutrients('prodN',$('#prodSource').value,$('#prodBasis').value)});const pack=Number($('#prodPackQty').value);p.packageSize=pack>0?{qty:pack,unit:$('#prodPackUnit').value}:null;const shopId=$('#prodShopId').value;if(shopId)db.shop=db.shop.filter(x=>x.id!==shopId);
  let idx=db.items.findIndex(x=>x.id===v);
  if(idx>=0)db.items[idx]=p;else addItem(p);
  close();save();toast('Prodotto salvato');return
 }
 if(act==='deleteProduct'){
  if(confirm('Eliminare il prodotto?')){db.items=db.items.filter(x=>x.id!==v);close();save()}return
 }
 if(act==='plus'||act==='minus'){
  const p=db.items.find(x=>x.id===v);if(!p)return;
  p.qty=Math.max(0,Math.round((Number(p.qty)+(act==='plus'?1:-1))*10)/10);
  if(p.qty===0&&confirm('Hai finito '+p.name+'. Aggiungerlo alla spesa?'))db.shop.push({id:id(),name:p.name,done:false});
  save();return
 }
 if(act==='barcode'){
  const code=String($('#barcode').value||'').trim();waiting('Cerco il prodotto…');
  try{lastOcrText='';const product=await lookupBarcode(code);review=[product];reviewModal()}
  catch(e){barcodeManualFallback(code,e.message)}return
 }
 if(act==='reparseOcr'){lastOcrText=$('#ocrText').value;review=scanType==='prodotto'?parsePhotoProduct(lastOcrText):parseReceipt(lastOcrText);reviewModal();return}
 if(act==='reviewSave'){
  let done=0;
  review.forEach((x,i)=>{
   const checkbox=$('[data-review="'+i+'"]');if(!checkbox||!checkbox.checked)return;
   const name=$('#rvName'+i).value.trim(),qty=Number($('#rvQty'+i).value);
   const unit=$('#rvUnit'+i).value,loc=$('#rvLoc'+i).value,exp=$('#rvExp'+i).value;
   if(name&&qty>0&&Number.isFinite(qty)){if(scanType==='scontrino'&&norm(name)!==norm(x.name)){db.ocrAliases={...(db.ocrAliases||{}),[norm(x.name)]:{name,loc}};const aliasKeys=Object.keys(db.ocrAliases);if(aliasKeys.length>500)delete db.ocrAliases[aliasKeys[0]];}addItem({name,qty,unit,loc,exp,nutrition:$('#rvN'+i+'_kcal')?readNutrients('rvN'+i+'_',$('#rvSource'+i).value,x.nutrition.basis):Food.cleanNutrition(x.nutrition),packageSize:x.packageSize||null,barcode:x.barcode||'',allergens:x.allergens||'',traces:x.traces||'',ingredientsText:x.ingredientsText||'',allergenSource:x.allergenSource||'',catalogSource:x.catalogSource||'',catalogRetrievedAt:x.catalogRetrievedAt||''});done++}
  });
  close();noteProductAdded(done);if(save())announceSaved(done+' prodotti aggiunti');return
 }
 if(act==='shopAdd'){
  const input=$('#shopName');const name=input.value.trim();if(!name)return;
  db.shop.push({id:id(),name,done:false});save();return
 }
 if(act==='shopToggle'){const p=db.shop.find(x=>x.id===v);if(p){p.done=!p.done;save()}return}
 if(act==='shopRemove'){db.shop=db.shop.filter(x=>x.id!==v);save();return}
 if(act==='bought'){const p=db.shop.find(x=>x.id===v);if(!p)return;productForm({id:'',shopId:p.id,name:p.name,qty:1,unit:'pz',loc:'Dispensa',exp:''});return}
 if(act==='missing'){const r=recipeData.find(x=>x[0]===v);if(r)r[3].filter(x=>!have(x)).forEach(n=>{if(!db.shop.some(x=>norm(x.name)===norm(n)))db.shop.push({id:id(),name:n,done:false})});close();save();toast('Lista della spesa aggiornata');return}
 if(act==='export'){
  const data=JSON.stringify({version:1,exportedAt:new Date().toISOString(),items:db.items,shop:db.shop,people:db.people,meal:db.meal,diary:db.diary||[],favorites:db.favorites||[]},null,2);
  if(window.NativeKitchen&&window.NativeKitchen.exportBackup)window.NativeKitchen.exportBackup(data);
  else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download='myfoodworld-backup.json';a.click();URL.revokeObjectURL(a.href)}
  return
 }
 if(act==='import'){$('#backupInput').click();return}
 if(act==='demo'){['Pasta','Passata di pomodoro','Uova','Zucchine','Parmigiano','Riso','Tonno'].forEach(n=>addItem({name:n,qty:2,unit:'pz',loc:/Uova|Zucchine|Parmigiano/.test(n)?'Frigo':'Dispensa',exp:''}));close();save();toast('Prodotti di esempio aggiunti');return}
 if(act==='reset'&&confirm('Cancellare tutta la dispensa e la lista? Salva un backup prima di continuare.')){db=structuredClone(DEFAULT);close();save();return}
});
document.addEventListener('input',e=>{
 if(e.target.id.startsWith('rvN')){const i=e.target.id.match(/^rvN(\d+)_/);if(i&&$('#rvSource'+i[1]))$('#rvSource'+i[1]).value='Inserimento manuale'}
 if(e.target.id.startsWith('prodN')&&$('#prodSource'))$('#prodSource').value='Inserimento manuale';
 if(e.target.id.startsWith('diaryN')&&$('#diarySource'))$('#diarySource').value='Inserimento manuale';
 if(e.target.id==='inventorySearch'){const pos=e.target.selectionStart;query=e.target.value;render();const i=$('#inventorySearch');if(i){i.focus();i.setSelectionRange(pos,pos)}}
 if(e.target.id==='recipeSearch'){const pos=e.target.selectionStart;recQuery=e.target.value;recipeLimit=30;render();const i=$('#recipeSearch');if(i){i.focus();i.setSelectionRange(pos,pos)}}
});
document.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&e.target.id==='shopName'){e.preventDefault();const name=e.target.value.trim();if(name){db.shop.push({id:id(),name,done:false});save()}}
});
$('#photoCamera').addEventListener('change',e=>{const file=e.target.files&&e.target.files[0];e.target.value='';processPhoto(file)});
$('#photoGallery').addEventListener('change',e=>{const file=e.target.files&&e.target.files[0];e.target.value='';processPhoto(file)});
$('#backupInput').addEventListener('change',async e=>{
 const file=e.target.files&&e.target.files[0];e.target.value='';if(!file)return;
 try{const data=JSON.parse(await file.text());if(!Array.isArray(data.items)||!Array.isArray(data.shop))throw Error('File non compatibile');if(!confirm('Sostituire i dati attuali con quelli del backup?'))return;db=normalizeDb(data);close();save();toast('Backup importato')}
 catch(err){toast('Backup non valido')}
});
window.nativeGoBack=function(){if(modal){close();return true}if(page!=='home'){page='home';render();return true}return false};


document.addEventListener('change',e=>{
 const key=e.target.id;
 if(key==='recipeCategory'){recipeCategory=e.target.value;recipeLimit=30;render()}
 if(key==='recipeMode'){recipeMode=e.target.value;recipeLimit=30;render()}
 if(key==='recipeDiet'){recipeDiet=e.target.value;recipeLimit=30;render()}
 if(key==='recipeTime'){recipeTime=Number(e.target.value);recipeLimit=30;render()}
 if(key==='nutritionDay'){nutritionDay=e.target.value||Food.localDate();render()}
 if(key==='prodBasis'&&$('#prodSource'))$('#prodSource').value='Inserimento manuale';
 if(key==='diaryUnit'){Food.nutrientKeys.forEach(k=>$('#diaryN'+k).value='');$('#diarySource').value='Inserimento manuale';toast('Inserisci i valori per la nuova unità di misura')}
 if(key==='diaryProduct'){const p=db.items.find(x=>x.id===e.target.value);diaryForm(p)}
});

