'use strict';
const Food=(()=>{
 const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 const localDate=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 const aliases={
  pasta:['pasta','spaghetti','penne','fusilli','rigatoni','linguine','tagliatelle','farfalle','tortiglioni'],
  pomodori:['pomodori','pomodoro','pomodorini'],pomodorini:['pomodorini','pomodori ciliegini','datterini'],
  zucchine:['zucchine','zucchina'],melanzane:['melanzane','melanzana'],peperoni:['peperoni','peperone'],
  patate:['patate','patata'],carote:['carote','carota'],banane:['banana','banane'],mele:['mela','mele'],pere:['pera','pere'],
  uova:['uova','uovo'],cipolla:['cipolla','cipolle'],limone:['limone','limoni'],arance:['arance','arancia'],
  'prosciutto cotto':['prosciutto cotto','cotto a fette','cotto cubetti'],
  formaggio:['formaggio','fontina','emmental','gouda','scamorza'],
  'fiocchi di avena':['fiocchi di avena','fiocchi avena','avena in fiocchi'],
  'passata di pomodoro':['passata di pomodoro','passata pomodoro','passata'],
  'fagioli cannellini':['fagioli cannellini','cannellini'], 'fagioli borlotti':['fagioli borlotti','borlotti'],
  'frutti di bosco':['frutti di bosco','frutti bosco'],olio:['olio','olio extravergine','olio oliva'],
  'riso integrale':['riso integrale'], 'ricotta salata':['ricotta salata'],
  'cioccolato fondente':['cioccolato fondente','cioccolata fondente']
 };
 const contains=(text,part)=>(' '+text+' ').includes(' '+part+' ');
 function matches(ingredient,product){
  const a=norm(ingredient),b=norm(product);if(!a||!b)return false;
  if(a==='latte'&&/cocco|mandorla|mandorle|avena|soia|riso|condensato/.test(b))return false;
  if(['pomodori','pomodorini'].includes(a)&&/passata|pelati|concentrato|sugo|salsa/.test(b))return false;
  if(a==='pasta'&&/sugo|salsa|sfoglia|brise|frolla|pasta fresca ripiena/.test(b))return false;
  if(['ceci','riso','mandorle','avena','mais'].includes(a)&&/farina|bevanda|crema|hummus/.test(b))return false;
  if(a==='ricotta'&&contains(b,'salata'))return false;
  if(a==='formaggio'&&/spalmabile|mozzarella|parmigiano|ricotta|cream cheese/.test(b))return false;
  if(a==='pane'&&/pangrattato|pane grattugiato/.test(b))return false;
  return (aliases[a]||[a]).some(x=>contains(b,x));
 }
 function productMatches(ingredient,p){
  if(p.ingredientKey){const a=norm(ingredient),b=norm(p.ingredientKey);if(a===b)return true;return matches(ingredient,p.ingredientKey)}
  return matches(ingredient,p.name);
 }
 function portions(text){const m=String(text||'').replace(/,/g,'.').match(/\b(\d{1,3})\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/i);if(!m||Number(m[1])<1)return null;const each=packageSize(m[2]+' '+m[3]);return each?{count:Number(m[1]),qty:each.qty,unit:each.unit,label:'porzioni'}:null}
 const basics=new Set(['olio','sale','pepe','acqua']);
 function available(name,items){return basics.has(norm(name))||items.some(p=>Number(p.qty)>0&&(!p.exp||p.exp>=localDate())&&productMatches(name,p))}
 function days(date){if(!/^\d{4}-\d\d-\d\d$/.test(date||''))return null;const now=new Date(localDate()+'T12:00:00');return Math.round((new Date(date+'T12:00:00')-now)/86400000)}
 function numeric(v,max=1000){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)&&n>=0&&n<=max?n:null}
 const nutrientKeys=['kcal','protein','carbs','fat','sugars','fiber','salt'];
 function cleanNutrition(data){
  if(!data||typeof data!=='object')return null;
  const out={basis:data.basis==='ml'?'ml':'g',source:String(data.source||'Inserimento manuale').slice(0,100)};
  nutrientKeys.forEach(k=>out[k]=numeric(data[k],k==='kcal'?1000:100));
  return nutrientKeys.some(k=>out[k]!==null)?out:null;
 }
 function fromOFF(p){
  if(!p||p.no_nutrition_data)return null;const n=p.nutriments||{};
  let kcal=numeric(n['energy-kcal_100g']);if(kcal===null){const kj=numeric(n.energy_100g,5000);if(kj!==null)kcal=Math.round(kj/4.184)}
  return cleanNutrition({basis:p.product_quantity_unit==='ml'||(packageSize(p.quantity)||{}).unit==='ml'?'ml':'g',source:'Open Food Facts',kcal,
   protein:n.proteins_100g,carbs:n.carbohydrates_100g,fat:n.fat_100g,sugars:n.sugars_100g,fiber:n.fiber_100g,salt:n.salt_100g});
 }
 function portion(n,amount,unit){
  n=cleanNutrition(n);if(!n||!(amount>0)||unit!==n.basis)return null;
  const out={};nutrientKeys.forEach(k=>out[k]=n[k]===null?null:Math.round(n[k]*amount/100*10)/10);return out;
 }
 function packageSize(text){
  const s=String(text||'').replace(/,/g,'.');const m=s.match(/(?:\b(\d{1,2})\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(kg|ml|cl|g|l)\b/i);
  if(!m){const pieces=s.match(/\b(\d{1,3})\s*(?:pz|pezzi)\b/i);return pieces?{qty:Number(pieces[1]),unit:'pz'}:null}const multiplier=Number(m[1]||1),q=Number(m[2]),u=m[3].toLowerCase();
  const qty=q*multiplier*(u==='kg'||u==='l'?1000:u==='cl'?10:1);if(!(qty>0&&qty<=100000))return null;
  return {qty,unit:['ml','cl','l'].includes(u)?'ml':'g'};
 }
 return {norm,matches,productMatches,portions,available,days,localDate,numeric,cleanNutrition,fromOFF,portion,packageSize,nutrientKeys};
})();

