'use strict';
/* Dates are proposals from printed text. Missing years/days are never invented. */
const Expiry=(()=>{
 const months={gen:1,gennaio:1,jan:1,january:1,feb:2,febbraio:2,february:2,mar:3,marzo:3,march:3,apr:4,aprile:4,april:4,mag:5,maggio:5,may:5,giu:6,giugno:6,jun:6,june:6,lug:7,luglio:7,jul:7,july:7,ago:8,agosto:8,aug:8,august:8,set:9,sett:9,settembre:9,sep:9,sept:9,september:9,ott:10,ottobre:10,oct:10,october:10,nov:11,novembre:11,november:11,dic:12,dicembre:12,dec:12,december:12};
 const number=s=>Number(String(s).replace(/[Oo]/g,'0').replace(/[IiLl]/g,'1'));
 function candidates(text){
  const s=String(text||'').slice(0,30000),out=[],occupied=[];
  function add(match,day,month,year){
   const start=match.index,end=start+match[0].length;if(occupied.some(([a,b])=>start<b&&end>a))return;occupied.push([start,end]);
   const before=Food.norm(s.slice(Math.max(0,start-110),start)),after=Food.norm(s.slice(end,end+25));
   const positive=[...before.matchAll(/consumare|scad(?:enza|e)?|best before|use by|entro|\bexp\b|\bbbe\b/g)].at(-1);
   const negative=[...before.matchAll(/prodotto il|produzione|confezionat|data acquisto|emissione|scontrino|documento|manufactur|\bmfg\b|\bpacked\b/g)].at(-1);
   if(negative&&(!positive||negative.index>positive.index))return;
   if(!positive&&/prodotto il|produzione|confezionat|manufactur/.test(after))return;
   const labelled=!!positive||/^(?:scad|exp|best before|use by)/.test(after);
   const d=day===null?null:number(day),m=number(month),y=year===null?null:(String(year).length===2?2000+number(year):number(year));
   if(m<1||m>12||y!==null&&(y<2020||y>2099)||d!==null&&(d<1||d>31))return;
   if(d!==null){const date=new Date(Date.UTC(y===null?2000:y,m-1,d));if(date.getUTCDate()!==d||date.getUTCMonth()!==m-1)return;}
   if(d===null&&!labelled)return;
   const date=y!==null&&d!==null?String(y)+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'):'';
   const key=date||[d,m,y].join('-');if(out.some(x=>x.key===key))return;
   out.push({key,date,day:d,month:m,year:y,raw:match[0].trim(),labelled,complete:!!date});
  }
  // Year-first before day-first; accept OCR O/0 and I/1 only inside numeric dates.
  const digit='[0-9OoIiLl]';let match;
  const iso=new RegExp('\\b((?:20|2[Oo])'+digit+'{2})\\s*[-/.]\\s*('+digit+'{1,2})\\s*[-/.]\\s*('+digit+'{1,2})(?![a-zA-Z0-9])','g');
  while((match=iso.exec(s)))add(match,match[3],match[2],match[1]);
  const full=new RegExp('\\b('+digit+'{1,2})\\s*[/.-]\\s*('+digit+'{1,2})\\s*[/.-]\\s*('+digit+'{4}|'+digit+'{2})(?![a-zA-Z0-9])','g');
  while((match=full.exec(s)))add(match,match[1],match[2],match[3]);
  const spaced=new RegExp('\\b('+digit+'{1,2})[ \\t]+('+digit+'{1,2})[ \\t]+((?:20|2[Oo])'+digit+'{2})(?![a-zA-Z0-9])','g');
  while((match=spaced.exec(s)))add(match,match[1],match[2],match[3]);
  const named=/\b(\d{1,2})[\s./-]+([a-zA-Z]+)[\s./-]+(20\d{2}|\d{2})\b/g;
  while((match=named.exec(s))){const m=months[match[2].toLowerCase()];if(m)add(match,match[1],m,match[3]);}
  const partial=new RegExp('\\b('+digit+'{1,2})\\s*[/.-]\\s*('+digit+'{1,2})(?![a-zA-Z0-9/.-])','g');
  while((match=partial.exec(s)))add(match,match[1],match[2],null);
  const monthYear=/\b(0?[1-9]|1[0-2])\s*[/.-]\s*(20\d{2})\b/g;
  while((match=monthYear.exec(s)))add(match,null,match[1],match[2]);
  return out.sort((a,b)=>Number(b.labelled)-Number(a.labelled)||Number(b.complete)-Number(a.complete));
 }
 function automatic(text){const all=candidates(text),certain=all.filter(x=>x.labelled&&x.complete);return certain.length===1?certain[0].date:''}
 return {candidates,automatic};
})();

function expiryControls(target,text=''){
 return '<div class="expiry-reader"><button class="btn small white" data-a="expiryCamera" data-target="'+esc(target)+'">📸 Leggi scadenza</button> <button class="btn small white" data-a="expiryGallery" data-target="'+esc(target)+'">Da foto</button><small class="diary-meta">Fotografa da vicino la data stampata, anche sul fondo o sul coperchio. La data resta da confermare.</small><div id="expiryResult_'+esc(target)+'">'+expiryChoices(target,Expiry.candidates(text))+'</div></div>';
}
function expiryChoices(target,candidates){
 if(!candidates.length)return '';
 return '<p class="muted">Date lette: scegli quella di scadenza.</p>'+candidates.map((x,i)=>x.complete?'<button class="btn small alt" data-a="expiryChoose" data-target="'+esc(target)+'" data-date="'+x.date+'">'+esc(x.raw)+' · '+(x.labelled?'scadenza indicata':'da verificare')+'</button>':'<label class="label" for="expiryManual_'+target+'_'+i+'">'+esc(x.raw)+' · '+(x.year===null?'anno non indicato':'giorno non indicato')+'</label><input type="date" class="field" id="expiryManual_'+target+'_'+i+'"><button class="btn small white" data-a="expiryManual" data-target="'+esc(target)+'" data-input="expiryManual_'+target+'_'+i+'">Conferma data completa</button>').join(' ');
}
let expiryPhotoContext=null,expiryReading=false;
async function readExpiryPhoto(file,context=expiryPhotoContext){
 if(!file||!context||!context.input.isConnected)return;if(expiryReading){toast('Una scadenza è già in lettura');return}expiryReading=true;
 const result=context.result;result.textContent='Leggo la data stampata…';const url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('Immagine illeggibile'));img.src=url});
  const native=window.NativeKitchen&&typeof window.NativeKitchen.recognizeImage==='function',worker=native?null:await getLocalOcrWorker();
  if(worker)await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});
  const read=async canvas=>native?requestNativeOcr(canvas):String((await worker.recognize(canvas)).data.text||'');
  let text=await read(makeOcrCanvas(img,{crop:false,boost:false,maxWidth:3000,maxHeight:3000})),found=Expiry.candidates(text);
  if(!found.some(x=>x.complete)){text+='\n'+await read(makeOcrCanvas(img,{crop:false,boost:true,maxWidth:3000,maxHeight:3000}));found=Expiry.candidates(text);}
  if(!context.input.isConnected)return;
  result.innerHTML=found.length?expiryChoices(context.input.id,found):'<p class="notice">Nessuna data leggibile. Avvicina la fotocamera alla stampa, evita riflessi oppure inseriscila a mano. Nessuna data è stata modificata.</p>';
 }catch(error){if(context.input.isConnected)result.textContent='Lettura non riuscita: '+error.message+'. La data precedente è conservata.'}
 finally{URL.revokeObjectURL(url);expiryReading=false;}
}
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a;if(!['expiryCamera','expiryGallery','expiryChoose','expiryManual'].includes(a))return;
 e.preventDefault();e.stopImmediatePropagation();const input=document.getElementById(el.dataset.target);if(!input)return;
 if(a==='expiryChoose'||a==='expiryManual'){
  const date=a==='expiryChoose'?el.dataset.date:document.getElementById(el.dataset.input)?.value;
  if(!date||!Kitchen.validDate(date)){toast('Completa e controlla la data');return}
  input.value=date;document.getElementById('expiryResult_'+input.id).innerHTML='<p class="muted">Data confermata: '+esc(date)+'. Salva il prodotto per conservarla.</p>';return;
 }
 expiryPhotoContext={input,result:document.getElementById('expiryResult_'+input.id)};document.getElementById(a==='expiryCamera'?'expiryCameraInput':'expiryGalleryInput').click();
},true);
for(const inputId of ['expiryCameraInput','expiryGalleryInput'])document.getElementById(inputId)?.addEventListener('change',e=>{const file=e.target.files&&e.target.files[0];e.target.value='';readExpiryPhoto(file,expiryPhotoContext)});

document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-a="refreshCatalog"]');if(!button)return;e.preventDefault();e.stopImmediatePropagation();
 const input=document.getElementById('prodName'),location=document.getElementById('prodLoc'),code=document.getElementById('prodBarcode')?.value.trim()||button.dataset.v;
 if(!Kitchen.barcode(code)){toast('Controlla le cifre del barcode');return}
 const previousName=input.value,previousLocation=location.value;button.disabled=true;
 try{
  const product=await lookupBarcode(code,{refresh:true});if(!input.isConnected)return;
  if(input.value!==previousName||location.value!==previousLocation){toast('I campi sono cambiati durante la ricerca: ripeti l’aggiornamento');return}
  for(const [field,value] of [['prodIngredient',product.ingredientKey],['prodImage',product.imageUrl]]){const node=document.getElementById(field);if(node&&value)node.value=value}
  if(product.portionSize&&!document.getElementById('prodPortions').value){document.getElementById('prodPortions').value=product.portionSize.count;document.getElementById('prodEach').value=product.portionSize.qty;document.getElementById('prodEachUnit').value=product.portionSize.unit;}
  input.value=product.name;if(!product.loc&&!location.querySelector('option[value=""]'))location.insertAdjacentHTML('afterbegin','<option value="">Scegli dove conservarlo</option>');location.value=product.loc;
  toast('Nome e conservazione riletti. Quantità e scadenza sono conservate: controlla e salva.');
 }catch(error){toast(error.message)}finally{if(button.isConnected)button.disabled=false}
},true);
