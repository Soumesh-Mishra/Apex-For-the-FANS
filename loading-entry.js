(async()=>{
 const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
 const mode=location.pathname==='/'?'welcome':params.get('mode')==='welcome'?'welcome':'transition';
 const preview=APEXEntry.preview,target=APEXEntry.safeNext(params.get('next')||'/index.html#overview');
 const shell=$('.entry-shell'),button=$('[data-loading-continue]'),status=$('[data-loading-status]');
 let ready=false,degraded=false;
 document.body.dataset.loadingMode=mode;
 $('[data-mode-label]').textContent=mode==='transition'?'PADDOCK PREPARATION':'YOUR PADDOCK';
 $('#loading-title').textContent=mode==='transition'?'Bringing you trackside.':'The grid is waiting.';
 $('[data-loading-description]').textContent=mode==='transition'?'Getting your entry ready. You’ll enter automatically once these checks finish.':'Your team. Your racing world. Let’s get you closer to the action.';
 $('[data-continue-label]').textContent=preview&&mode==='transition'?'Play entry transition':'Enter the paddock';
 if(preview){const note=$('[data-preview-notice]');note.hidden=false;note.textContent=mode==='transition'?'OPTION A · This review holds the ready state. Play the transition to try automatic entry.':'OPTION B · A welcome screen that waits for you to continue.';}
 button.href=mode==='welcome'||preview?APEXEntry.loadingUrl(target):target;
 button.addEventListener('click',event=>{if(!ready)event.preventDefault();});
 function complete(name,fallback=false){const row=$('[data-check="'+name+'"]');row.dataset.state=fallback?'fallback':'ready';row.querySelector('.check-status').textContent=fallback?'–':'✓';$('[data-bar="'+name+'"]').dataset.complete='true';degraded||=fallback;}
 async function deadline(promise,ms){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Timeout')),ms))]);}finally{clearTimeout(timer);}}
 complete('team');
 const visual=(async()=>{try{const image=$('.splash-hero');if(image.complete&&image.naturalWidth>0)await image.decode();else await deadline(new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true});if(image.complete&&image.naturalWidth===0)reject(Error('Image unavailable'));}),6000);complete('visual');}catch{shell.classList.add('visual-unavailable');complete('visual',true);}})();
 const access=(async()=>{try{const response=await fetch('/api/auth/me',{cache:'no-store',signal:AbortSignal.timeout(4500)});if(!response.ok)throw Error();const data=await response.json();if(!Object.hasOwn(data,'user'))throw Error();complete('access');}catch{complete('access',true);}})();
 await Promise.all([visual,access]);
 ready=true;shell.dataset.ready='true';button.removeAttribute('aria-disabled');
 status.textContent=degraded?'Ready to enter. Some checks were unavailable; you can still explore.':mode==='welcome'?'Ready when you are. Your pit wall is one tap away.':preview?'All checks complete. Play the transition to enter automatically.':'Your pit wall is ready. Taking you to the paddock…';
 if(mode==='transition'&&!preview)location.replace(target);
})();
