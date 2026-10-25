// La mia cucina – riconoscimento immagini tramite OpenAI API (serverless Vercel).
// La chiave OPENAI_API_KEY deve vivere SOLO nelle variabili d'ambiente Vercel.
const crypto = require('node:crypto');
const ORIGINS=new Set(['https://acasciaro7-oss.github.io','https://appassets.androidplatform.net']);
const UNITS=['pz','g','kg','ml','L','confezioni','bottiglie'];
const LOCATIONS=['Frigo','Dispensa','Freezer'];
function secretMatch(a,b){
 if(!a||!b||b.length<18)return false;
 const x=Buffer.from(String(a)),y=Buffer.from(String(b));
 return x.length===y.length&&crypto.timingSafeEqual(x,y);
}
function respond(res,status,obj){res.status(status).json(obj)}
module.exports=async function handler(req,res){
 const origin=String(req.headers.origin||'');
 // Le richieste provenienti da browser sono consentite solo dalla nostra app.
 const allowed=ORIGINS.has(origin)||(process.env.KITCHEN_ALLOWED_ORIGIN&&origin===process.env.KITCHEN_ALLOWED_ORIGIN);
 if(allowed){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Kitchen-Access');
 res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
 res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(allowed?204:403).end();
 if(!allowed)return respond(res,403,{error:'Origine non autorizzata'});
 if(req.method!=='POST')return respond(res,405,{error:'Metodo non supportato'});
 const apiKey=process.env.OPENAI_API_KEY,pass=process.env.KITCHEN_ACCESS_CODE;
 if(!apiKey||!pass)return respond(res,503,{error:'Servizio GPT non ancora configurato sul server'});
 if(!secretMatch(req.headers['x-kitchen-access'],pass))return respond(res,401,{error:'Codice di accesso GPT non valido'});
 let body=req.body;
 if(typeof body==='string'){try{body=JSON.parse(body)}catch{return respond(res,400,{error:'Richiesta non valida'})}}
 if(!body||typeof body!=='object')return respond(res,400,{error:'Dati mancanti'});
 const kind=body.kind;
 if(!['prodotto','scontrino'].includes(kind))return respond(res,400,{error:'Tipo di foto non valido'});
 const image=body.image;
 if(typeof image!=='string'||image.length>5_500_000||!/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(image)){
  return respond(res,413,{error:'Immagine troppo grande o in formato non valido'});
 }
 const schema={type:'object',additionalProperties:false,properties:{
  products:{type:'array',items:{type:'object',additionalProperties:false,
   properties:{
    brand:{type:'string'},name:{type:'string'},quantity:{type:'number'},
    unit:{type:'string',enum:UNITS},location:{type:'string',enum:LOCATIONS},
    expirationDate:{type:'string'},confidence:{type:'string',enum:['high','medium','low']},note:{type:'string'}
   },
   required:['brand','name','quantity','unit','location','expirationDate','confidence','note']
  }}
 },required:['products']};
 const rules=[
  'Sei un assistente esperto nel catalogare ALIMENTI da fotografie italiane. Restituisci SOLO prodotti realmente riconoscibili e il JSON richiesto.',
  'Per una singola confezione, normalmente QUANTITY=1 e UNIT=confezioni. La scritta 2 porzioni NON significa due confezioni.',
  'Identifica marca e nome distintamente. Non copiare descrizioni pubblicitarie nel nome.',
  'Leggi la scadenza solo se chiaramente visibile e converti in YYYY-MM-DD. In caso di dubbio o assenza scrivi stringa vuota.',
  'Per conservazione scegli Frigo solo quando si tratta chiaramente di alimento fresco/refrigerato; Freezer per surgelati; altrimenti Dispensa.',
  'Non inventare prezzo, peso, data, nome o quantità. Se ambiguo usa confidence low, nota breve e non aggiungere prodotti incomprensibili.',
  'Per scontrini ignora intestazioni, pagamento, sconti, totale e prodotti non alimentari; produci una voce per articolo alimentare e usa la quantità mostrata se inequivocabile.',
  'Per foto prodotto NON estrarre ingredienti elencati nella descrizione come ulteriori prodotti.',
  'Note: puoi indicare le porzioni o il tempo di cottura, ma solo se leggibili.',
  'Esempio: foto ravioli Esselunga ripieni alla zucca, 2 porzioni, da consumare 11/11/26 => brand Esselunga, name Ravioli ripieni alla zucca, quantity 1, unit confezioni, location Frigo, expirationDate 2026-11-11, note 2 porzioni.'
 ].join('\n');
 const reqBody={
  model:process.env.OPENAI_MODEL||'gpt-6.1-sol',
  reasoning:{effort:'low'},
  max_output_tokens:2500,
  store:false,
  input:[
   {role:'system',content:[{type:'input_text',text:rules}]},
   {role:'user',content:[
    {type:'input_text',text:kind==='prodotto'?'Riconosci il prodotto alimentare nella foto.':'Estrai i singoli alimenti acquistati dallo scontrino.'},
    {type:'input_image',image_url:image,detail:'high'}
   ]}
  ],
  text:{format:{type:'json_schema',name:'kitchen_products',strict:true,schema}}
 };
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),35000);
  let response;
  try{
   response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
    body:JSON.stringify(reqBody),signal:controller.signal
   });
  }finally{clearTimeout(timer)}
  const data=await response.json().catch(()=>null);
  if(!response.ok){
   // Mai restituire informazioni sulle chiavi o il payload.
   console.error('OpenAI recognition failed',response.status,data&&data.error&&data.error.code);
   return respond(res,502,{error:response.status===429?'Limite API raggiunto: riprova più tardi':'Riconoscimento GPT temporaneamente non disponibile'});
  }
  const txt=data&&data.output_text||(data&&Array.isArray(data.output)?data.output.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''):'');
  if(!txt)return respond(res,502,{error:'GPT non ha restituito risultati leggibili'});
  const result=JSON.parse(txt);
  const products=(Array.isArray(result.products)?result.products:[]).slice(0,30)
   .filter(p=>typeof p.name==='string'&&p.name.trim())
   .map(p=>({...p,name:p.name.slice(0,120),brand:String(p.brand||'').slice(0,75),
    quantity:Number.isFinite(p.quantity)&&p.quantity>0&&p.quantity<10000?p.quantity:1,
    expirationDate:/^\d{4}-\d{2}-\d{2}$/.test(p.expirationDate||'')?p.expirationDate:'',
    note:String(p.note||'').slice(0,180)}));
  return respond(res,200,{products});
 }catch(err){
  console.error('Kitchen AI error',err&&err.name);
  return respond(res,502,{error:'Impossibile completare la lettura. Riprova con una foto più nitida.'});
 }
};
