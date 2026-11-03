'use strict';
let nutritionDay=Food.localDate();
const nutrientLabels={kcal:'Calorie (kcal)',protein:'Proteine (g)',carbs:'Carboidrati (g)',fat:'Grassi (g)',sugars:'Zuccheri (g)',fiber:'Fibre (g)',salt:'Sale (g)'};
const numText=n=>n===null||n===undefined?'—':new Intl.NumberFormat('it-IT',{maximumFractionDigits:1}).format(n);
function nutrientFields(prefix,n){
 n=n||{};return '<div class="grid2">'+Food.nutrientKeys.map(k=>'<div><label class="label" for="'+prefix+k+'">'+nutrientLabels[k]+'</label><input class="field" id="'+prefix+k+'" type="number" inputmode="decimal" min="0" max="'+(k==='kcal'?1000:100)+'" step="0.1" placeholder="Non noto" value="'+(n[k]===null||n[k]===undefined?'':esc(n[k]))+'"></div>').join('')+'</div>';
}
function readNutrients(prefix,source,basis){const n={source,basis};Food.nutrientKeys.forEach(k=>n[k]=$("#"+prefix+k).value);return Food.cleanNutrition(n)}
function nutritionSummary(n){
 n=Food.cleanNutrition(n);if(!n)return '<p class="muted">Valori nutrizionali non disponibili.</p>';
 return '<div class="nutri-values">'+['kcal','protein','carbs','fat'].map(k=>'<div><b>'+numText(n[k])+'</b><small>'+nutrientLabels[k]+'</small></div>').join('')+'</div><p class="muted">Per 100 '+esc(n.basis)+' · '+esc(n.source)+'</p>';
}
function productNutritionFields(product){
 const n=Food.cleanNutrition(product.nutrition);
 return '<details class="nutrition-editor"><summary>Valori nutrizionali e confezione</summary><p class="muted">Copia i valori della tabella per 100 g o 100 ml. Lascia vuoto ciò che non conosci.</p>'+
 '<label class="label" for="prodBasis">Valori riferiti a</label><select class="field" id="prodBasis"><option value="g">100 g</option><option value="ml" '+(n&&n.basis==='ml'?'selected':'')+'>100 ml</option></select>'+nutrientFields('prodN',n)+
 '<input type="hidden" id="prodSource" value="'+esc(n?n.source:'Inserimento manuale')+'">'+
 '<div class="grid2"><div><label class="label" for="prodPackQty">Contenuto per confezione</label><input class="field" id="prodPackQty" type="number" min="0" step="0.1" value="'+esc(product.packageSize?product.packageSize.qty:'')+'" placeholder="Es. 500"></div><div><label class="label" for="prodPackUnit">Unità contenuto</label><select class="field" id="prodPackUnit"><option>g</option><option '+(product.packageSize&&product.packageSize.unit==='ml'?'selected':'')+'>ml</option></select></div></div></details>';
}
function diaryEntries(){return (db.diary||[]).filter(x=>x.date===nutritionDay)}
function pantryComparisons(){
 const families=['Yogurt','Latte','Pane','Biscotti','Cereali','Pasta','Formaggio'];
 const products=db.items.filter(p=>Number(p.qty)>0&&p.nutrition&&(!p.exp||p.exp>=Food.localDate()));const seen=new Set(),rows=[];
 for(const current of products){const group=families.find(f=>Food.matches(f,current.name));if(!group)continue;const n=Food.cleanNutrition(current.nutrition);if(!n)continue;
  for(const key of ['sugars','salt']){if(n[key]===null)continue;const alternative=products.find(p=>p.id!==current.id&&Food.matches(group,p.name)&&p.nutrition.basis===n.basis&&Food.cleanNutrition(p.nutrition)[key]!==null&&Food.cleanNutrition(p.nutrition)[key]<n[key]-.1);
   if(!alternative)continue;const signature=alternative.id+'-'+current.id+'-'+key;if(seen.has(signature))continue;seen.add(signature);
   rows.push('<div class="card"><strong>'+esc(alternative.name)+'</strong><p class="muted">Meno '+(key==='sugars'?'zuccheri':'sale')+' rispetto a '+esc(current.name)+': '+numText(alternative.nutrition[key])+' contro '+numText(n[key])+' g per 100 '+esc(n.basis)+'.</p></div>');
  }
 }
 return rows.length?'<h2>Confronti tra prodotti simili</h2>'+rows.slice(0,4).join('')+'<p class="muted">Il confronto riguarda soltanto il nutriente indicato, nella stessa unità. Non valuta il prodotto nel suo insieme.</p>':'';
}
function nutritionPage(){
 const entries=diaryEntries();const totals={};const missing={};
 Food.nutrientKeys.forEach(k=>{let sum=0,count=0;for(const e of entries){const n=Food.portion(e.nutrition,e.amount,e.unit);if(n&&n[k]!==null){sum+=n[k];count++}}totals[k]=count?Math.round(sum*10)/10:null;missing[k]=entries.length-count});
 const incomplete=entries.some(e=>!Food.portion(e.nutrition,e.amount,e.unit)||Food.nutrientKeys.slice(0,4).some(k=>Food.portion(e.nutrition,e.amount,e.unit)[k]===null));
 return banner('Nutrizione','Diario alimentare e valori dei tuoi prodotti')+'<section class="section"><label class="label" for="nutritionDay">Giorno</label><input class="field" type="date" id="nutritionDay" value="'+esc(nutritionDay)+'">'+
 '<h2 style="margin-top:20px">'+(incomplete?'Totali conosciuti':'Riepilogo giornaliero')+'</h2><div class="nutri-values">'+['kcal','protein','carbs','fat'].map(k=>'<div><b>'+numText(totals[k])+'</b><small>'+nutrientLabels[k]+'</small></div>').join('')+'</div>'+
 (incomplete?'<p class="notice">Riepilogo parziale: alcuni alimenti hanno valori mancanti. Il simbolo — indica un dato sconosciuto, non zero.</p>':'')+
 '<details class="nutrition-editor"><summary>Altri valori conosciuti</summary>'+['sugars','fiber','salt'].map(k=>'<p>'+nutrientLabels[k]+': <strong>'+numText(totals[k])+'</strong>'+(missing[k]?' · dati mancanti per '+missing[k]+' voci':'')+'</p>').join('')+'</details><p class="muted">Calcoli dalle etichette o dai dati inseriti. Le quantità si riferiscono alla singola persona; nessun obiettivo calorico viene assegnato automaticamente.</p>'+
 '<button class="btn full" data-a="diaryNew">+ Registra un alimento o un pasto</button><div style="height:18px"></div>'+
 (entries.length?entries.map(e=>{const values=Food.portion(e.nutrition,e.amount,e.unit);return '<div class="card"><div class="row"><div><strong>'+esc(e.name)+'</strong><small class="diary-meta">'+esc(e.meal)+' · '+numText(e.amount)+' '+esc(e.unit)+'</small></div><button class="btn small red" data-a="diaryDelete" data-v="'+esc(e.id)+'" aria-label="Elimina registrazione">×</button></div><p class="muted">'+(values?numText(values.kcal)+' kcal · P '+numText(values.protein)+' g · C '+numText(values.carbs)+' g · G '+numText(values.fat)+' g':'Valori non disponibili')+'</p></div>'}).join(''):'<div class="empty"><span>📒</span><b>Nessun alimento registrato</b><p>Aggiungi ciò che hai mangiato e la quantità.</p></div>')+
 '<h2 style="margin-top:24px">Etichette in dispensa</h2>'+db.items.filter(p=>Number(p.qty)>0&&p.nutrition).map(p=>'<div class="card"><strong>'+esc(p.name)+'</strong>'+nutritionSummary(p.nutrition)+'<button class="btn small white" data-a="diaryProduct" data-v="'+esc(p.id)+'">Registra consumo</button></div>').join('')+
 pantryComparisons()+'<p class="muted">Per confrontare i prodotti leggi soprattutto porzioni, ingredienti, sale e zuccheri. Non tutti gli alimenti hanno dati completi.</p></section>';
}
function diaryForm(product,name){
 const n=product&&Food.cleanNutrition(product.nutrition);
 open({title:'Registra nel diario',body:'<label class="label" for="diaryProduct">Usa un prodotto della dispensa</label><select class="field" id="diaryProduct"><option value="">Inserimento manuale</option>'+db.items.filter(p=>Number(p.qty)>0).map(p=>'<option value="'+esc(p.id)+'" '+(product&&product.id===p.id?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select>'+
 '<label class="label" for="diaryName">Alimento o pasto</label><input class="field" id="diaryName" value="'+esc(product?product.name:name||'')+'">'+
 '<div class="grid2"><div><label class="label" for="diaryDate">Data</label><input class="field" type="date" id="diaryDate" value="'+esc(nutritionDay)+'"></div><div><label class="label" for="diaryMeal">Pasto</label><select class="field" id="diaryMeal">'+['Colazione','Pranzo','Cena','Spuntino'].map(m=>'<option '+(m===db.meal?'selected':'')+'>'+m+'</option>').join('')+'</select></div></div>'+
 '<div class="grid2"><div><label class="label" for="diaryAmount">Quantità consumata</label><input class="field" type="number" id="diaryAmount" min="0.1" max="10000" step="0.1" placeholder="Peso effettivo"></div><div><label class="label" for="diaryUnit">Unità</label><select class="field" id="diaryUnit"><option value="g">g</option><option value="ml" '+(n&&n.basis==='ml'?'selected':'')+'>ml</option></select></div></div>'+
 '<p class="notice">Valori per 100 g o 100 ml, nella stessa unità della quantità consumata. Lascia vuoti i dati che non conosci: non saranno stimati.</p>'+nutrientFields('diaryN',n)+'<input hidden id="diarySource" value="'+esc(n?n.source:'Inserimento manuale')+'">'+
 '<button class="btn full" style="margin-top:20px" data-a="diarySave">Salva nel diario</button>'});
}
function saveDiary(){
 const name=$('#diaryName').value.trim(),amount=Number($('#diaryAmount').value),unit=$('#diaryUnit').value,date=$('#diaryDate').value;
 if(!name||!date||!(amount>0&&amount<=10000)){toast('Controlla nome, data e quantità');return;}
 const nutrition=readNutrients('diaryN',$('#diarySource').value,unit);
 db.diary=db.diary||[];db.diary.push({id:id(),name,amount,unit,date,meal:$('#diaryMeal').value,nutrition});nutritionDay=date;
 close();page='nutrition';save();toast('Pasto registrato');
}
