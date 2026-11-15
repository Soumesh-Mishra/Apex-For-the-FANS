const entry$=s=>document.querySelector(s),entryAll=s=>[...document.querySelectorAll(s)];
let entryLoad=0;
const entryMotionReduced=matchMedia('(prefers-reduced-motion: reduce)');
async function setEntryTeam(value,persist=false){
 const request=++entryLoad,team=TeamThemes.apply(document.documentElement,value),visual=team.car?team:TeamThemes.resolve('ferrari');
 entryAll('[data-entry-team]').forEach(select=>select.value=team.id);
 entryAll('[data-entry-team-name]').forEach(el=>el.textContent=team.name);
 entryAll('[data-entry-car-label]').forEach(el=>el.textContent=visual.name.toUpperCase());
 entryAll('[data-entry-logo]').forEach(slot=>{slot.hidden=!team.logo;const image=slot.querySelector('img');if(team.logo){image.src=team.logo;image.alt=team.name+' logo'}else{image.removeAttribute('src');image.alt=''}});
 entryAll('[data-entry-car-credit]').forEach(a=>{if(entry$('.drift-scene')?.dataset.renderMode==='webgl'){a.href='/credits';a.removeAttribute('target');a.textContent='3D model & visual credits';return;}a.href=visual.carSource;a.textContent='2026 '+visual.name+' car · Formula 1 ↗'});
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=team.base;
 const scene=entry$('.drift-scene');if(scene)scene.setAttribute('aria-label',scene.dataset.renderMode==='webgl'?'3D '+visual.name+'-coloured open-wheel concept car drifting right':'Animated 2026 '+visual.name+' Formula 1 car drifting from left to right through tyre smoke');
 if(persist){try{localStorage.setItem('apex-team',team.id)}catch{const hint=entry$('[data-entry-save-status]');if(hint)hint.textContent='Your team is applied here. Browser storage is unavailable.'}}
 const images=entryAll('[data-entry-car]');images.forEach(i=>i.hidden=true);
 try{const preload=new Image();preload.src=visual.car;await preload.decode();if(request!==entryLoad)return;images.forEach(image=>{image.src=visual.car;image.alt='2026 '+visual.name+' Formula 1 car';image.hidden=false})}catch{if(request!==entryLoad)return;entryAll('[data-entry-car-label]').forEach(el=>el.textContent='CAR IMAGE UNAVAILABLE')}
}
entryAll('[data-entry-team]').forEach(select=>{for(const team of [TeamThemes.fallback,...TeamThemes.teams]){const option=document.createElement('option');option.value=team.id;option.textContent=team.name;select.appendChild(option)}select.onchange=()=>setEntryTeam(select.value,true)});
setEntryTeam(document.documentElement.dataset.team||'apex');
window.addEventListener('storage',event=>{if(event.key==='apex-team'||event.key===null){let selected='apex';try{selected=localStorage.getItem('apex-team')||'apex'}catch{}setEntryTeam(selected)}});
const motionButton=entry$('#entry-motion');
function entryMotion(paused){document.body.dataset.motionPaused=String(paused);if(motionButton){motionButton.setAttribute('aria-pressed',String(paused));motionButton.textContent=entryMotionReduced.matches?'Reduced motion':paused?'Play animation ▷':'Pause animation Ⅱ';motionButton.disabled=entryMotionReduced.matches}}
if(motionButton){entryMotion(entryMotionReduced.matches);motionButton.onclick=()=>entryMotion(document.body.dataset.motionPaused!=='true');entryMotionReduced.addEventListener('change',()=>entryMotion(entryMotionReduced.matches))}
