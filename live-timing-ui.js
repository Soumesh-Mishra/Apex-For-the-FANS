/* LIVE_TIMING_UI_START */
let timingTimer, timingRequest, timingSnapshot, timingPanelMarkup, latestPublishedRace;
const weekendSessions=['FirstPractice','SecondPractice','ThirdPractice','SprintQualifying','Sprint','Qualifying'];
function raceAction(data, published, races, now){
 if(['live','stale','waiting','auth_required'].includes(data?.state)){
  const start=Date.parse(data.session?.date_start),end=Date.parse(data.session?.date_end);
  if(start<=now&&now<=end)return 'live';
 }
 if(!published)return 'schedule';
 const next=races.find(r=>+dateOf(r)>now);
 if(next){
  const starts=weekendSessions.map(key=>next[key]).filter(slot=>slot?.time).map(slot=>+dateOf(slot)).filter(Number.isFinite);
  if(now>=Math.min(+dateOf(next),...starts)-48*60*60*1000)return 'schedule';
 }
 const laterRace=races.some(r=>+dateOf(r)<=now&&+dateOf(r)>+dateOf(published));
 return laterRace?'schedule':'results';
}
function renderRaceAction(){
 const action=raceAction(timingSnapshot,latestPublishedRace,state.races,Date.now());
 const spoilers=document.documentElement.dataset?.spoilerFree==='true';
 $('#overview-race-action').dataset.raceAction=action;
 $('#overview-race-label').textContent=action==='live'?(spoilers?'Open Race Center':timingSnapshot.state==='live'?'Watch live timing':'Check session timing'):action==='results'?(spoilers?'Reveal results':'View results'):'View schedule';
}
function initRaceCenterShortcuts(){
 const pinsKey='apex-race-center-pins-v1', panel=$('#timing-pins');
 let pinned=[];
 try{const saved=JSON.parse(localStorage.getItem(pinsKey));if(Array.isArray(saved))pinned=[...new Set(saved.filter(id=>typeof id==='string'))].slice(0,2);}catch{}
 function savePins(){
  try{localStorage.setItem(pinsKey,JSON.stringify(pinned));}catch{}
  renderPins();
 }
 function renderPins(){
  const favourites=window.PersonalPaddock.favouriteRoster();
  const selected=pinned.map(id=>favourites.find(driver=>driver.id===id)).filter(Boolean);
  const available=favourites.filter(driver=>!pinned.includes(driver.id));
  const picker=selected.length<2&&available.length?'<label>Pin a favourite <select id="timing-pin-picker"><option value="">Choose a driver</option>'+available.map(driver=>'<option value="'+esc(driver.id)+'">'+esc(driver.name)+'</option>').join('')+'</select></label>':'';
  const cards=selected.map(driver=>'<li><span>'+esc(driver.name)+' <small data-pin-timing="'+esc(driver.id)+'"></small></span><button type="button" class="text-btn" data-unpin="'+esc(driver.id)+'" aria-label="Unpin '+esc(driver.name)+'">Unpin</button></li>').join('');
  panel.innerHTML='<h3>Pinned drivers</h3>'+(cards?'<ul>'+cards+'</ul>':'')+picker+(favourites.length?'':'<button type="button" class="text-btn" data-choose-favourites>Choose favourites in My Paddock ↗</button>')+(selected.length===2?'<button type="button" class="text-btn" data-pinned-duel>Compare in Driver Duel ↗</button>':'');
  const pickerElement=panel.querySelector('#timing-pin-picker');
  if(pickerElement)pickerElement.onchange=()=>{
   if(!available.some(driver=>driver.id===pickerElement.value))return;
   pinned=[...selected.map(driver=>driver.id),pickerElement.value];
   savePins();
   panel.querySelector('#timing-pin-picker, [data-pinned-duel]')?.focus();
  };
  for(const button of panel.querySelectorAll('[data-unpin]'))button.onclick=()=>{
   pinned=pinned.filter(id=>id!==button.dataset.unpin);
   savePins();
   panel.querySelector('#timing-pin-picker, [data-choose-favourites]')?.focus();
  };
  const paddockLink=panel.querySelector('[data-choose-favourites]');
  if(paddockLink)paddockLink.onclick=()=>location.hash='paddock';
  const duel=panel.querySelector('[data-pinned-duel]');
  if(duel){
   duel.disabled=!latestPublishedRace;
   duel.title=latestPublishedRace?'Compare in the latest completed race':'Waiting for a published race classification';
   duel.onclick=()=>openDriverDuel(latestPublishedRace,selected.map(driver=>driver.id));
  }
  updatePinTiming(timingSnapshot?.rows);
 }
 function namesMatch(row,driver){
  const normalize=name=>name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z]/g,'');
  const surname=driver.name.split(' ').at(-1);
  return normalize(row.name)===normalize(driver.name)||
   (row.acronym&&normalize(row.acronym)===normalize(surname).slice(0,3)&&normalize(row.name).endsWith(normalize(surname)));
 }
 function updatePinTiming(rows=[]){
  const favourites=window.PersonalPaddock.favouriteRoster();
  for(const label of panel.querySelectorAll('[data-pin-timing]')){
   const driver=favourites.find(item=>item.id===label.dataset.pinTiming);
   const row=driver&&rows.find(item=>namesMatch(item,driver));
   label.textContent=row?.position||row?.lap?[row.position&&'P'+row.position,row.lap&&'Lap '+row.lap,row.lapTime&&timingLap(row.lapTime)].filter(Boolean).join(' · '):'Timing unavailable';
  }
  const duel=panel.querySelector('[data-pinned-duel]');
  if(duel){duel.disabled=!latestPublishedRace;duel.title=latestPublishedRace?'Compare in the latest completed race':'Waiting for a published race classification';}
 }
 $('#overview-race-action').onclick=()=>{
  const action=$('#overview-race-action').dataset.raceAction;
  if(action==='schedule'){location.hash='calendar';return;}
  if(action==='results'&&document.documentElement.dataset.spoilerFree==='true')$('#results-table').setAttribute('data-results-revealed','');
  location.hash='timing';
  setTimingMode('results');
  const target=$(action==='live'?'#live-timing-section':'#published-results-section');
  requestAnimationFrame(()=>{target.scrollIntoView({block:'start'});target.focus({preventScroll:true});});
 };
 window.addEventListener('apex:paddock-change',renderPins);
 window.addEventListener('apex:timing-update',()=>updatePinTiming(timingSnapshot?.rows));
 renderPins();
}
function timingLap(seconds){if(!Number.isFinite(Number(seconds))||Number(seconds)<=0)return '—';const ms=Math.round(Number(seconds)*1000);return Math.floor(ms/60000)+':'+String(Math.floor(ms%60000/1000)).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0')}
function renderTiming(data){
 const labels={live:'LIVE TIMING',ended:'SESSION ENDED',scheduled:'UPCOMING SESSION',waiting:'AWAITING TIMING',stale:'TIMING DELAYED',auth_required:'TIMING UNAVAILABLE',unavailable:'FEED UNAVAILABLE'};
 const label=labels[data.state]||labels.unavailable,session=data.session;
 const isLive=data.state==='live';
 renderRaceAction();
 const sections=$('#timing-sections');
 const lead=isLive?$('#live-timing-section'):$('#published-results-section');
 if(sections.firstElementChild!==lead)sections.prepend(lead);
 const message=data.state==='auth_required'
  ?'Live timing is unavailable right now. You can still view published results or check the session schedule.'
  :data.message;
 $('#session-status').innerHTML='<span class="dot"></span> '+label;
 $('#session-status').classList.toggle('green',data.state==='live');
 $('#latest-session-state').textContent=label;
 $('#latest-session-state').classList.toggle('green',data.state==='live');
 $('#session-summary').textContent=session?[session.country_name,session.circuit_short_name,session.session_name].filter(Boolean).join(' · '):'Latest session timing';
 const focused=document.activeElement;
 const scroll=$('#latest-session .timing-scroll'),scrollTop=scroll?.scrollTop||0,scrollLeft=scroll?.scrollLeft||0;
 const rows=data.rows||[];
 const markup='<div class="timing-intro"><div class="eyebrow">OPENF1 / '+esc(session?.year||'SESSION')+'</div><h3>'+esc(session?[session.circuit_short_name,session.session_name].filter(Boolean).join(' · '):'Timing unavailable')+'</h3><p role="status">'+esc(message)+'</p>'+(data.dataAt?'<div class="source">LAST UPDATE · <time datetime="'+esc(data.dataAt)+'">'+esc(new Date(data.dataAt).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}))+'</time></div>':'')+'</div>'+(rows.length?'<div class="timing-scroll" tabindex="0" role="region" aria-label="Session leaderboard"><table class="data-table timing-table"><caption class="timing-caption">'+(data.state==='live'?'Current positions':data.state==='ended'?'Last available session positions':'Last received positions')+' · lap means last completed lap</caption><thead><tr><th scope="col">POS</th><th scope="col">DRIVER</th><th scope="col">LAP</th><th scope="col">LAST LAP</th></tr></thead><tbody>'+rows.map(row=>'<tr><td class="timing-position">'+esc(row.position||'—')+'</td><td><div class="timing-driver" style="--driver-colour:'+(/^#[a-f\d]{6}$/i.test(row.colour)?row.colour:'#919198')+'"><b>'+esc(row.name)+'</b><small>'+esc(row.team)+' · #'+esc(row.number)+'</small></div></td><td>'+esc(row.lap||'—')+'</td><td class="timing-lap">'+esc(timingLap(row.lapTime))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="timing-empty">'+(data.state==='ended'?'No timing was published for this session.':'Driver positions and completed laps will appear here when available.')+'</div>')+'<div class="timing-footer"><a class="text-btn" href="https://openf1.org/" target="_blank" rel="noopener">Data from OpenF1 ↗</a><button class="refresh" data-retry-session>Refresh ↻</button></div>';
 if(markup===timingPanelMarkup)return;
 timingPanelMarkup=markup;
 $('#latest-session').innerHTML=markup;
 const nextScroll=$('#latest-session .timing-scroll');if(nextScroll){nextScroll.scrollTop=scrollTop;nextScroll.scrollLeft=scrollLeft;if(scroll&&focused===scroll)nextScroll.focus({preventScroll:true});}
 const refresh=$('#latest-session [data-retry-session]');refresh.onclick=loadSession;
 if(focused?.matches('[data-retry-session]'))refresh.focus({preventScroll:true});
}
function loadSession(){
 if(timingRequest)return timingRequest;
 clearTimeout(timingTimer);
 timingRequest=(async()=>{
  let delay=30000;
  try{
   const data=await api('live-timing',30000);
   const previous=timingSnapshot;
   const sameSession=!data.session||data.session.session_key===previous?.session?.session_key;
   const interruption=['unavailable','auth_required','stale','ended'].includes(data.state);
   timingSnapshot=interruption&&sameSession&&!data.rows?.length&&previous?.rows?.length
    ?{...data,state:data.state==='ended'||(!data.session&&previous.state==='ended')?'ended':'stale',session:data.session||previous.session,rows:previous.rows,dataAt:previous.dataAt}
    :data;
   renderTiming(timingSnapshot);
   delay=Math.max(5000,Math.min(300000,(Number(data.retryAfter)||30)*1000));
  }
  catch{timingSnapshot={...timingSnapshot,state:timingSnapshot?.state==='ended'?'ended':timingSnapshot?.rows?.length?'stale':'unavailable',message:'Connection lost. Showing any last received timing and retrying automatically.'};renderTiming(timingSnapshot);}
  finally{timingRequest=null;if(typeof window!=='undefined')window.dispatchEvent(new Event('apex:timing-update'));if(!document.hidden)timingTimer=setTimeout(loadSession,delay);}
 })();return timingRequest;
}
document.addEventListener('visibilitychange',()=>{clearTimeout(timingTimer);if(!document.hidden)loadSession()});
/* LIVE_TIMING_UI_END */
