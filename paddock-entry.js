const APEXEntry=(()=>{
 const all=s=>[...document.querySelectorAll(s)],one=s=>document.querySelector(s);
 function safeNext(value){try{if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))throw Error();const url=new URL(value,location.origin);if(url.origin!==location.origin||!['/index.html','/pit-wall','/privacy','/credits'].includes(url.pathname))throw Error();return url.pathname+url.search+url.hash;}catch{return '/index.html#overview';}}
 function loadingUrl(value){return '/loading?mode=transition&next='+encodeURIComponent(safeNext(value));}
 function applyTeam(value,persist=false){
  const team=TeamThemes.apply(document.documentElement,value);
  all('[data-entry-team]').forEach(select=>select.value=team.id);
  all('[data-entry-team-name]').forEach(el=>el.textContent=team.name);
  all('[data-entry-logo]').forEach(slot=>{const image=slot.querySelector('img');slot.hidden=!team.logo;if(team.logo){image.src=team.logo;image.alt=team.name+' logo';}else{image.removeAttribute('src');image.alt='';}});
  const meta=one('meta[name="theme-color"]');if(meta)meta.content='#08090c';
  if(persist)try{localStorage.setItem('apex-team',team.id);}catch{const hint=one('[data-entry-save-status]');if(hint)hint.textContent='Colours are applied here. Browser storage is unavailable.';}
  return team;
 }
 all('[data-entry-team]').forEach(select=>{for(const team of [TeamThemes.fallback,...TeamThemes.teams]){const option=document.createElement('option');option.value=team.id;option.textContent=team.name;select.append(option);}select.addEventListener('change',()=>applyTeam(select.value,true));});
 applyTeam(document.documentElement.dataset.team||'apex');
 window.addEventListener('storage',event=>{if(event.key==='apex-team'||event.key===null){let value='apex';try{value=localStorage.getItem('apex-team')||'apex';}catch{}applyTeam(value);}});
 const params=new URLSearchParams(location.search),preview=params.get('preview')==='1',embedded=preview&&params.get('embed')==='1';
 if(embedded)document.body.dataset.embedded='true';
 if(preview){const toolbar=one('[data-preview-toolbar]');if(toolbar)toolbar.hidden=embedded;const page=document.body.hasAttribute('data-entry-loading')?(params.get('mode')==='transition'?'transition':'welcome'):'login';all('[data-preview-page]').forEach(link=>{if(link.dataset.previewPage===page)link.setAttribute('aria-current','page');});}
 for(const image of all('.editorial-photo,.splash-hero'))image.addEventListener('error',()=>one('.entry-shell').classList.add('visual-unavailable'));
 return {safeNext,loadingUrl,preview};
})();
