(async()=>{
 const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
 const mode=location.pathname==='/'?'welcome':params.get('mode')==='welcome'?'welcome':'transition';
 const preview=APEXEntry.preview,target=APEXEntry.safeNext(params.get('next')||'/index.html#overview');
 if(mode==='transition'){
  if(!preview)requestAnimationFrame(()=>requestAnimationFrame(()=>location.replace(target)));
  return;
 }

 const shell=$('.entry-shell'),button=$('[data-loading-continue]'),status=$('[data-loading-status]');
 let ready=false,degraded=false;
 document.body.dataset.loadingMode=mode;
 if(preview){const note=$('[data-preview-notice]');note.hidden=false;note.textContent='OPTION B · A welcome screen that waits for you to continue.';}
 button.href=APEXEntry.loadingUrl(target);
 button.addEventListener('click',event=>{if(!ready)event.preventDefault();});
 function complete(name,fallback=false){$('[data-bar="'+name+'"]').dataset.complete='true';degraded||=fallback;}
 async function deadline(promise,ms){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Timeout')),ms))]);}finally{clearTimeout(timer);}}
 complete('team');
 const visual=(async()=>{try{const image=$('.splash-hero');if(image.complete&&image.naturalWidth>0)await image.decode();else await deadline(new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true});if(image.complete&&image.naturalWidth===0)reject(Error('Image unavailable'));}),6000);complete('visual');}catch{shell.classList.add('visual-unavailable');complete('visual',true);}})();
 const access=(async()=>{try{const response=await fetch('/api/auth/me',{cache:'no-store',signal:AbortSignal.timeout(4500)});if(!response.ok)throw Error();const data=await response.json();if(!Object.hasOwn(data,'user'))throw Error();complete('access');}catch{complete('access',true);}})();
 await Promise.all([visual,access]);
 ready=true;shell.dataset.ready='true';button.removeAttribute('aria-disabled');
 status.textContent=degraded?'Ready to enter. Some services are unavailable.':'Your pit wall is ready.';
})();
