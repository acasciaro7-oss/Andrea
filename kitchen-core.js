'use strict';
/* Pure inventory calculations shared by Android and the web build. */
const Kitchen=(()=>{
 const packUnits=new Set(['confezioni','bottiglie']);
 const rounded=n=>Math.round((n+Number.EPSILON)*10000)/10000;
 function measure(qty,unit,pack){
  const q=Number(qty);if(!Number.isFinite(q)||q<0)return null;
  if(unit==='kg')return {qty:rounded(q*1000),unit:'g'};
  if(unit==='L'||unit==='l')return {qty:rounded(q*1000),unit:'ml'};
  if(['g','ml','pz'].includes(unit))return {qty:q,unit};
  if(packUnits.has(unit)&&pack&&Number(pack.qty)>0&&['g','ml','pz'].includes(pack.unit))return {qty:rounded(q*pack.qty),unit:pack.unit};
  return null;
 }
 function stock(p){return measure(p.qty,p.unit,p.packageSize)}
 function usable(p){return Number(p.qty)>0&&(!p.exp||Food.days(p.exp)>=0)}
 function ordered(items){return items.filter(usable).slice().sort((a,b)=>(a.exp||'9999').localeCompare(b.exp||'9999')||String(a.id).localeCompare(String(b.id)))}
 function needs(ingredients,items){
  const remaining=new Map(items.map(p=>[p.id,stock(p)?.qty||0]));
  return ingredients.map(i=>{
   const want=measure(i.qty,i.unit),lots=ordered(items).filter(p=>Food.productMatches(i.name,p));
   let left=want?want.qty:Number(i.qty),allocations=[];
   if(want)for(const p of lots){const s=stock(p);if(!s||s.unit!==want.unit)continue;const used=Math.min(remaining.get(p.id)||0,left);if(used>0){allocations.push({id:p.id,qty:used,unit:s.unit});left=rounded(left-used);remaining.set(p.id,rounded(remaining.get(p.id)-used))}}
   const uncertain=lots.some(p=>{const s=stock(p);return !s||!want||s.unit!==want.unit});
   return {name:i.name,qty:want?want.qty:i.qty,unit:want?want.unit:i.unit,missing:left,uncertain:left>0&&uncertain,allocations};
  });
 }
 function recipeNeeds(r,people,items){return needs(r.ingredients.map(i=>({...i,qty:rounded(i.qty*people/r.servings)})),items)}
 function planNeeds(plan,catalog,items){
  const combined=new Map();
  for(const entry of plan){const r=catalog.find(r=>r.id===entry.recipeId);if(!r)continue;for(const i of r.ingredients){const m=measure(i.qty*entry.servings/r.servings,i.unit);if(!m)continue;const key=Food.norm(i.name)+'|'+m.unit;const old=combined.get(key)||{name:i.name,qty:0,unit:m.unit};old.qty=rounded(old.qty+m.qty);combined.set(key,old)}}
  return needs([...combined.values()],items);
 }
 function sameLot(a,b){
  const identity=p=>p.barcode?'code:'+p.barcode:'name:'+Food.norm(p.name);
  return identity(a)===identity(b)&&Food.norm(a.name)===Food.norm(b.name)&&a.loc===b.loc&&a.unit===b.unit&&(a.exp||'')===(b.exp||'')&&
   (a.ingredientKey||'')===(b.ingredientKey||'')&&JSON.stringify(a.portionSize||null)===JSON.stringify(b.portionSize||null)&&JSON.stringify(a.packageSize||null)===JSON.stringify(b.packageSize||null)&&JSON.stringify(a.nutrition||null)===JSON.stringify(b.nutrition||null)&&
   (a.allergens||'')===(b.allergens||'')&&(a.traces||'')===(b.traces||'')&&(a.opened||'')===(b.opened||'')&&Number(a.minQty||0)===Number(b.minQty||0);
 }
 function consume(p,amount,unit){
  if(unit==='porzioni'){if(!p.portionSize||!(p.portionSize.qty>0))return null;return consume(p,amount*p.portionSize.qty,p.portionSize.unit)}
  let delta;if(unit===p.unit)delta=amount;else{const s=stock(p),a=measure(amount,unit);if(!s||!a||s.unit!==a.unit)return null;delta=Number(p.qty)*a.qty/s.qty}
  if(!(amount>0)||!Number.isFinite(delta)||delta>Number(p.qty)+.00001)return null;
  return rounded(Math.max(0,Number(p.qty)-delta));
 }
 function lowStock(items){
  return items.filter(p=>Number(p.minQty)>0).filter((p,i,all)=>all.findIndex(x=>Food.norm(x.name)===Food.norm(p.name)&&x.unit===p.unit)===i).map(p=>{
   const qty=items.filter(x=>usable(x)&&Food.norm(x.name)===Food.norm(p.name)&&x.unit===p.unit&&JSON.stringify(x.packageSize||null)===JSON.stringify(p.packageSize||null)).reduce((n,x)=>n+Number(x.qty),0);
   return {...p,available:rounded(qty),needed:rounded(Math.max(0,Number(p.minQty)-qty))};
  }).filter(p=>p.needed>0);
 }
 function barcode(code){return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(String(code))}
 function validDate(d){if(!d)return true;if(!/^\d{4}-\d\d-\d\d$/.test(d))return false;const v=new Date(d+'T12:00:00Z');return !Number.isNaN(v.valueOf())&&v.toISOString().slice(0,10)===d}
 function validate(data){
  if(!data||typeof data!=='object'||!Array.isArray(data.items)||!Array.isArray(data.shop))throw Error('Il file non contiene dispensa e spesa');
  if(data.items.length>20000||data.shop.length>20000)throw Error('Il backup contiene troppe voci');
  for(const p of data.items)if(!p||typeof p.name!=='string'||!p.name.trim()||!Number.isFinite(Number(p.qty))||Number(p.qty)<0||!['pz','g','kg','ml','L','confezioni','bottiglie'].includes(p.unit)||!validDate(p.exp))throw Error('Un prodotto contiene dati non validi');
  for(const p of data.items){if(p.portionSize&&(!Number.isInteger(p.portionSize.count)||p.portionSize.count<1||p.portionSize.count>1000||!(p.portionSize.qty>0)||!['g','ml','pz'].includes(p.portionSize.unit)))throw Error('Porzioni della confezione non valide');if(p.ingredientKey!==undefined&&typeof p.ingredientKey!=='string')throw Error('Ingrediente non valido')}
  for(const p of data.shop)if(!p||typeof p.name!=='string'||!p.name.trim())throw Error('Una voce della spesa non è valida');
  if(data.diary!==undefined&&(!Array.isArray(data.diary)||data.diary.some(p=>!p||typeof p.name!=='string'||!p.date||!validDate(p.date)||!(Number(p.amount)>0)||!['g','ml'].includes(p.unit))))throw Error('Il diario contiene dati non validi');
  if(data.plan!==undefined&&(!Array.isArray(data.plan)||data.plan.length>1000||data.plan.some(p=>!p||typeof p.recipeId!=='string'||!Number.isInteger(p.servings)||p.servings<1||p.servings>12||!p.date||!validDate(p.date))))throw Error('Il piano contiene dati non validi');
  if(data.people!==undefined&&(!Number.isInteger(data.people)||data.people<1||data.people>12))throw Error('Numero di persone non valido');
  for(const field of ['items','shop','diary','plan']){const ids=new Set();for(const p of data[field]||[]){if(p.id&&ids.has(p.id))throw Error('Identificativi duplicati nel backup');if(p.id)ids.add(p.id)}}
  return data;
 }
 function difficulty(r){return r.minutes<=30&&r.steps.length<=5?'Facile':r.minutes<=60?'Media':'Impegnativa'}
 return {measure,stock,usable,ordered,needs,recipeNeeds,planNeeds,sameLot,consume,lowStock,barcode,validDate,validate,difficulty,rounded};
})();
