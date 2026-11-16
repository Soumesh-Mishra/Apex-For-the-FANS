/* PADDOCK_UI_START */
(()=>{
 const roster=__PADDOCK_ROSTER__,KEY='apex-personal-paddock-v1',root=$('#paddock-view');if(!root)return;
 const freshEntry=()=>({profile:PaddockRules.defaults(),pending:[],dirty:false,importedFor:null,hasImported:false});
 function readCache(){try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.version===1&&saved.entries&&/^(device|[a-f\d]{64})$/.test(saved.scope)){for(const entry of Object.values(saved.entries)){entry.profile=PaddockRules.apply(entry.profile,[]);if(!Array.isArray(entry.pending)||entry.pending.length>250)entry.pending=[];}if(saved.entries.device&&saved.entries[saved.scope])return saved;}}catch{}
  const entry=freshEntry();try{const legacyTeam=localStorage.getItem('apex-team'),legacySpoilers=localStorage.getItem('apex-spoiler-free');if(legacyTeam){entry.profile.team=TeamThemes.resolve(legacyTeam).id;entry.dirty=true;}if(legacySpoilers!==null){entry.profile.spoilerFree=legacySpoilers==='true';entry.dirty=true;}}catch{}return {version:1,scope:'device',entries:{device:entry}};
 }
 let cache=readCache(),mode='device',accountName='',syncing=false,cloud=null,review='',volatile=false,pinned=false,timer;
 const entry=()=>cache.entries[cache.scope];
 const message=(text,error=false)=>{const node=$('#paddock-feedback');node.textContent=text;node.classList.toggle('error',error);};
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(cache));volatile=false;return true;}catch{volatile=true;return false;}}
 function enqueue(target,operation){const id=crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random();const item={...operation,id};target.pending=target.pending.filter(op=>PaddockRules.opKey(op)!==PaddockRules.opKey(item));if(target.pending.length>=250)throw Error('Reconnect to sync before adding more changes.');target.pending.push(item);}
 function applyPreferences(){
  const profile=entry().profile;
  if(document.documentElement.dataset.team!==profile.team)selectTeamTheme(profile.team,false);
  // A remote refresh must never unexpectedly reveal results on this device.
  pinned=document.documentElement.dataset.spoilerFree==='true'&&!profile.spoilerFree;
  const hide=profile.spoilerFree||pinned;SpoilerMode.apply(hide);updateSpoilerControls();
  try{localStorage.setItem('apex-team',profile.team);localStorage.setItem('apex-spoiler-free',String(hide));}catch{volatile=true;}
 }
 function changed(){applyPreferences();render();window.dispatchEvent(new CustomEvent('apex:paddock-change'));}
 function mutate(operation){
  try{
   // Read the most recent local snapshot before editing so another tab's changes
   // are not overwritten by a stale in-memory copy.
   const latest=volatile?null:readCache();if(latest?.scope===cache.scope)cache=latest;
   const target=entry(),profile=PaddockRules.apply(target.profile,[operation]);
   if(cache.scope!=='device')enqueue(target,operation);else{target.dirty=true;target.importedFor=null;}
   target.profile=profile;review='';persist();changed();
   message(volatile?'This browser could not save the change. Keep this page open until account sync completes.':cache.scope==='device'?'Saved on this device.':'Saved on this device · syncing to your account…',volatile);
   if(cache.scope!=='device'){clearTimeout(timer);timer=setTimeout(sync,500);}
   return true;
  }catch(error){message(error.message,true);if(typeof toast==='function')toast(error.message);return false;}
 }
 async function request(method='GET',body){const response=await fetch('/api/paddock',{method,cache:'no-store',signal:AbortSignal.timeout(12000),headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});let result;try{result=await response.json();}catch{throw Error('Account sync could not load. Your device changes are still available.');}if(!response.ok){const error=Error(result.error||'Account sync is unavailable.');error.status=response.status;error.reason=result.reason;error.profile=result.profile;throw error;}return result;}
 async function sync(){
  if(syncing)return;syncing=true;$('#paddock-sync').disabled=true;
  try{
   let result=await request();
   if(result.mode!=='account'){
    cache.scope='device';mode='device';accountName='';cloud=null;review='';persist();changed();return;
   }
   if(!/^[a-f\d]{64}$/.test(result.accountKey))throw Error('Invalid account sync response.');
   const owner=result.accountKey;accountName=result.name||'F1 fan';cloud=result;mode='account';
   if(cache.scope!==owner){cache.scope=owner;cache.entries[owner]=cache.entries[owner]||freshEntry();}
   const target=entry();
   if(!result.exists&&cache.entries.device.dirty&&!cache.entries.device.hasImported&&!cache.entries.device.importedFor&&!target.pending.length){for(const operation of PaddockRules.seed(cache.entries.device.profile))enqueue(target,operation);cache.entries.device.importedFor=owner;cache.entries.device.hasImported=true;}
   target.profile=PaddockRules.apply(result.profile,target.pending);persist();changed();
   while(entry().pending.length){
    const batch=entry().pending.slice(0,25);result=await request('PATCH',{accountKey:owner,operations:batch});
    if(result.accountKey!==owner)throw Error('Your account changed. Reload before syncing.');
    // Keep edits made in another tab or while this request was in flight.
    const latest=volatile?null:readCache();if(latest?.scope===owner)cache=latest;
    const ids=new Set(batch.map(op=>op.id));entry().pending=entry().pending.filter(op=>!ids.has(op.id));
    entry().profile=PaddockRules.apply(result.profile,entry().pending);cloud=result;persist();changed();
   }
   review='';entry().updatedAt=result.updatedAt;persist();render();
  }catch(error){
   if(error.reason==='account_changed'||error.status===401){mode='offline';message('Your sign-in changed. Sync again to load the current account. Pending edits stay with their original account.',true);}
   else if(error.status===409||/up to (five|100)/.test(error.message)){review=error.message;if(error.profile)cloud={...cloud,profile:error.profile};mode='review';message('Account sync needs a review. Your device changes have been kept.',true);}
   else{mode='offline';message('Offline or sync unavailable. Your changes are saved on this device and will retry when connected.',true);}
   render();
  }finally{syncing=false;$('#paddock-sync').disabled=false;}
 }
 function render(){
  const profile=entry().profile,team=TeamThemes.resolve(profile.team),pending=entry().pending.length;
  $('#paddock-greeting').textContent=cache.scope==='device'?'YOUR PIT WALL':accountName?'WELCOME, '+accountName:'YOUR SAVED ACCOUNT PADDOCK';
  $('#paddock-team-title').textContent=team.id==='apex'?'For the fans. For you.':team.name+' at heart.';
  const image=$('#paddock-team-logo');image.hidden=!team.logo;if(team.logo){image.src=team.logo;image.alt=team.name+' logo';}
  $('#paddock-signin').hidden=mode==='account'||mode==='review';
  $('#paddock-sync-label').textContent=volatile?'Browser storage is unavailable. Unsynced changes last only while this page stays open.':mode==='review'?'Your account and this device need a quick review.':mode==='offline'?'Device copy available · account sync will retry when connected.':mode==='account'?(pending?pending+' changes waiting to sync.':'Account connected · preferences sync across signed-in devices.')+(pinned?' Spoilers stay hidden on this device until you turn them off.':''):'Saved on this device · sign in on a connected APEX server for account sync.';
  $('#paddock-team').innerHTML=[TeamThemes.fallback,...TeamThemes.teams].map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');$('#paddock-team').value=profile.team;
  $('#paddock-spoilers').checked=document.documentElement.dataset.spoilerFree==='true';
  $('#paddock-driver-count').textContent=profile.favouriteDrivers.length;$('#paddock-race-count').textContent=profile.savedRaces.length;
  $('#paddock-import').hidden=mode!=='account'||!cache.entries.device.dirty||cache.entries.device.importedFor===cache.scope;
  $('#paddock-conflict').hidden=!review;$('#paddock-conflict-message').textContent=review;
  const known=new Set(roster.drivers.map(d=>d.id)),catalog=[...roster.drivers,...profile.favouriteDrivers.filter(id=>!known.has(id)).map(id=>({id,name:id.replaceAll('_',' '),team:'Saved from an earlier roster'}))];
  const query=$('#paddock-driver-search').value.trim().toLowerCase(),only=$('#paddock-favourites-only').checked;
  const drivers=catalog.filter(d=>(!only||profile.favouriteDrivers.includes(d.id))&&[d.name,d.team].join(' ').toLowerCase().includes(query)).sort((a,b)=>Number(profile.favouriteDrivers.includes(b.id))-Number(profile.favouriteDrivers.includes(a.id))||a.name.localeCompare(b.name));
  $('#paddock-drivers').innerHTML=drivers.length?drivers.map(driver=>{const favourite=profile.favouriteDrivers.includes(driver.id),colour=TeamThemes.resolve(driver.team).primary;return '<article class="paddock-driver '+(favourite?'is-favourite':'')+'" style="--driver-colour:'+colour+'"><div><h3>'+esc(driver.name)+'</h3><p>'+esc(driver.team)+'</p></div><button class="paddock-star" data-paddock-driver="'+esc(driver.id)+'" aria-pressed="'+favourite+'" aria-label="'+(favourite?'Remove ':'Follow ')+esc(driver.name)+'">'+(favourite?'★':'☆')+'</button></article>';}).join(''):'<div class="paddock-empty">No drivers match. Choose some favourites or clear the search.</div>';
  $('#paddock-roster-date').textContent=roster.season+' driver roster · saved '+new Date(roster.checkedAt).toLocaleDateString();
  $('#paddock-races').innerHTML=profile.savedRaces.length?[...profile.savedRaces].reverse().map(race=>'<article class="paddock-race"><div class="small">'+race.season+' · ROUND '+race.round+'</div><h3>'+esc(race.name)+'</h3><p>'+esc(race.circuit)+'<br>'+esc(new Date(race.date+'T12:00:00Z').toLocaleDateString([], {year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}))+'</p><div class="paddock-actions"><button class="refresh" data-paddock-open="'+race.key+'">Open race ↗</button><button class="text-btn" data-paddock-remove="'+race.key+'" aria-label="Remove '+esc(race.name)+' from saved races">Remove</button></div></article>').join(''):'<div class="paddock-empty">Your next great race is waiting. Use “Save to paddock” in the calendar or historical race library.</div>';
  root.querySelectorAll('[data-paddock-driver]').forEach(button=>button.onclick=()=>toggleDriver(button.dataset.paddockDriver));
  root.querySelectorAll('[data-paddock-remove]').forEach(button=>button.onclick=()=>mutate({type:'race-remove',value:button.dataset.paddockRemove}));
  root.querySelectorAll('[data-paddock-open]').forEach(button=>button.onclick=()=>{
   const race=entry().profile.savedRaces.find(r=>r.key===button.dataset.paddockOpen);if(!race)return;
   if(Date.parse(race.date+'T23:59:59Z')>Date.now()&&state.races.some(r=>r.season+'-'+r.round===race.key)){
    $('#race-search').value=race.name;state.scope='all';$$('#calendar-tabs [data-scope]').forEach(button=>button.classList.toggle('selected',button.dataset.scope==='all'));location.hash='calendar';$('#calendar-layout [data-layout="list"]').click();renderCalendar();
   }else{location.hash='timing';requestAnimationFrame(()=>{setTimingMode('library');openLibraryRace({season:String(race.season),round:String(race.round),raceName:race.name,date:race.date,Circuit:{circuitName:race.circuit}});});}
  });
 }
 const toggleDriver=id=>mutate({type:entry().profile.favouriteDrivers.includes(id)?'driver-remove':'driver-add',value:id});
 const toggleRace=value=>{try{const race=PaddockRules.race(value);const saved=entry().profile.savedRaces.some(r=>r.key===race.key),ok=mutate({type:saved?'race-remove':'race-save',value:saved?race.key:race});if(ok&&typeof toast==='function')toast(saved?'Race removed from your paddock.':'Race saved to your paddock.');return ok;}catch(error){message(error.message,true);if(typeof toast==='function')toast(error.message);return false;}};
 window.PersonalPaddock={profile:()=>structuredClone(entry().profile),setTeam:value=>mutate({type:'team',value}),setSpoilers:value=>mutate({type:'spoilers',value}),toggleDriver,toggleRace,hasRace:key=>entry().profile.savedRaces.some(r=>r.key===key),sync};
 $('#paddock-team').onchange=event=>mutate({type:'team',value:event.target.value});$('#paddock-spoilers').onchange=event=>{SpoilerMode.apply(event.target.checked);mutate({type:'spoilers',value:event.target.checked});};
 $('#paddock-driver-search').oninput=render;$('#paddock-favourites-only').onchange=render;$('#paddock-sync').onclick=sync;
 $('#paddock-import-button').onclick=()=>{try{const operations=PaddockRules.seed(cache.entries.device.profile),profile=PaddockRules.apply(entry().profile,operations);for(const operation of operations)enqueue(entry(),operation);entry().profile=profile;cache.entries.device.importedFor=cache.scope;cache.entries.device.hasImported=true;persist();changed();sync();}catch(error){review=error.message;render();message(error.message,true);}};
 $('#paddock-use-account').onclick=()=>{if(!cloud?.profile)return;entry().pending=[];entry().profile=PaddockRules.apply(cloud.profile,[]);review='';mode='account';persist();changed();message('Account settings loaded. Pending device edits were discarded.');};
 window.addEventListener('storage',event=>{if(event.key===KEY&&!volatile){cache=readCache();changed();}else if(event.key==='apex-team'&&event.newValue&&TeamThemes.resolve(event.newValue).id!==entry().profile.team)mutate({type:'team',value:TeamThemes.resolve(event.newValue).id});else if(event.key===SpoilerMode.key&&event.newValue!==null&&(event.newValue==='true')!==entry().profile.spoilerFree){SpoilerMode.apply(event.newValue==='true');mutate({type:'spoilers',value:event.newValue==='true'});}});
 window.addEventListener('online',sync);window.addEventListener('hashchange',()=>{if(location.hash==='#paddock')sync();});document.addEventListener('visibilitychange',()=>{if(!document.hidden&&location.hash==='#paddock')sync();});
 setInterval(()=>{if(!document.hidden&&location.hash==='#paddock'&&!review)sync();},60000);
 function bookmarkButton(race){const button=document.createElement('button'),saved=entry().profile.savedRaces.some(r=>r.key===race.season+'-'+race.round);button.className='refresh paddock-bookmark';button.type='button';button.textContent=saved?'Saved to paddock ★':'Save to paddock ☆';button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',(saved?'Remove ':'Save ')+race.raceName+(saved?' from':' to')+' your paddock');button.onclick=()=>toggleRace(race);return button;}
 if(typeof renderRaceLibrary==='function'){
  const renderLibrary=renderRaceLibrary;renderRaceLibrary=function(){renderLibrary();$$('[data-library-race]').forEach(button=>{const race=libraryState.races.find(r=>libraryKey(r)===button.dataset.libraryRace);if(race)button.parentElement.append(bookmarkButton(race));});};
  $('#library-search').oninput=renderRaceLibrary;$('#library-replay-only').onchange=renderRaceLibrary;
 }
 if(typeof renderCalendar==='function'){
  const renderCards=renderCalendar;renderCalendar=function(){renderCards();$$('#calendar-list [data-add]').forEach(button=>{const race=state.races.find(r=>String(r.round)===button.dataset.add);if(race)button.parentElement.append(bookmarkButton(race));});};$('#race-search').oninput=renderCalendar;
 }
 if(typeof renderMonthCalendar==='function'){
  const renderMonth=renderMonthCalendar;renderMonthCalendar=function(){renderMonth();if($('#month-calendar').hidden)return;$$('[data-month-add]').forEach(button=>{const race=state.races.find(r=>String(r.round)===button.dataset.monthAdd);if(race)button.parentElement.append(bookmarkButton(race));});};
 }
 function decorateStandings(){$$('[data-paddock-driver-row]').forEach(row=>{const favourite=entry().profile.favouriteDrivers.includes(row.dataset.paddockDriverRow);row.classList.toggle('paddock-favourite-row',favourite);row.querySelector('.paddock-favourite-marker')?.remove();if(favourite){const marker=document.createElement('span');marker.className='paddock-favourite-marker';marker.textContent='★';marker.setAttribute('aria-label','Favourite driver');marker.setAttribute('role','img');row.querySelector('.driver>span:last-child')?.prepend(marker);}});}
 if(typeof renderStandings==='function'){const renderTable=renderStandings;renderStandings=function(){renderTable();decorateStandings();};}
 window.addEventListener('apex:paddock-change',()=>{if(typeof renderRaceLibrary==='function')renderRaceLibrary();if(state.races.length)renderCalendar();decorateStandings();});
 persist();changed();sync();
})();
/* PADDOCK_UI_END */
