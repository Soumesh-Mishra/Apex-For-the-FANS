(()=>{
 let promptEvent;
 const button=document.querySelector('[data-install]'),status=document.querySelector('[data-install-status]');
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 function refresh(){if(button)button.hidden=!promptEvent||standalone();if(status&&standalone())status.textContent='APEX is running as an installed app.';}
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;refresh()});
 window.addEventListener('appinstalled',()=>{promptEvent=null;refresh();if(status)status.textContent='APEX installed. Open it from your home screen or app launcher.'});
 button?.addEventListener('click',async()=>{if(!promptEvent)return;const pending=promptEvent;promptEvent=null;refresh();try{await pending.prompt();const result=await pending.userChoice;if(status)status.textContent=result.outcome==='accepted'?'Installation accepted. Check your app launcher.':'Installation dismissed. You can use your browser menu later.';}catch{if(status)status.textContent='Use the browser menu to install APEX.';}});
 refresh();
 if('serviceWorker' in navigator&&window.isSecureContext)window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{if(status)status.textContent='Offline fallback is unavailable. You can still use APEX online.';});});
})();
