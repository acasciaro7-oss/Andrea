'use strict';
const nativeBarcodePending=new Map();
window.onNativeBarcode=(requestId,codes,error)=>{const p=nativeBarcodePending.get(requestId);if(!p)return;clearTimeout(p.timeout);nativeBarcodePending.delete(requestId);error?p.reject(Error(error)):p.resolve(codes||[])};
function requestNativeBarcode(canvas){return new Promise((resolve,reject)=>{const requestId='bar_'+Date.now()+'_'+Math.random().toString(36).slice(2),timeout=setTimeout(()=>{nativeBarcodePending.delete(requestId);reject(Error('Il lettore barcode non risponde. Riprova o digita il codice.'))},20000);nativeBarcodePending.set(requestId,{resolve,reject,timeout});try{window.NativeKitchen.recognizeBarcode(canvas.toDataURL('image/jpeg',.95).split(',')[1],requestId)}catch(error){clearTimeout(timeout);nativeBarcodePending.delete(requestId);reject(error)}})}
async function readPhotoBarcode(file){
 let codes=[];
 if(window.NativeKitchen&&typeof window.NativeKitchen.recognizeBarcode==='function'){
  const url=URL.createObjectURL(file),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Immagine illeggibile'));img.src=url});codes=await requestNativeBarcode(makeOcrCanvas(img,{crop:false,boost:false}))}finally{URL.revokeObjectURL(url)}
 }else if(typeof BarcodeDetector!=='undefined'&&typeof createImageBitmap==='function'){
  const requested=['ean_13','ean_8','upc_a','upc_e'],supported=typeof BarcodeDetector.getSupportedFormats==='function'?await BarcodeDetector.getSupportedFormats():requested,formats=requested.filter(x=>supported.includes(x));
  if(!formats.length){if(barcodeOnly)throw Error('Questo browser non legge barcode da foto: digita le cifre del codice.');return ''}
  const bitmap=await createImageBitmap(file);try{codes=(await new BarcodeDetector({formats}).detect(bitmap)).map(x=>x.rawValue)}finally{bitmap.close()}
 }else if(barcodeOnly)throw Error('Questo browser non supporta la lettura dei barcode da foto. Puoi digitarli qui sotto.');
 codes=[...new Set(codes.filter(Kitchen.barcode))];if(codes.length>1)throw Error('Sono visibili più codici: fotografa un solo barcode.');return codes[0]||'';
}
function barcodeManualFallback(code,message){open({title:'Completa il prodotto',body:'<p class="notice">'+esc(message)+'</p><p class="muted">Codice '+esc(code)+'. Puoi salvarlo insieme al prodotto per ritrovarlo alla prossima lettura.</p><button class="btn full" data-a="barcodeManual" data-v="'+esc(code)+'">Inserisci il prodotto per questo codice</button><button class="btn white full" data-a="barcodeMenu">Riprova</button>'})}
document.addEventListener('click',e=>{const el=e.target.closest('[data-a="barcodeManual"]');if(el){e.preventDefault();e.stopImmediatePropagation();productForm({barcode:el.dataset.v,name:'',qty:1,unit:'confezioni',loc:'Dispensa',exp:''})}},true);
