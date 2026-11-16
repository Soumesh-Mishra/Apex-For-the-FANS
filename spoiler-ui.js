/* SPOILER_UI_START */
function updateSpoilerControls(){
 const enabled=document.documentElement.dataset.spoilerFree==='true';
 $('#spoiler-toggle').setAttribute('aria-pressed',String(enabled));
 $('#spoiler-toggle').setAttribute('aria-label',enabled?'Spoiler-free mode on. Show spoilers':'Enable spoiler-free mode');
 $('#spoiler-toggle').title=enabled?'Spoiler-free mode on. Show spoilers':'Enable spoiler-free mode';
 $('#spoiler-toggle-label').textContent=enabled?'Spoilers hidden':'Hide spoilers';
 $('#spoiler-banner').hidden=!enabled;
}
function setSpoilerMode(enabled){
 SpoilerMode.apply(enabled);window.PersonalPaddock?.setSpoilers(enabled);let persisted=true;try{localStorage.setItem(SpoilerMode.key,String(enabled))}catch{persisted=false}
 updateSpoilerControls();toast((enabled?'Spoiler-free mode on.':'Spoilers are now visible.')+(persisted?'':' This preference could not be saved in this browser.'));
}
$$('[data-spoiler-content]').forEach(content=>{
 const cover=document.createElement('div');cover.className='spoiler-cover';
 const message=document.createElement('p');message.textContent=content.dataset.spoilerMessage||'Hidden while spoiler-free mode is on.';
 const button=document.createElement('button');button.type='button';button.className='text-btn';button.textContent='Show spoilers everywhere';button.onclick=()=>setSpoilerMode(false);
 cover.append(message,button);content.before(cover);
});
$('#spoiler-toggle').onclick=()=>setSpoilerMode(document.documentElement.dataset.spoilerFree!=='true');
$('#spoiler-reveal').onclick=()=>setSpoilerMode(false);
window.addEventListener('storage',e=>{if(e.key===SpoilerMode.key||e.key===null){SpoilerMode.apply(SpoilerMode.saved());updateSpoilerControls()}});
updateSpoilerControls();
/* SPOILER_UI_END */
