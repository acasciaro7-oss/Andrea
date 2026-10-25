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
 '<p class="notice">Verifica sempre nome, quantità, scadenza e posizione prima di aggiungere. I dati letti dalle foto possono contenere errori.</p>'+
 review.map((p,i)=>'<div class="card"><div class="row"><label><input type="checkbox" data-review="'+i+'" '+(p.checked?'checked':'')+'> Prodotto '+(i+1)+'</label><span class="pill '+(p.confidence==='alta'?'':'warn')+'">'+esc(p.confidence||'Da verificare')+'</span></div>'+
 '<label class="label">Alimento</label><input class="field" id="rvName'+i+'" value="'+esc(p.name)+'">'+
 '<div class="grid2"><div><label class="label">Quantità</label><input class="field" id="rvQty'+i+'" type="number" min=".1" step=".1" value="'+(Number(p.qty)||1)+'"></div>'+
 '<div><label class="label">Unità</label><select class="field" id="rvUnit'+i+'">'+units.map(x=>'<option '+(x===(p.unit||'pz')?'selected':'')+'>'+x+'</option>').join('')+'</select></div></div>'+
 '<label class="label">Conservazione</label><select class="field" id="rvLoc'+i+'">'+locations.map(x=>'<option '+(x===(p.loc||'Dispensa')?'selected':'')+'>'+x+'</option>').join('')+'</select>'+
 '<label class="label">Scadenza (se leggibile)</label><input class="field" type="date" id="rvExp'+i+'" value="'+esc(p.exp||'')+'">'+
 (p.note?'<p class="muted">'+esc(p.note)+'</p>':'')+'</div>').join('')+
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
 if(!/^\d{8,14}$/.test(code))throw new Error('Inserisci da 8 a 14 cifre');
 const res=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_it,quantity');
 if(!res.ok)throw new Error('Catalogo momentaneamente non disponibile');
 const data=await res.json();
 if(!data.product)throw new Error('Prodotto non trovato: inseriscilo manualmente');
 return (data.product.product_name_it||data.product.product_name||'').trim();
}
function waiting(text){open({title:'Sto leggendo la foto',body:'<div class="notice" id="readStatus">'+esc(text)+'</div><p class="muted">L’operazione dipende dalla qualità della foto e dalla connessione.</p>'})}

const FOOD_NAMES=[
 ['ravioli','Ravioli'],['tortellini','Tortellini'],['cappelletti','Cappelletti'],['gnocchi','Gnocchi'],
 ['lasagne','Lasagne'],['pasta','Pasta'],['spaghetti','Spaghetti'],['penne','Penne'],['riso','Riso'],
 ['latte','Latte'],['yogurt','Yogurt'],['mozzarella','Mozzarella'],['ricotta','Ricotta'],['parmigiano','Parmigiano'],
 ['prosciutto','Prosciutto'],['salmone','Salmone'],['tonno','Tonno'],['pollo','Pollo'],['uova','Uova'],
 ['formaggio','Formaggio'],['burro','Burro'],['pane','Pane'],['biscotti','Biscotti'],
 ['zucchine','Zucchine'],['pomodori','Pomodori'],['patate','Patate'],['spinaci','Spinaci'],
 ['minestrone','Minestrone'],['hamburger','Hamburger'],['pizza','Pizza'],['fagioli','Fagioli'],
 ['passata','Passata'],['pesto','Pesto'],['focaccia','Focaccia'],['farina','Farina'],
 ['insalata','Insalata'],['panna','Panna'],['mais','Mais'],['carote','Carote'],['olio','Olio'],
 ['gelato','Gelato'],['piselli','Piselli'],['mortadella','Mortadella'],['guanciale','Guanciale']
];
function levenshtein(a,b){
 if(Math.abs(a.length-b.length)>2)return 4;
 let v=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=0;i<a.length;i++){
  let nxt=[i+1];for(let j=0;j<b.length;j++)nxt.push(Math.min(nxt[j]+1,v[j+1]+1,v[j]+(a[i]===b[j]?0:1)));
  v=nxt;
 }return v[b.length];
}
function detectTerm(text){
 const words=norm(text).split(' ').filter(Boolean);
 let best=null;
 for(const [word,label] of FOOD_NAMES){
  let hit=-1,dist=9;
  for(let i=0;i<words.length;i++){
   const w=words[i],d=levenshtein(w,word);
   const permitted=word.length>=7?2:word.length>=5?1:0;
   if(d<=permitted&&d<dist){dist=d;hit=i}
  }
  if(hit>=0){
   const score=(dist===0?8:5)-(hit*.07);
   if(!best||score>best.score)best={word,label,score};
  }
 }return best;
}
function safeDate(day,month,year){
 day=Number(day);month=Number(month);year=Number(year);
 if(year<100)year+=2000;
 if(year<2020||year>2040||month<1||month>12||day<1||day>31)return '';
 const d=new Date(Date.UTC(year,month-1,day));
 return d.getUTCDate()===day&&d.getUTCMonth()===month-1?
  String(year)+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0'):'';
}
function findExpiration(text){
 const all=[];
 const re=/\b([0-3]?\d)[/.:\-]([01]?\d)[/.:\-]((?:20)?\d\d)\b/g;
 let m;while((m=re.exec(text))!==null){
  const date=safeDate(m[1],m[2],m[3]);if(!date)continue;
  const context=norm(text.slice(Math.max(0,m.index-130),m.index));
  let weight=0;
  if(/consumare\s+entro|scadenza|scad[ea]|best before|use by/.test(context.slice(-75)))weight+=10;
  if(/prodotto\s+il|confezionat|lotto/.test(context.slice(-75)))weight-=6;
  all.push({date,weight,position:m.index});
 }
 if(!all.length)return '';
 all.sort((a,b)=>b.weight-a.weight||b.position-a.position);
 return all[0].date;
}
function normalizeOCRText(text){
 return String(text||'').replace(/[|¦]/g,'I').replace(/[^\S\r\n]+/g,' ').split(/\r?\n/)
 .map(x=>x.trim()).filter(x=>x.length>1&&x.length<130).join('\n');
}
function parsePhotoProduct(text){
 const raw=normalizeOCRText(text),lines=raw.split('\n'),top=lines.slice(0,22);
 const candidates=top.map((line,i)=>{
  const match=detectTerm(line);
  return match?{line,i,match,score:match.score-i*.35}:null
 }).filter(Boolean).sort((a,b)=>b.score-a.score);
 if(!candidates.length)return [];
 const best=candidates[0],kind=best.match.label;
 const all=norm(raw),has=word=>new RegExp('\\b'+word+'\\b').test(all);
 let title=kind;
 if(kind==='Ravioli'&&has('zucca'))title='Ravioli ripieni alla zucca';
 else if(kind==='Tortellini'&&has('prosciutto'))title='Tortellini al prosciutto';
 else if(/ravioli|tortellini|cappelletti|gnocchi/i.test(kind)){
  const remainder=best.line.replace(new RegExp(best.match.word,'i'),'').trim();
  if(remainder&&remainder.length<=26&&!/\d/.test(remainder))title=kind+' '+remainder.toLowerCase();
 }
 if(kind==='Passata'&&has('pomodoro'))title='Passata di pomodoro';
 const brand=/esselung[a4]/i.test(raw)?'Esselunga':/barill[a4]/i.test(raw)?'Barilla':
 /mulino\s*bianco/i.test(raw)?'Mulino Bianco':/galban[i1]/i.test(raw)?'Galbani':'';
 const name=brand?brand+' · '+title:title;
 const chilled=/ravioli|tortellini|pasta\s*fresca|mozzarella|ricotta|formaggio|latte|yogurt|burro|pollo|prosciutto/i.test(raw)?
  'Frigo':'Dispensa';
 const loc=/surgelat|congelat|freezer/i.test(raw)?'Freezer':chilled;
 return [{name,qty:1,unit:'confezioni',loc,exp:findExpiration(raw),checked:true,
  confidence:best.match.score>=8?'media':'bassa',
  note:'Risultato automatico gratuito: controlla soprattutto nome, quantità e scadenza.'}];
}
function parseReceipt(text){
 const lines=normalizeOCRText(text).split('\n');
 const banned=/\b(totale|subtotale|resto|iva|pagamento|scontrino|documento|bancomat|contante|carta|acquisto|grazie|numero|operatore|cassa|sconto|reparto|imponibile|credito|punti|codice|partita|transazione|arrotondamento|fiscale|eur|cash|visa|mastercard)\b/i;
 const found=[],seen=new Set();
 for(const raw of lines){
  if(banned.test(raw)||/^\d{2}[/.:]\d{2}[/.:]\d{2,4}/.test(raw))continue;
  const name=raw.replace(/^\s*(?:\d{1,3}\s*[x×]\s*)?/i,'').replace(/\s+(?:€\s*)?\d{1,4}[,.]\d\d\s*[A-Z]?\s*$/,'').replace(/^\d{10,14}\s*/,'').trim();
  if(name.length<4||name.length>65||!/[a-zàèìòù]{3}/i.test(name)||/^[\d\s.,€%-]+$/.test(name))continue;
  const m=detectTerm(name);
  if(!m)continue;
  const key=norm(name);if(seen.has(key))continue;seen.add(key);
  found.push({name,qty:1,unit:'confezioni',loc:/latte|uova|mozzarella|ravioli|fresca|yogurt|burro|salmone|prosciutto/i.test(name)?'Frigo':'Dispensa',exp:'',checked:true,confidence:'bassa',
   note:'Nome da scontrino: conferma che sia un alimento effettivamente acquistato.'});
 }
 return found.slice(0,30);
}
function makeOcrCanvas(img,options){
 const width=img.naturalWidth,height=img.naturalHeight;
 const canvas=document.createElement('canvas');
 const cropY=options.crop?Math.round(height*.02):0,cropH=options.crop?Math.round(height*.70):height;
 const scale=Math.min(2,2000/Math.max(width,cropH));
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
async function recognizePhotoOffline(file,worker){
 const url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('Immagine illeggibile'));img.src=url});
  const canvas=makeOcrCanvas(img,{crop:scanType==='prodotto',boost:true});
  const first=await worker.recognize(canvas);let full=String(first.data&&first.data.text||'');
  let candidates=scanType==='prodotto'?parsePhotoProduct(full):parseReceipt(full);
  if(!candidates.length||scanType==='prodotto'&&!findExpiration(full)){
    if($('#readStatus'))$('#readStatus').textContent='Controllo dettagli e scadenza…';
    const second=await worker.recognize(makeOcrCanvas(img,{crop:false,boost:false}));
    const extra=String(second.data&&second.data.text||'');
    full+='\n'+extra;
    candidates=scanType==='prodotto'?parsePhotoProduct(full):parseReceipt(full);
  }
  return candidates;
 }finally{URL.revokeObjectURL(url)}
}
async function processPhoto(file){
 if(!file)return;
 waiting('Lettura gratuita della foto in corso…');
 try{
  if(scanType==='prodotto'&&typeof BarcodeDetector!=='undefined'&&typeof createImageBitmap==='function'){
   try{
    const bitmap=await createImageBitmap(file),detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});
    const found=await detector.detect(bitmap);bitmap.close();
    if(found.length){
     const name=await lookupBarcode(found[0].rawValue);
     if(name){review=[{name,qty:1,unit:'confezioni',loc:'Dispensa',exp:'',checked:true,confidence:'media',note:'Controlla il nome e la conservazione.'}];reviewModal();return}
    }
   }catch(e){}
  }
  const worker=await getLocalOcrWorker();
  review=await recognizePhotoOffline(file,worker);
  if(!review.length)throw Error('Testo non riconosciuto con sufficiente affidabilità. Scatta la foto più vicino al nome del prodotto, con buona luce, oppure inseriscilo manualmente.');
  reviewModal();
 }catch(err){
  open({title:'La foto non è stata riconosciuta',body:'<p class="notice">'+esc(err.message||'Errore nella lettura')+'</p>'+
   '<button class="btn full" data-a="scanMenu">Riprova con un’altra foto</button><div style="height:10px"></div>'+
   '<button class="btn white full" data-a="new">Inserisci manualmente</button>'});
 }
}
function detail(name){
 const r=recipeData.find(x=>x[0]===name);if(!r)return;
 open({title:esc(r[0]),body:'<p class="muted">⏱ '+r[2]+' · '+db.people+' persone (adatta le dosi)</p><h3>Ingredienti</h3>'+
 r[3].map(n=>'<div class="card row" style="padding:10px"><span>'+esc(n)+'</span><span style="font-size:12px;color:'+(have(n)?'#478248':'#b16d28')+'">'+(have(n)?'✓ Disponibile':'Da comprare')+'</span></div>').join('')+
 '<h3>Preparazione</h3><ol class="steps">'+r[4].map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol><button class="btn full" data-a="missing" data-v="'+esc(r[0])+'">🛒 Aggiungi ingredienti mancanti alla spesa</button>'});
}
function settings(){
 open({title:'Impostazioni',body:
 '<p class="notice">La mia cucina usa solo strumenti gratuiti. Le foto vengono lette localmente con OCR open source (qualità variabile); i codici a barre vengono cercati in Open Food Facts. Non utilizziamo GPT né servizi a pagamento.</p>'+
 '<p class="notice">Dispensa e lista sono salvate nel telefono. Fai periodicamente il backup prima di cambiare dispositivo.</p>'+
 '<button class="opt" data-a="export"><span class="sym">📤</span><span><b>Esporta backup</b><small>Salva i prodotti in un file JSON</small></span></button>'+
 '<button class="opt" data-a="import"><span class="sym">📥</span><span><b>Importa backup</b><small>Ripristina un file JSON</small></span></button>'+
 '<button class="opt" data-a="demo"><span class="sym">🧺</span><span><b>Prodotti dimostrativi</b><small>Prova con una spesa di esempio</small></span></button>'+
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
  let done=0;
  review.forEach((x,i)=>{
   const checkbox=$('[data-review="'+i+'"]');if(!checkbox||!checkbox.checked)return;
   const name=$('#rvName'+i).value.trim(),qty=Number($('#rvQty'+i).value);
   const unit=$('#rvUnit'+i).value,loc=$('#rvLoc'+i).value,exp=$('#rvExp'+i).value;
   if(name&&qty>0&&Number.isFinite(qty)){addItem({name,qty,unit,loc,exp});done++}
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
