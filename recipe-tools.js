'use strict';
let recipeCategory='Tutte',recipeMode='Tutte',recipeDiet='Tutte',recipeTime=0,recipeLimit=30;
const recipeCategories=['Tutte','Primi','Secondi','Piatti unici','Zuppe','Contorni','Colazioni e dolci'];
function recipeMissing(r){return r[3].filter(n=>!have(n))}
function recipeUrgent(r){return r[3].some(n=>db.items.some(p=>Number(p.qty)>0&&Food.productMatches(n,p)&&Food.days(p.exp)!==null&&Food.days(p.exp)>=0&&Food.days(p.exp)<=7))}
function recipeScore(r){const missing=recipeMissing(r).length;return (missing===0?10000:0)+(1-missing/r[3].length)*1000-missing*30+(recipeUrgent(r)?10:0)}
function sortedRecipes(list){return list.map(r=>({r,score:recipeScore(r)})).sort((a,b)=>b.score-a.score||a.r[0].localeCompare(b.r[0],'it')).map(x=>x.r)}
function recipeList(){
 return sortedRecipes(recipeData.filter(r=>{
  const m=r[5],search=norm(recQuery),found=!search||norm(r[0]+' '+r[3].join(' ')).includes(search);
  return found&&(recipeCategory==='Tutte'||m.category===recipeCategory)&&(!recipeTime||m.minutes<=recipeTime)&&
   (recipeDiet==='Tutte'||recipeDiet==='Vegetariane'&&m.vegetarian||recipeDiet==='Vegane'&&m.vegan)&&
   (recipeMode==='Tutte'||recipeMode==='Pronte'&&recipeMissing(r).length===0||recipeMode==='Quasi pronte'&&recipeMissing(r).length>0&&recipeMissing(r).length<=2||recipeMode==='In scadenza'&&recipeUrgent(r)||recipeMode==='Preferite'&&(db.favorites||[]).includes(m.id));
 }));
}
function recipeControls(){
 const options=(items,current)=>items.map(x=>'<option '+(x===current?'selected':'')+'>'+esc(x)+'</option>').join('');
 return '<label class="label" for="recipeSearch">Cerca per ricetta o ingrediente</label><input id="recipeSearch" class="field" placeholder="Es. ceci, zucca, pollo…" value="'+esc(recQuery)+'">'+
 '<div class="grid2"><div><label class="label" for="recipeCategory">Categoria</label><select id="recipeCategory" class="field">'+options(recipeCategories,recipeCategory)+'</select></div><div><label class="label" for="recipeMode">La tua dispensa</label><select id="recipeMode" class="field">'+options(['Tutte','Pronte','Quasi pronte','In scadenza','Preferite'],recipeMode)+'</select></div></div>'+
 '<div class="grid2"><div><label class="label" for="recipeTime">Tempo massimo</label><select id="recipeTime" class="field">'+[[0,'Qualsiasi'],[15,'15 minuti'],[30,'30 minuti'],[45,'45 minuti']].map(x=>'<option value="'+x[0]+'" '+(recipeTime===x[0]?'selected':'')+'>'+x[1]+'</option>').join('')+'</select></div><div><label class="label" for="recipeDiet">Preferenza</label><select id="recipeDiet" class="field">'+options(['Tutte','Vegetariane','Vegane'],recipeDiet)+'</select></div></div>';
}
function formatRecipeAmount(item,people,base){const q=Math.round(item.qty*people/base*10)/10;return new Intl.NumberFormat('it-IT',{maximumFractionDigits:1}).format(q)+' '+item.unit}
function recipeNutrition(r,people){
 const meta=r[5],totals=Object.fromEntries(Food.nutrientKeys.map(k=>[k,0]));let covered=0;
 for(const i of meta.ingredients){
  const product=db.items.find(p=>Number(p.qty)>0&&Food.productMatches(i.name,p)&&p.nutrition&&p.nutrition.basis===i.unit&&(!p.exp||p.exp>=Food.localDate()));
  const values=product&&Food.portion(product.nutrition,i.qty*people/meta.servings,i.unit);
  if(!values){Food.nutrientKeys.forEach(k=>totals[k]=null);continue;}
  covered++;Food.nutrientKeys.forEach(k=>{if(totals[k]!==null)totals[k]=values[k]===null?null:totals[k]+values[k]});
 }
 if(covered!==meta.ingredients.length)return null;
 return {totals:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,v===null?null:Math.round(v/people*10)/10])),source:'Stima dai prodotti della dispensa; condimenti esclusi'};
}

