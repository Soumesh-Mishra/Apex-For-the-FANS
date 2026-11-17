/* WEB_SHELL_UI_START */
(()=>{
 const dialog=document.getElementById('web-menu'),more=document.getElementById('web-more'),launcher=document.getElementById('web-launcher');if(!dialog)return;
 let opener;
 document.querySelector('.skip-link')?.addEventListener('click',event=>{event.preventDefault();document.getElementById('main-content').focus();});
 function open(event){opener=event.currentTarget;dialog.showModal();opener.setAttribute('aria-expanded','true');}
 function close(){if(dialog.open)dialog.close();}
 more.addEventListener('click',open);launcher.addEventListener('click',open);
 document.getElementById('web-menu-close').addEventListener('click',close);
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
 dialog.addEventListener('close',()=>{more.setAttribute('aria-expanded','false');launcher.setAttribute('aria-expanded','false');opener?.focus();});
 dialog.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',close));
 function route(){const view=location.hash.slice(1)||'overview';const extra=['standings','teams','leagues','news'].includes(view);if(extra)more.setAttribute('aria-current','page');else more.removeAttribute('aria-current');dialog.querySelectorAll('[data-go]').forEach(button=>{if(button.dataset.go===view)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});close();}
 window.addEventListener('hashchange',route);route();
 function connection(){const node=document.getElementById('web-connection');node.textContent=navigator.onLine?'Browser online':'Offline · saved data';node.dataset.offline=String(!navigator.onLine);}
 window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
 document.getElementById('web-timezone').textContent=Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_',' ');
})();
/* WEB_SHELL_UI_END */
