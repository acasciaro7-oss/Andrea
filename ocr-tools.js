'use strict';
const OCR=(()=>{
 const norm=Food.norm;
 const words=[...new Set(RECIPE_CATALOG.flatMap(r=>r.ingredients.map(i=>i.name)).concat(['Ravioli','Tortellini','Cappelletti','Spaghetti','Penne','Lasagne','Biscotti','Yogurt','Latte','Pizza','Pane','Gelato','Mortadella','Prosciutto','Farina','Minestrone']))];
 const vocab=words.map(label=>({label,term:norm(label)})).sort((a,b)=>b.term.length-a.term.length);
 function distance(a,b){if(Math.abs(a.length-b.length)>1)return 2;const v=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=v[0];v[0]=i;for(let j=1;j<=b.length;j++){const old=v[j];v[j]=Math.min(v[j]+1,v[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return v[b.length]}
 function detect(text){
  const n=norm(text);for(const x of vocab)if((' '+n+' ').includes(' '+x.term+' '))return {...x,exact:true};
  const tokens=n.split(' ');for(const x of vocab){if(x.term.includes(' ')||x.term.length<6)continue;if(tokens.some(t=>distance(t,x.term)<=1))return {...x,exact:false}}return null;
 }
 function location(text){const n=norm(text);if(/latte/.test(n)&&/uht|lunga conservazione/.test(n))return 'Dispensa';return /surgelat|congelat|freezer/.test(n)?'Freezer':/latte|yogurt|mozzarella|ricotta|formaggio|pollo|tacchino|salmone|merluzzo|carne|prosciutto|ravioli|tortellini|pasta fresca|burro|scamorza/.test(n)?'Frigo':'Dispensa'}
 function lines(text){return String(text||'').replace(/[¦]/g,'I').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean)}
 function expiration(text){
  const s=String(text||''),out=[];let m;const re=/\b([0-3]?\d)[/.-]([01]?\d)[/.-]((?:20)?\d\d)\b/g;
  while((m=re.exec(s))){const y=Number(m[3])<100?2000+Number(m[3]):Number(m[3]),mo=Number(m[2]),d=Number(m[1]),date=new Date(Date.UTC(y,mo-1,d));
   if(date.getUTCDate()!==d||date.getUTCMonth()!==mo-1||y<2020||y>2040)continue;
   const before=norm(s.slice(Math.max(0,m.index-90),m.index));
   if(/prodotto il|confezionat|data acquisto|emissione|lotto/.test(before.slice(-45)))continue;
   if(!/consumare|scad|best before|use by|entro/.test(before))continue;
   out.push(y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0'));
  }return out[0]||'';
 }
 function nutrition(text){
  const rows=lines(text),header=rows.find(x=>/100\s*(?:g|ml)\b/i.test(x));if(!header)return null;
  const n={basis:/100\s*ml/i.test(header)?'ml':'g',source:'Etichetta letta da foto: da verificare'};
  const labels={protein:/\bproteine\b/i,carbs:/carboidrati/i,fat:/^\s*(?:grassi|lipidi)\b/i,sugars:/zuccheri/i,fiber:/fibr[ae]/i,salt:/\bsale\b/i};
  for(let idx=0;idx<rows.length;idx++){
   const row=rows[idx],energy=row.match(/(\d+(?:[,.]\d+)?)\s*kcal\b/i);if(energy)n.kcal=Number(energy[1].replace(',','.'));
   for(const [key,label] of Object.entries(labels)){if(!label.test(row))continue;
    const part=row.replace(/^.*?(?:proteine|carboidrati|grassi|lipidi|zuccheri|fibr[ae]|sale)\b/i,'');
    const values=part.match(/\d+(?:[,.]\d+)?/g);
    // Read only explicit same-row values; do not infer missing columns or zeros.
    if(values&&values.length)n[key]=Number(values[0].replace(',','.'));
   }
  }
  return Food.cleanNutrition(n);
 }
 function product(text){
  const rows=lines(text),reject=/valori nutrizionali|carboidrati|proteine|grassi|di cui|ingredienti\b|conservare|consumare|scadenza|100\s*g|100\s*ml/i;
  const candidates=rows.map((line,index)=>({line,index,match:detect(line)})).filter(x=>x.match&&!reject.test(x.line));
  candidates.sort((a,b)=>(b.match.exact?10:0)-(a.match.exact?10:0)+a.index*.1-b.index*.1);
  if(!candidates.length)return [];
  const best=candidates[0];let name=best.line.replace(/\b\d+(?:[,.]\d+)?\s*(?:kg|ml|cl|g|l)\b/ig,'').replace(/\s+/g,' ').trim();
  if(name.length<4||name.length>90)name=best.match.label;
  const packRows=rows.filter(x=>!reject.test(x)&&!/energia|kcal|zuccheri|fibre|sale\b/i.test(x)).join('\n');
  return [{name,qty:1,unit:'confezioni',loc:/surgelat|congelat|freezer/i.test(text)?'Freezer':/conservare.{0,20}frigorifero/i.test(text)?'Frigo':location(name),exp:expiration(text),packageSize:Food.packageSize(packRows),nutrition:nutrition(text),checked:true,confidence:best.match.exact?'media':'bassa',note:'Testo letto sul telefono. Verifica nome, contenuto, conservazione, scadenza e valori nutrizionali prima di confermare.'}];
 }
 function receipt(text){
  const banned=/\b(totale|tot\.?|subtotale|resto|iva|pagamento|scontrino|documento|bancomat|contante|carta|grazie|operatore|cassa|sconto|imponibile|credito|punti|partita|transazione|arrotondamento|fiscale|visa|mastercard|telefono|tel|eur|euro)\b/i;
  const rawProducts=[];
  for(const raw of lines(text)){
   const previous=rawProducts[rawProducts.length-1];
   const weight=raw.match(/^\s*(\d+(?:[,.]\d+)?)\s*(kg|g)\s*[x×]/i);
   if(weight&&previous){previous.qty=Number(weight[1].replace(',','.'));previous.unit=weight[2].toLowerCase();continue;}
   const countLine=raw.match(/^\s*(\d{1,2})\s*[x×]\s*(?:€\s*)?\d+[,.]\d{2}(?:\s|$)/i);
   if(countLine&&previous){previous.qty=Number(countLine[1]);continue;}
   if(banned.test(raw)||raw.length>110||/^\d\d[/.-]\d\d[/.-]\d{2,4}/.test(raw))continue;
   const prefix=raw.match(/^\s*(\d{1,2})\s*[x×]\s*/i),suffix=raw.match(/\s+(\d{1,2})\s*[x×]\s*\d+[,.]\d{2}(?:\s|$)/i);
   const count=prefix?Number(prefix[1]):suffix?Number(suffix[1]):1;
   let cleaned=raw.replace(/^\s*\d{1,2}\s*[x×]\s*/i,'');
   if(suffix)cleaned=cleaned.slice(0,suffix.index);
   const name=cleaned.replace(/^\d{8,14}\s+/,'').replace(/\s+(?:€\s*)?\d{1,4}[,.]\d{2}\s*[A-Z]?\s*$/,'').replace(/\s+€\s*$/,'').trim();
   if(name.length<4||name.length>85||!/[a-zàèéìòù]{3}/i.test(name)||/^[\d\s.,€%-]+$/.test(name)||count<=0)continue;
   const match=detect(name);if(!match&&!/\d[,.]\d{2}/.test(raw))continue;
   rawProducts.push({name,qty:count,unit:'confezioni',loc:location(name),exp:'',packageSize:Food.packageSize(name),nutrition:null,checked:!!match,confidence:match&&match.exact?'media':'bassa',note:match?'Controlla descrizione e quantità lette dallo scontrino. La scadenza non viene ricavata dalla data di acquisto.':'Voce non riconosciuta: selezionala solo se è un alimento acquistato.'});
  }
  const seen=new Map();for(const p of rawProducts){const key=norm(p.name)+'|'+p.unit+'|'+JSON.stringify(p.packageSize);if(seen.has(key))seen.get(key).qty=Kitchen.rounded(seen.get(key).qty+p.qty);else seen.set(key,p)}
  return [...seen.values()].slice(0,120);
 }

 return {detect,location,expiration,nutrition,product,receipt};
})();

const nativeOcrPending=new Map();
window.onNativeOcr=(requestId,text,error)=>{const pending=nativeOcrPending.get(requestId);if(!pending)return;clearTimeout(pending.timeout);nativeOcrPending.delete(requestId);error?pending.reject(Error(error)):pending.resolve(text)};
function requestNativeOcr(canvas){return new Promise((resolve,reject)=>{const requestId='ocr_'+Date.now()+'_'+Math.random().toString(36).slice(2);const timeout=setTimeout(()=>{nativeOcrPending.delete(requestId);reject(Error('Il lettore non risponde. Riprova con una foto più piccola.'))},45000);nativeOcrPending.set(requestId,{resolve,reject,timeout});try{window.NativeKitchen.recognizeImage(canvas.toDataURL('image/jpeg',.9).split(',')[1],requestId)}catch(error){clearTimeout(timeout);nativeOcrPending.delete(requestId);reject(error)}})}

