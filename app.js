'use strict';
/* La mia cucina – dati salvati solo nello spazio privato dell'app Android. */
const KEY='la-mia-cucina-v1';
const DEFAULT={items:[],shop:[],people:2,meal:'Cena'};
let db;
try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'null');
  db=saved&&Array.isArray(saved.items)&&Array.isArray(saved.shop)?Object.assign({},DEFAULT,saved):structuredClone(DEFAULT);
}catch(e){db=structuredClone(DEFAULT)}
let page='home',category='Tutti',query='',recQuery='',review=[],scanType='prodotto',modal='',timer;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[x]));
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const id=()=>String(Date.now())+Math.random().toString(36).slice(2);
const today=()=>new Date().toISOString().slice(0,10);
function save(){localStorage.setItem(KEY,JSON.stringify(db));render()}
function toast(s){let old=$('.toast');if(old)old.remove();let e=document.createElement('div');e.className='toast';e.textContent=s;document.body.append(e);clearTimeout(timer);timer=setTimeout(()=>e.remove(),2800)}
const recipeData=[
['Pasta al pomodoro','🍝','20 min',['Pasta','Passata di pomodoro'],['Metti a bollire acqua salata e cuoci la pasta.','Scalda la passata con olio e sale.','Condisci e servi.']],
['Pasta con zucchine','🥒','25 min',['Pasta','Zucchine','Parmigiano'],['Taglia le zucchine a rondelle e falle rosolare.','Cuoci la pasta e tieni un po’ di acqua di cottura.','Mescola pasta, zucchine, acqua e parmigiano.']],
['Frittata di zucchine','🍳','20 min',['Uova','Zucchine'],['Cuoci le zucchine a pezzetti in padella.','Sbatti le uova con sale.','Unisci e cuoci su entrambi i lati.']],
['Omelette al formaggio','🧀','12 min',['Uova','Formaggio'],['Sbatti le uova.','Versale in padella antiaderente.','Aggiungi il formaggio, piega e servi.']],
['Riso al tonno','🍚','20 min',['Riso','Tonno'],['Lessa il riso e scolalo.','Sgocciola il tonno.','Mescola e condisci con olio e limone se disponibile.']],
['Pasta tonno e pomodoro','🐟','20 min',['Pasta','Tonno','Passata di pomodoro'],['Cuoci la pasta.','Scalda pomodoro e tonno in padella.','Unisci la pasta al sugo.']],
['Insalata caprese','🍅','10 min',['Mozzarella','Pomodori'],['Affetta mozzarella e pomodori.','Disponili sul piatto.','Condisci con olio, sale e basilico se disponibile.']],
['Toast prosciutto e formaggio','🥪','10 min',['Pane','Prosciutto','Formaggio'],['Farcisci il pane con prosciutto e formaggio.','Scalda in padella o tostapane fino a doratura.']],
['Pasta al pesto','🌿','15 min',['Pasta','Pesto'],['Lessala pasta in acqua salata.','Diluisci il pesto con poca acqua di cottura.','Mescola e servi.']],
['Riso con piselli','🫛','25 min',['Riso','Piselli'],['Cuoci i piselli in padella.','Lessa il riso.','Unisci e completa con olio.']],
['Pollo al limone','🍗','25 min',['Pollo','Limone'],['Taglia il pollo a striscioline.','Rosola con un filo d’olio.','Aggiungi succo di limone e poca acqua, cuoci bene.']],
['Patate al forno','🥔','45 min',['Patate'],['Taglia le patate a spicchi.','Condisci con olio, sale e rosmarino se disponibile.','Inforna a 200 °C finché dorate e ben cotte.']],
['Insalata di riso','🥗','25 min',['Riso','Tonno','Mais'],['Lessa il riso e fallo raffreddare.','Aggiungi tonno e mais.','Condisci e lascia riposare.']],
['Pasta alla carbonara','🍝','25 min',['Pasta','Uova','Guanciale','Pecorino'],['Rosola il guanciale.','Sbatti tuorli e pecorino.','Mescola con la pasta cotta lontano dal fuoco.']],
['Pasta aglio e olio','🍝','15 min',['Pasta','Aglio','Olio'],['Cuoci la pasta.','Scalda l’olio con aglio senza bruciarlo.','Salta la pasta con poca acqua di cottura.']],
['Uova strapazzate','🥚','10 min',['Uova'],['Sbatti le uova.','Cuocile a fiamma bassa mescolando.','Spegni quando sono cremose.']],
['Pasta al burro','🧈','15 min',['Pasta','Burro'],['Cuoci la pasta.','Scolala conservando acqua di cottura.','Amalgama con burro e acqua.']],
['Piadina farcita','🌯','10 min',['Piadina','Prosciutto','Formaggio'],['Scalda la piadina.','Farcisci con prosciutto e formaggio.','Chiudi e scalda brevemente.']],
['Hamburger con patate','🍔','35 min',['Hamburger','Patate'],['Prepara le patate al forno o in padella.','Cuoci completamente l’hamburger.','Servi insieme.']],
['Verdure saltate','🥦','20 min',['Zucchine','Carote'],['Taglia le verdure in pezzi uniformi.','Saltale in padella con olio.','Cuoci finché tenere.']],
['Pasta ricotta e spinaci','🥬','20 min',['Pasta','Ricotta','Spinaci'],['Cuoci gli spinaci.','Lessa la pasta.','Amalgama spinaci, ricotta e pasta.']],
['Minestrone','🍲','30 min',['Minestrone'],['Versa il minestrone in pentola con acqua secondo confezione.','Cuoci fino a quando tutte le verdure sono tenere.','Condisci con olio.']],
['Tonno e fagioli','🫘','10 min',['Tonno','Fagioli'],['Sgocciola tonno e fagioli cotti.','Uniscili in una ciotola.','Condisci con olio e cipolla se disponibile.']],
['Uova e pomodori','🍳','15 min',['Uova','Pomodori'],['Cuoci i pomodori tagliati in padella.','Rompi le uova direttamente nel sugo.','Copri e cuoci a piacere.']],
['Pasta al salmone','🐟','20 min',['Pasta','Salmone','Panna'],['Cuoci la pasta.','Rosola il salmone, aggiungi la panna.','Condisci la pasta.']],
['Risotto ai funghi','🍄','30 min',['Riso','Funghi'],['Cuoci i funghi in padella.','Tosta il riso, aggiungi acqua calda gradualmente.','Unisci i funghi e manteca.']]
];
const units=['pz','g','kg','ml','L','confezioni','bottiglie'];
const locations=['Frigo','Dispensa','Freezer'];
const staples=['olio','sale','acqua','pepe','aglio'];
function have(ingredient){
  const n=norm(ingredient);
  if(staples.includes(n))return true;
  return db.items.some(p=>Number(p.qty)>0&&(norm(p.name).includes(n)||n.includes(norm(p.name))&&norm(p.name).length>3));
}
function matched(r){return r[3].filter(x=>have(x)).length}
function daysLeft(date){if(!date)return null;const target=new Date(date+'T12:00:00');return Math.ceil((target-Date.now())/86400000)}
function countExp(){return db.items.filter(p=>{let n=daysLeft(p.exp);return n!==null&&n<=3}).length}
function emojiFor(name){let s=norm(name);return /pasta|spaghett|penne|riso/.test(s)?'🍝':/uova/.test(s)?'🥚':/latte|yogurt|formaggio|mozzarella|ricotta/.test(s)?'🧀':/carne|pollo|prosciutto/.test(s)?'🍗':/frutta|mela|banana/.test(s)?'🍎':/verdura|zucchin|pomodor|carot/.test(s)?'🥦':/pesce|tonno|salmone/.test(s)?'🐟':'🥫'}
function nav(){
  return '<nav class="bottom">'+[['home','🏠','Oggi'],['items','🧺','Dispensa'],['recipes','🍳','Ricette'],['shop','🛒','Spesa']].map(x=>'<button data-a="tab" data-v="'+x[0]+'" class="'+(page===x[0]?'active':'')+'"><span>'+x[1]+'</span>'+x[2]+'</button>').join('')+'</nav>';
}
function banner(name,sub){return '<header class="simple"><h1>'+name+'</h1><p>'+sub+'</p></header>'}
function home(){
  const sorted=recipeData.slice().sort((a,b)=>matched(b)-matched(a));
  return '<header class="hero"><div class="brandbar"><div class="brandicon">🥬</div><div><b>La mia cucina</b><small>La tua spesa, senza pensieri</small></div><button class="settings" data-a="settings">⚙</button></div><div class="welcome"><span class="eyebrow">Ciao, benvenuto a casa</span><h1>In cucina è tutto più semplice.</h1><p>Organizza quello che hai e scopri cosa preparare oggi.</p></div></header>'+
  '<div class="summary"><div class="metric"><i>🥫</i><b>'+db.items.length+'</b><small>Prodotti</small></div><div class="metric"><i>⏳</i><b>'+countExp()+'</b><small>In scadenza</small></div><div class="metric"><i>🛍️</i><b>'+db.shop.filter(x=>!x.done).length+'</b><small>Da comprare</small></div></div>'+
  '<section class="section"><h2>Aggiungi la spesa</h2><div class="photo"><div class="emoji">📸</div><div><h3>Una foto e via!</h3><p>Fotografa uno scontrino o un prodotto per aggiungerlo alle scorte.</p><button class="btn small" data-a="scanMenu">📸 Scatta o carica una foto</button></div></div></section>'+
  '<section class="section"><div class="actions"><button class="tile" data-a="new"><i>➕</i><b>Nuovo prodotto</b><small>Inserimento manuale</small></button><button class="tile" data-a="tab" data-v="shop"><i>🛒</i><b>Lista della spesa</b><small>Non dimenticare nulla</small></button></div></section>'+
  '<section class="section"><h2>Cosa cucino oggi?</h2><div class="grid2" style="margin-bottom:13px"><button class="btn '+(db.meal==='Pranzo'?'':'alt')+'" data-a="meal" data-v="Pranzo">Pranzo</button><button class="btn '+(db.meal==='Cena'?'':'alt')+'" data-a="meal" data-v="Cena">Cena</button></div>'+sorted.slice(0,3).map(recipeCard).join('')+'<button class="btn white full" data-a="tab" data-v="recipes">Vedi tutte le 26 ricette</button></section>';
}
function itemCard(p){
  let n=daysLeft(p.exp);let expiration=n===null?'':n<0?'Scaduto':n===0?'Scade oggi':n<4?'Scade tra '+n+' giorni':'Scade il '+p.exp;
  return '<div class="card item"><div class="symbol">'+emojiFor(p.name)+'</div><div class="item-info" data-a="edit" data-v="'+esc(p.id)+'"><strong>'+esc(p.name)+'</strong><small>'+esc(p.loc||'Dispensa')+(expiration?' · '+esc(expiration):'')+'</small></div><button class="qbtn" data-a="minus" data-v="'+esc(p.id)+'">−</button><strong style="font-size:12px">'+Number(p.qty||0)+' '+esc(p.unit||'pz')+'</strong><button class="qbtn" data-a="plus" data-v="'+esc(p.id)+'">+</button></div>';
}
function inventory(){
 const items=db.items.filter(p=>(category==='Tutti'||p.loc===category)&&norm(p.name).includes(norm(query))).sort((a,b)=>a.name.localeCompare(b.name));
 return banner('La mia dispensa','Frigo, freezer e prodotti di casa')+
 '<section class="section"><button class="btn full" data-a="new">➕ Aggiungi un prodotto</button><div style="height:15px"></div><input class="field" id="inventorySearch" placeholder="Cerca tra i tuoi alimenti" value="'+esc(query)+'"><div style="height:12px"></div><div class="filter">'+['Tutti'].concat(locations).map(x=>'<button data-a="filter" data-v="'+x+'" class="'+(category===x?'on':'')+'">'+x+'</button>').join('')+'</div>'+
 (items.length?items.map(itemCard).join(''):'<div class="empty"><span>🧺</span><b>Nessun prodotto qui</b><p>Inizia con una foto o con l’inserimento manuale.</p></div>')+'</section>';
}
function recipeCard(r){
 let n=matched(r),tot=r[3].length;
 return '<div class="card recipe" data-a="detail" data-v="'+esc(r[0])+'"><div class="symbol">'+r[1]+'</div><div class="body"><b>'+esc(r[0])+'</b><small>⏱ '+r[2]+' · '+(n===tot?'Tutti gli ingredienti disponibili':n+'/'+tot+' ingredienti disponibili')+'</small><span class="pill '+(n===tot?'':'warn')+'">'+(n===tot?'Puoi cucinarla':'Mancano '+(tot-n)+' ingredienti')+'</span></div><span>›</span></div>';
}
function recipes(){
 const list=recipeData.filter(r=>norm(r[0]).includes(norm(recQuery))).sort((a,b)=>matched(b)-matched(a));
 return banner('Cosa cucino?','Ricette in base a quello che hai in casa')+'<section class="section"><label class="label">Per quante persone?</label><div class="grid2" style="margin-bottom:12px"><button class="btn white" data-a="people" data-v="-1">−</button><button class="btn alt" data-a="people" data-v="1">👥 '+db.people+' persone +</button></div><input id="recipeSearch" class="field" placeholder="Cerca una ricetta" value="'+esc(recQuery)+'"><div style="height:14px"></div>'+list.map(recipeCard).join('')+'</section>';
}
function shopping(){
 return banner('Lista della spesa','Quello che manca, sempre con te')+'<section class="section"><div class="row"><input class="field" id="shopName" placeholder="Aggiungi alla lista"><button class="btn" data-a="shopAdd">+</button></div><div style="height:14px"></div>'+
 (db.shop.length?db.shop.map(p=>'<div class="card row" style="margin-bottom:8px"><label style="display:flex;align-items:center;gap:11px;flex:1;'+(p.done?'opacity:.5;text-decoration:line-through':'')+'"><input type="checkbox" data-a="shopToggle" data-v="'+esc(p.id)+'" '+(p.done?'checked':'')+' style="width:19px;height:19px;accent-color:#0b5147">'+esc(p.name)+'</label><button class="btn small alt" data-a="bought" data-v="'+esc(p.id)+'">Comprato</button><button class="btn small red" data-a="shopRemove" data-v="'+esc(p.id)+'">✕</button></div>').join(''):'<div class="empty"><span>🛒</span><b>La lista è vuota</b><p>Aggiungi gli alimenti che vuoi comprare.</p></div>')+'</section>';
}
function render(){
 $('#app').innerHTML=(page==='home'?home():page==='items'?inventory():page==='recipes'?recipes():shopping())+nav();
}
function open(html){$('#overlay').innerHTML='<div class="scrim"><section class="sheet"><div class="handle"></div><div class="row"><h2>'+html.title+'</h2><button class="close" data-a="close">×</button></div>'+html.body+'</section></div>';modal=html.title}
function close(){$('#overlay').innerHTML='';modal=''}
function productForm(p){
 let editing=!!p,product=p||{id:'',name:'',qty:1,unit:'pz',loc:'Dispensa',exp:''};
 open({title:editing?'Modifica prodotto':'Nuovo prodotto',body:
 '<label class="label">Nome alimento</label><input id="prodName" class="field" value="'+esc(product.name)+'" placeholder="Es. Latte intero">'+
 '<div class="grid2"><div><label class="label">Quantità</label><input id="prodQty" class="field" type="number" min="0" step="0.1" value="'+Number(product.qty||1)+'"></div><div><label class="label">Unità</label><select class="field" id="prodUnit">'+units.map(v=>'<option '+(v===product.unit?'selected':'')+'>'+v+'</option>').join('')+'</select></div></div>'+
 '<label class="label">Dove lo conservo?</label><select id="prodLoc" class="field">'+locations.map(v=>'<option '+(v===product.loc?'selected':'')+'>'+v+'</option>').join('')+'</select>'+
 '<label class="label">Scadenza (facoltativa)</label><input id="prodExp" type="date" class="field" value="'+esc(product.exp||'')+'"><div style="height:19px"></div>'+
 '<button class="btn full" data-a="saveProduct" data-v="'+esc(product.id)+'">💾 Salva nella dispensa</button>'+(editing?'<div style="height:10px"></div><button class="btn red full" data-a="deleteProduct" data-v="'+esc(product.id)+'">Elimina prodotto</button>':'')});
}
function scanMenu(){
 open({title:'Aggiungi con una foto',body:
 '<p class="muted">Scegli cosa fotografare. Potrai controllare tutti i prodotti prima di salvarli.</p>'+
 '<button class="opt" data-a="scanSelect" data-v="scontrino"><span class="sym">🧾</span><span><b>Fotografa uno scontrino</b><small>Prova a importare gli alimenti della spesa</small></span></button>'+
 '<button class="opt" data-a="scanSelect" data-v="prodotto"><span class="sym">📦</span><span><b>Fotografa un prodotto</b><small>Legge l’etichetta o il codice a barre</small></span></button>'+
 '<p class="notice">Il riconoscimento foto richiede Internet al primo utilizzo. Eventuali errori possono essere corretti prima di salvare.</p>'});
}
function photoOptions(mode){
 scanType=mode;
 open({title:mode==='scontrino'?'Foto dello scontrino':'Foto del prodotto',body:
 '<button class="opt" data-a="camera"><span class="sym">📸</span><span><b>Scatta una foto</b><small>Apri la fotocamera</small></span></button>'+
 '<button class="opt" data-a="gallery"><span class="sym">🖼️</span><span><b>Seleziona dalla galleria</b><small>Usa una foto già salvata</small></span></button>'+
 '<label class="label">Oppure digita un codice a barre (8–14 cifre)</label><div class="row"><input id="barcode" class="field" type="number" placeholder="Es. 8000500037560"><button class="btn" data-a="barcode">Cerca</button></div>'});
}
function reviewModal(){
 open({title:'Controlla gli alimenti',body:
 '<p class="notice">Controlla i nomi e le quantità riconosciute. I prodotti selezionati saranno aggiunti alla dispensa.</p>'+
 review.map((p,i)=>'<div class="candidate"><input type="checkbox" data-review="'+i+'" '+(p.checked?'checked':'')+'><input class="field" id="rvName'+i+'" value="'+esc(p.name)+'"><input class="field q" id="rvQty'+i+'" type="number" min="0.1" step="0.1" value="'+(Number(p.qty)||1)+'"></div>').join('')+
 '<label class="label">Dove metterli?</label><select class="field" id="reviewLoc">'+locations.map(x=>'<option>'+x+'</option>').join('')+'</select><div style="height:17px"></div>'+
 '<button class="btn full" data-a="reviewSave">Aggiungi alla dispensa</button>'});
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
 if(!/^\d{8,14}$/.test(code))throw new Error('Inserisci da 8 a 14 cifre');
 const res=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_it,quantity');
 if(!res.ok)throw new Error('Catalogo momentaneamente non disponibile');
 const data=await res.json();
 if(!data.product)throw new Error('Prodotto non trovato: inseriscilo manualmente');
 return (data.product.product_name_it||data.product.product_name||'').trim();
}
function waiting(text){open({title:'Sto leggendo la foto',body:'<div class="notice" id="readStatus">'+esc(text)+'</div><p class="muted">L’operazione dipende dalla qualità della foto e dalla connessione.</p>'})}
function parseReceipt(text){
 const ban=/\b(totale|subtotal|resto|iva|p\.?\s*iva|pagamento|scontrino|documento|bancomat|contante|carta|articoli|acquisto|euro|grazie|numero|operatore|cassa|sconto|reparto|imponibile|credito|punti|codice|iva)\b/i;
 return text.split(/\n/).map(x=>x.trim().replace(/^\d{2}[:/]\d{2}[:/]\d{2,4}\s*/, '').replace(/\s+(?:€\s*)?[\d.,]+\s*[A-Z%]?\s*$/,'').replace(/^[\d.,€\s*×x-]+/,'').replace(/\s{2,}/g,' ').trim()).filter(x=>x.length>=4&&x.length<=65&&/[A-Za-zÀ-ž]{3}/.test(x)&&!ban.test(x)&&!(/^\d/.test(x))).slice(0,30).map(x=>({name:x,qty:1,checked:true}));
}
async function processPhoto(file){
 if(!file)return;
 waiting('Riconoscimento in corso…');
 try{
  if(scanType==='prodotto'&&typeof BarcodeDetector!=='undefined'&&typeof createImageBitmap==='function'){
    try{const bmp=await createImageBitmap(file);const detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});const found=await detector.detect(bmp);bmp.close();
      if(found.length){const name=await lookupBarcode(found[0].rawValue);if(name){review=[{name,qty:1,checked:true}];reviewModal();return;}}}catch(e){}
  }
  const tess=await loadTess();
  const result=await tess.recognize(file,'ita+eng');
  const raw=result&&result.data&&result.data.text||'';
  const lines=parseReceipt(raw);
  if(scanType==='scontrino')review=lines;
  else{
    const first=lines.find(x=>/[A-Za-zÀ-ž]{3,}/.test(x.name));
    review=first?[first]:[];
  }
  if(!review.length)throw new Error('Non sono riuscito a identificare prodotti leggibili');
  reviewModal();
 }catch(e){open({title:'Non riesco a leggere la foto',body:'<p class="notice">'+esc(e.message||'Errore di riconoscimento')+'</p><button class="btn full" data-a="new">Inserisci manualmente</button>'})}
}
function detail(name){
 const r=recipeData.find(x=>x[0]===name);if(!r)return;
 open({title:esc(r[0]),body:'<p class="muted">⏱ '+r[2]+' · '+db.people+' persone (adatta le dosi)</p><h3>Ingredienti</h3>'+
 r[3].map(n=>'<div class="card row" style="padding:10px"><span>'+esc(n)+'</span><span style="font-size:12px;color:'+(have(n)?'#478248':'#b16d28')+'">'+(have(n)?'✓ Disponibile':'Da comprare')+'</span></div>').join('')+
 '<h3>Preparazione</h3><ol class="steps">'+r[4].map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol><button class="btn full" data-a="missing" data-v="'+esc(r[0])+'">🛒 Aggiungi ingredienti mancanti alla spesa</button>'});
}
function settings(){
 open({title:'Impostazioni',body:
 '<p class="notice">Prodotti e lista sono salvati solo nel telefono. Non vengono sincronizzati con il vecchio sito. Esporta un backup periodicamente.</p>'+
 '<button class="opt" data-a="export"><span class="sym">📤</span><span><b>Esporta backup</b><small>Salva i prodotti in un file JSON</small></span></button>'+
 '<button class="opt" data-a="import"><span class="sym">📥</span><span><b>Importa backup</b><small>Ripristina da un file JSON</small></span></button>'+
 '<button class="opt" data-a="demo"><span class="sym">🧺</span><span><b>Inserisci prodotti dimostrativi</b><small>Prova l’app con una spesa di esempio</small></span></button>'+
 '<button class="btn red full" data-a="reset">Cancella tutti i dati</button>'});
}
function addItem(p){
 const old=db.items.find(x=>norm(x.name)===norm(p.name)&&x.loc===p.loc&&x.unit===p.unit&&!x.exp);
 if(old&&!p.exp)old.qty=Number(old.qty)+Number(p.qty);
 else db.items.push(Object.assign({id:id()},p));
}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-a]');if(!el)return;
 const act=el.dataset.a,v=el.dataset.v;
 if(act==='close'){close();return}
 if(act==='tab'){page=v;close();render();return}
 if(act==='settings'){settings();return}
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
  let p={id:v||id(),name,qty,loc,unit,exp};
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
  try{const name=await lookupBarcode(code);review=[{name,qty:1,checked:true}];reviewModal()}
  catch(e){open({title:'Prodotto non trovato',body:'<p class="notice">'+esc(e.message)+'</p><button class="btn full" data-a="new">Inserisci manualmente</button>'})}return
 }
 if(act==='reviewSave'){
  const loc=$('#reviewLoc').value;
  let done=0;
  review.forEach((x,i)=>{
   if(!$('[data-review="'+i+'"]').checked)return;
   const name=$('#rvName'+i).value.trim(),qty=Number($('#rvQty'+i).value);
   if(name&&qty>0&&Number.isFinite(qty)){addItem({name,qty,unit:'pz',loc,exp:''});done++}
  });
  close();save();toast(done+' prodotti aggiunti');return
 }
 if(act==='shopAdd'){
  const input=$('#shopName');const name=input.value.trim();if(!name)return;
  db.shop.push({id:id(),name,done:false});save();return
 }
 if(act==='shopToggle'){const p=db.shop.find(x=>x.id===v);if(p){p.done=!p.done;save()}return}
 if(act==='shopRemove'){db.shop=db.shop.filter(x=>x.id!==v);save();return}
 if(act==='bought'){const p=db.shop.find(x=>x.id===v);if(!p)return;db.shop=db.shop.filter(x=>x.id!==v);productForm({id:'',name:p.name,qty:1,unit:'pz',loc:'Dispensa',exp:''});save();return}
 if(act==='missing'){const r=recipeData.find(x=>x[0]===v);if(r)r[3].filter(x=>!have(x)).forEach(n=>{if(!db.shop.some(x=>norm(x.name)===norm(n)))db.shop.push({id:id(),name:n,done:false})});close();save();toast('Lista della spesa aggiornata');return}
 if(act==='export'){
  const data=JSON.stringify({version:1,exportedAt:new Date().toISOString(),items:db.items,shop:db.shop,people:db.people,meal:db.meal},null,2);
  if(window.NativeKitchen&&window.NativeKitchen.exportBackup)window.NativeKitchen.exportBackup(data);
  else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download='la-mia-cucina-backup.json';a.click();URL.revokeObjectURL(a.href)}
  return
 }
 if(act==='import'){$('#backupInput').click();return}
 if(act==='demo'){['Pasta','Passata di pomodoro','Uova','Zucchine','Parmigiano','Riso','Tonno'].forEach(n=>addItem({name:n,qty:2,unit:'pz',loc:/Uova|Zucchine|Parmigiano/.test(n)?'Frigo':'Dispensa',exp:''}));close();save();toast('Prodotti di esempio aggiunti');return}
 if(act==='reset'&&confirm('Cancellare tutta la dispensa e la lista? Salva un backup prima di continuare.')){db=structuredClone(DEFAULT);close();save();return}
});
document.addEventListener('input',e=>{
 if(e.target.id==='inventorySearch'){const pos=e.target.selectionStart;query=e.target.value;render();const i=$('#inventorySearch');if(i){i.focus();i.setSelectionRange(pos,pos)}}
 if(e.target.id==='recipeSearch'){const pos=e.target.selectionStart;recQuery=e.target.value;render();const i=$('#recipeSearch');if(i){i.focus();i.setSelectionRange(pos,pos)}}
});
document.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&e.target.id==='shopName'){e.preventDefault();const name=e.target.value.trim();if(name){db.shop.push({id:id(),name,done:false});save()}}
});
$('#photoCamera').addEventListener('change',e=>{const file=e.target.files&&e.target.files[0];e.target.value='';processPhoto(file)});
$('#photoGallery').addEventListener('change',e=>{const file=e.target.files&&e.target.files[0];e.target.value='';processPhoto(file)});
$('#backupInput').addEventListener('change',async e=>{
 const file=e.target.files&&e.target.files[0];e.target.value='';if(!file)return;
 try{const data=JSON.parse(await file.text());if(!Array.isArray(data.items)||!Array.isArray(data.shop))throw Error('File non compatibile');if(!confirm('Sostituire i dati attuali con quelli del backup?'))return;db=Object.assign({},DEFAULT,data);close();save();toast('Backup importato')}
 catch(err){toast('Backup non valido')}
});
window.nativeGoBack=function(){if(modal){close();return true}if(page!=='home'){page='home';render();return true}return false};
render();
