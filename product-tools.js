'use strict';
const Products=(()=>{
 const text=v=>typeof v==='string'?v.trim():'';
 const weakName=name=>!Food.norm(name)||/^(mini|classico|classica|original|originale|light|bio|natural|naturale|regular|multipack)$/.test(Food.norm(name));
 function name(p){
  const it=text(p.product_name_it),other=text(p.product_name),generic=text(p.generic_name_it)||text(p.generic_name),brand=text(p.brands).split(',').map(x=>x.trim()).find(Boolean)||'';
  let label=!weakName(it)?it:!weakName(other)?other:it||other||generic;
  if(weakName(label)&&generic)label=label?label+' · '+generic:generic;
  if(brand&&!(' '+Food.norm(label)+' ').includes(' '+Food.norm(brand)+' '))label=(brand+' '+label).trim();
  return label.slice(0,160);
 }
 function storage(name,metadata={}){
  const explicit=Food.norm([metadata.storage_conditions,...(Array.isArray(metadata.storage_conditions_tags)?metadata.storage_conditions_tags:[])].join(' '));
  if(/\bfrozen\b|\bcongelat|\bsurgelat/.test(explicit))return {loc:'Freezer',reason:'Conservazione indicata dal catalogo'};
  if(/\brefrigerated\b|\bchilled\b|\brefrigerat|\bfridge\b/.test(explicit))return {loc:'Frigo',reason:'Conservazione indicata dal catalogo'};
  if(/\bambient\b|\broom temperature\b|\bshelf stable\b/.test(explicit))return {loc:'Dispensa',reason:'Conservazione indicata dal catalogo'};
  const cats=Food.norm([metadata.categories,...(Array.isArray(metadata.categories_tags)?metadata.categories_tags:[])].join(' ')),n=Food.norm([name,metadata.generic_name_it,metadata.generic_name].join(' '));
  if(/frozen|surgelat|congelat|freezer|\bgelat[oi]\b|ice cream/.test(cats+' '+n))return {loc:'Freezer',reason:'Categoria di prodotti congelati'};
  if(/\buht\b|lunga conservazione|sterilized milk|sterilised milk/.test(cats+' '+n))return {loc:'Dispensa',reason:'Prodotto UHT, confezione chiusa: verifica l’etichetta'};
  if(/canned|tinned|in scatola|in lattina|conserva|sott olio|sotto olio/.test(cats+' '+n))return {loc:'Dispensa',reason:'Conserva chiusa: verifica l’etichetta'};
  if(/crackers|biscuits|cookies|chocolates|candies|dry pastas|dry pasta/.test(cats)||/\bcracker|\bbiscott|\bcioccolat|\bcaramell/.test(n))return {loc:'Dispensa',reason:'Categoria di prodotti da dispensa: verifica l’etichetta'};
  if(/cheeses|cream cheese|fresh cheese|formagg|yogurt|yoghurt|mozzarella|ricotta|burro|butter|pasta fresca|ravioli|tortellini|pollo|tacchino|carne|prosciutto|salmone|merluzzo|fresh milk|latte fresco/.test(cats+' '+n)||/\bphiladelphia\b/.test(n))return {loc:'Frigo',reason:'Categoria o tipo di alimento fresco: verifica l’etichetta'};
  if(/\blatte\b/.test(n)&&!/cocco|soia|mandorla|avena/.test(n))return {loc:'Frigo',reason:'Latte: verifica conservazione e tipo di confezione'};
  if(/\bpasta\b|spaghetti|penne|farina|biscotti|crackers|cereali|\briso\b|legumi secchi|\bte\b|\bcaffe\b|\bolio\b|\baceto\b|\bzucchero\b|\bsale\b/.test(n))return {loc:'Dispensa',reason:'Tipo di alimento normalmente conservato in dispensa'};
  return {loc:'',reason:'Conservazione non determinabile: scegli leggendo l’etichetta'};
 }
 return {name,storage,weakName};
})();
