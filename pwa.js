'use strict';
async function saveWebBackup(json){
 const name='myfoodworld-backup.json',file=new File([json],name,{type:'application/json'});
 if(navigator.canShare&&navigator.share&&navigator.canShare({files:[file]})){
  try{await navigator.share({files:[file],title:'Backup MyFoodWorld'});return}
  catch(error){if(error.name==='AbortError')return;}
 }
 const a=document.createElement('a'),url=URL.createObjectURL(file);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
if('serviceWorker' in navigator){
 let refreshRequested=false,reloading=false;
 const offerUpdate=registration=>{
  if(!registration.waiting||!navigator.serviceWorker.controller||document.querySelector('#appUpdate'))return;
  const panel=document.createElement('div');panel.id='appUpdate';panel.className='app-update';
  panel.innerHTML='<span>Una nuova versione è pronta</span><button type="button" class="btn small">Aggiorna</button>';
  panel.querySelector('button').addEventListener('click',()=>{
   if(typeof modal!=='undefined'&&modal&&!confirm('Aggiornare ora? Le modifiche non ancora salvate nel modulo andranno perse.'))return;
   refreshRequested=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  });document.body.append(panel);
 };
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshRequested&&!reloading){reloading=true;location.reload()}});
 window.addEventListener('load',async()=>{
  try{
   const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
   offerUpdate(registration);
   registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed')offerUpdate(registration)})});
   registration.update().catch(()=>{});
  }catch(error){}
 });
}
