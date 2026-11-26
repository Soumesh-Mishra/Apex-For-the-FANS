/* LIVE_TIMING_UI_START */
let timingTimer, timingRequest, timingSnapshot, timingPanelMarkup, latestPublishedRace, overviewNextSessionAt;
const weekendSessions={FirstPractice:'Practice 1',SecondPractice:'Practice 2',ThirdPractice:'Practice 3',SprintQualifying:'Sprint qualifying',Sprint:'Sprint',Qualifying:'Qualifying'};
function nextWeekendSession(races,now){
 for(const race of races){
  const slots=[{name:'Race',at:+dateOf(race)},...Object.entries(weekendSessions).filter(([key])=>race[key]?.time).map(([key,name])=>({name,at:+dateOf(race[key])}))];
  const upcoming=slots.filter(slot=>slot.at>now).sort((a,b)=>a.at-b.at)[0];
  if(upcoming)return {...upcoming,race};
 }
}
function activeTiming(data,now){
 if(!['live','stale','waiting','auth_required','unavailable'].includes(data?.state))return false;
 return Date.parse(data.session?.date_start)<=now&&now<=Date.parse(data.session?.date_end);
}
function renderRaceAction(){
 const now=Date.now(),next=nextWeekendSession(state.races,now),active=activeTiming(timingSnapshot,now);
 const action=active?'session':'calendar';
 const protectedMode=document.documentElement.dataset?.spoilerFree==='true';
 overviewNextSessionAt=next?.at;
 $('#next-session-name').textContent=next?.name||(state.races.length?'Season complete':'Schedule unavailable');
 if(next){
  $('#next-name').textContent=next.race.raceName.replace('Grand Prix','GP');
  const time=new Date(next.at);
  $('#race-date').textContent=fmtDate(time)+' · '+fmtTime(time);
 }
 $('#overview-race-action').dataset.raceAction=action;
 $('#overview-race-label').textContent=active?(protectedMode?'Open session':timingSnapshot.state==='live'?'Watch live timing':'Check session timing'):'View schedule';
 const results=$('#overview-results-action');
 results.hidden=!latestPublishedRace;
 if(latestPublishedRace)results.textContent=(protectedMode?'Reveal ':'')+latestPublishedRace.raceName+' results';
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
  if($('#overview-race-action').dataset.raceAction==='session')setTimingMode('session');
  else location.hash='calendar';
 };
 $('#overview-results-action').onclick=()=>{
  setTimingMode('results');
  if(document.documentElement.dataset.spoilerFree==='true')revealSpoilerPanel($('#results-table'));
 };
 window.addEventListener('apex:paddock-change',renderPins);
 window.addEventListener('apex:timing-update',()=>updatePinTiming(timingSnapshot?.rows));
 renderPins();
}
function timingLap(seconds){if(!Number.isFinite(Number(seconds))||Number(seconds)<=0)return '—';const ms=Math.round(Number(seconds)*1000);return Math.floor(ms/60000)+':'+String(Math.floor(ms%60000/1000)).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0')}
function renderTiming(data){
 const labels={live:'LIVE TIMING',ended:'SESSION ENDED',scheduled:'UPCOMING SESSION',waiting:'AWAITING TIMING',stale:'TIMING DELAYED',auth_required:'TIMING UNAVAILABLE',unavailable:'FEED UNAVAILABLE'};
 const label=labels[data.state]||labels.unavailable,session=data.session;
 renderRaceAction();
 const isLive=data.state==='live';
 const leadingStatus=$('#session-status');
 const statusMarkup='<span class="dot"></span> '+label;
 if(leadingStatus.innerHTML!==statusMarkup)leadingStatus.innerHTML=statusMarkup;
 leadingStatus.classList.toggle('green',isLive);
 setTimingText('#latest-session-state',label);
 $('#latest-session-state').classList.toggle('green',isLive);
 setTimingText('#session-summary',session?[session.country_name,session.circuit_short_name,session.session_name].filter(Boolean).join(' · '):'Latest session timing');
 const message=data.state==='auth_required'
  ?'Live timing is unavailable right now. You can still view published results or check the session schedule.'
  :data.message;
 setTimingText('#timing-message',message||'Waiting for timing.');
 const timestamp=Date.parse(data.dataAt);
 const updated=$('#timing-updated');
 $('#timing-freshness').hidden=!Number.isFinite(timestamp);
 if(Number.isFinite(timestamp)){
  updated.dateTime=data.dataAt;
  setTimingText('#timing-updated',new Date(timestamp).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}));
 }
 updateTimingAge();
 const rows=data.rows||[];
 const scroll=$('#latest-session .timing-scroll');
 scroll.classList.toggle('hidden',!rows.length);
 $('#timing-empty').hidden=Boolean(rows.length);
 setTimingText('#timing-empty',data.state==='ended'?'No timing was published for this session.':'Driver positions and completed laps will appear here when available.');
 setTimingText('#timing-caption',(isLive?'Current positions':data.state==='ended'?'Last available session positions':'Last received positions')+' · lap means last completed lap');
 const markup=rows.map(row=>'<tr><td class="timing-position">'+esc(row.position||'—')+'</td><td><div class="timing-driver" style="--driver-colour:'+(/^#[a-f\d]{6}$/i.test(row.colour)?row.colour:'#919198')+'"><b>'+esc(row.name)+'</b><small>'+esc(row.team)+' · #'+esc(row.number)+'</small></div></td><td>'+esc(row.lap||'—')+'</td><td class="timing-lap">'+esc(timingLap(row.lapTime))+'</td></tr>').join('');
 if(markup!==timingPanelMarkup){
  timingPanelMarkup=markup;
  const {scrollTop,scrollLeft}=scroll;
  $('#timing-rows').innerHTML=markup;
  scroll.scrollTop=scrollTop;
  scroll.scrollLeft=scrollLeft;
 }
}
function setTimingText(selector,text){
 const node=$(selector);
 if(node.textContent!==text)node.textContent=text;
}
function updateTimingAge(){
 const timestamp=Date.parse(timingSnapshot?.dataAt);
 const minutes=Math.max(0,Math.floor((Date.now()-timestamp)/60000));
 const age=!Number.isFinite(timestamp)||timingSnapshot.state==='ended'?'':minutes===0?' · less than 1 min ago':minutes<60?' · '+minutes+' min ago':minutes<1440?' · '+Math.floor(minutes/60)+' hr ago':' · '+Math.floor(minutes/1440)+' days ago';
 setTimingText('#timing-age',age);
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
   if(previous?.session&&!sameSession)$('#latest-session').removeAttribute('data-spoiler-revealed');
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
$('#retry-timing').onclick=loadSession;
document.addEventListener('visibilitychange',()=>{clearTimeout(timingTimer);if(!document.hidden)loadSession()});
/* LIVE_TIMING_UI_END */
