/* LIBRARY_UI_START */
const libraryFeatured=__LIBRARY_FEATURED__;
const libraryState={races:libraryFeatured,request:0,resultRequest:0,cache:new Map()};
function libraryReplay(r){return String(r.season)==='2024'?({'1':'bahrain-2024','8':'monaco-2024'}[String(r.round)]||null):null}
function libraryKey(r){return String(r.season)+'-'+String(r.round)}
function renderRaceLibrary(){
 const q=$('#library-search').value.trim().toLowerCase(),only=$('#library-replay-only').checked;
 const races=libraryState.races.filter(r=>(!only||libraryReplay(r))&&[r.raceName,r.Circuit?.circuitName,r.Circuit?.Location?.country,r.season].join(' ').toLowerCase().includes(q));
 $('#library-grid').innerHTML=races.length?races.map(r=>{const replayId=libraryReplay(r);return '<article class="library-card"><div class="small">'+esc(r.season)+' · ROUND '+esc(r.round)+'</div><h3>'+esc(r.raceName)+'</h3><p>'+esc(r.Circuit.circuitName)+'</p><time>'+esc(new Intl.DateTimeFormat(undefined,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(r.date+'T12:00:00Z')))+'</time><span class="library-availability">'+(replayId?'● Recorded clip · 5 minutes':'Published results archive')+'</span><div class="library-actions"><button class="text-btn" data-library-race="'+esc(libraryKey(r))+'">Open race archive ↗</button>'+(replayId?'<button class="primary" data-library-replay="'+esc(replayId)+'">Open replay ↗</button>':'')+'<button class="text-btn" data-library-duel="'+esc(libraryKey(r))+'">Driver duel ↗</button></div></article>'}).join(''):'<div class="panel empty">No races match these filters. Try another season or clear your search.</div>';
 $$('[data-library-race]').forEach(b=>b.onclick=()=>openLibraryRace(libraryState.races.find(r=>libraryKey(r)===b.dataset.libraryRace)));
 $$('[data-library-duel]').forEach(b=>b.onclick=()=>openDriverDuel(libraryState.races.find(r=>libraryKey(r)===b.dataset.libraryDuel)));
 $$('[data-library-replay]').forEach(b=>b.onclick=()=>openLibraryReplay(b.dataset.libraryReplay));
}
async function loadLibrarySeason(){
 const request=++libraryState.request,season=$('#library-season').value;libraryState.resultRequest++;$('#library-detail').hidden=true;
 if(season==='featured'){libraryState.races=libraryFeatured;$('#library-status').textContent='Featured archive · choose a season to explore its full race list.';renderRaceLibrary();return}
 libraryState.races=[];$('#library-grid').innerHTML='<div class="panel empty">Loading the '+esc(season)+' season…</div>';$('#library-status').textContent='Checking Jolpica F1…';
 try{let data=libraryState.cache.get(season);if(!data){data=await api('race-library?season='+encodeURIComponent(season));libraryState.cache.set(season,data)}if(request!==libraryState.request)return;const races=data.MRData?.RaceTable?.Races;if(!Array.isArray(races))throw Error();libraryState.races=races.filter(r=>String(r.season)===season&&r.Circuit&&r.date&&r.raceName);$('#library-status').textContent=season+' season · '+libraryState.races.length+' races · Jolpica F1';renderRaceLibrary()}
 catch{if(request!==libraryState.request)return;$('#library-status').textContent='Season archive unavailable. Use Reload archive to retry, or choose Featured races.';$('#library-grid').innerHTML='<div class="panel empty">The archive feed could not be reached. The bundled featured races and recorded clips are still available.</div>'}
}
async function openLibraryRace(r){
 if(!r)return;const request=++libraryState.resultRequest;setReplayPlaying(false);$('#library-detail').hidden=false;$('#library-detail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});$('#library-detail-title').textContent=r.season+' · '+r.raceName;$('#library-result').innerHTML='<div class="empty">Loading published classification…</div>';
 try{const data=await api('race-library?season='+encodeURIComponent(r.season)+'&round='+encodeURIComponent(r.round));if(request!==libraryState.resultRequest)return;const race=data.MRData?.RaceTable?.Races?.find(x=>libraryKey(x)===libraryKey(r)),rows=race?.Results;
 if(!rows?.length){$('#library-result').innerHTML='<div class="empty">No classification is published for this race.</div>';return}
 $('#library-result').innerHTML='<div class="disclaimer">'+esc(race.date)+' · '+esc(race.Circuit.circuitName)+' · Published race classification</div><div class="library-table"><table class="data-table"><thead><tr><th>POS</th><th>DRIVER</th><th>TEAM</th><th>TIME / STATUS</th><th>PTS</th></tr></thead><tbody>'+rows.map(d=>'<tr><td>'+esc(d.position)+'</td><td>'+esc(d.Driver?.givenName+' '+d.Driver?.familyName)+'</td><td>'+esc(d.Constructor?.name)+'</td><td>'+esc(d.Time?.time||d.status)+'</td><td>'+esc(d.points)+'</td></tr>').join('')+'</tbody></table></div><div class="disclaimer">Jolpica F1 archive · historical results</div>';
 }catch{if(request===libraryState.resultRequest)$('#library-result').innerHTML='<div class="empty">The race archive could not be loaded. Open this race again to retry.</div>'}
}
function openLibraryReplay(id){if(!['bahrain-2024','monaco-2024'].includes(id))return;$('#replay-session').value=id;setTimingMode('history');loadReplay(id)}
for(let year=new Date().getFullYear();year>=1950;year--){const option=document.createElement('option');option.value=year;option.textContent=year;$('#library-season').appendChild(option)}
$('#library-season').onchange=loadLibrarySeason;$('#library-search').oninput=renderRaceLibrary;$('#library-replay-only').onchange=renderRaceLibrary;$('#library-retry').onclick=()=>{libraryState.cache.clear();loadLibrarySeason()};$('#library-close').onclick=()=>{libraryState.resultRequest++;$('#library-detail').hidden=true};
loadLibrarySeason();
/* LIBRARY_UI_END */
