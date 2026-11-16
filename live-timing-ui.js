/* LIVE_TIMING_UI_START */
let timingTimer, timingRequest, timingSnapshot;
function timingLap(seconds){if(!Number.isFinite(Number(seconds))||Number(seconds)<=0)return '—';const ms=Math.round(Number(seconds)*1000);return Math.floor(ms/60000)+':'+String(Math.floor(ms%60000/1000)).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0')}
function renderTiming(data){
 const labels={live:'LIVE TIMING',ended:'SESSION ENDED',scheduled:'UPCOMING SESSION',waiting:'AWAITING TIMING',stale:'TIMING DELAYED',auth_required:'LIVE ACCESS REQUIRED',unavailable:'FEED UNAVAILABLE'};
 const label=labels[data.state]||labels.unavailable,session=data.session;
 $('#session-status').innerHTML='<span class="dot"></span> '+label;
 $('#session-status').classList.toggle('green',data.state==='live');
 $('#latest-session-state').textContent=label;
 $('#latest-session-state').classList.toggle('green',data.state==='live');
 $('#session-summary').textContent=session?[session.country_name,session.circuit_short_name,session.session_name].filter(Boolean).join(' · '):'Latest session timing';
 const scroll=$('#latest-session .timing-scroll'),scrollTop=scroll?.scrollTop||0,scrollLeft=scroll?.scrollLeft||0;
 const rows=data.rows||[];
 $('#latest-session').innerHTML='<div class="timing-intro"><div class="eyebrow">OPENF1 / '+esc(session?.year||'SESSION')+'</div><h3>'+esc(session?[session.circuit_short_name,session.session_name].filter(Boolean).join(' · '):'Timing unavailable')+'</h3><p role="status">'+esc(data.message)+'</p>'+(data.dataAt?'<div class="source">LAST TIMING · '+esc(new Date(data.dataAt).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}))+'</div>':'')+'</div>'+(rows.length?'<div class="timing-scroll" tabindex="0" role="region" aria-label="Session leaderboard"><table class="data-table timing-table"><caption class="timing-caption">'+(data.state==='live'?'Current positions':data.state==='ended'?'Last available session positions':'Last received positions')+' · lap means last completed lap</caption><thead><tr><th scope="col">POS</th><th scope="col">DRIVER</th><th scope="col">LAP</th><th scope="col">LAST LAP</th></tr></thead><tbody>'+rows.map(row=>'<tr><td class="timing-position">'+esc(row.position||'—')+'</td><td><div class="timing-driver" style="--driver-colour:'+(/^#[a-f\d]{6}$/i.test(row.colour)?row.colour:'#919198')+'"><b>'+esc(row.name)+'</b><small>'+esc(row.team)+' · #'+esc(row.number)+'</small></div></td><td>'+esc(row.lap||'—')+'</td><td class="timing-lap">'+esc(timingLap(row.lapTime))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="timing-empty">'+(data.state==='auth_required'?'Live access must be configured by the server operator.':data.state==='ended'?'No timing was published for this session.':'Driver positions and completed laps will appear here when available.')+'</div>')+'<div class="timing-footer"><a class="text-btn" href="https://openf1.org/" target="_blank" rel="noopener">Data from OpenF1 ↗</a><button class="refresh" data-retry-session>Refresh ↻</button></div>';
 const nextScroll=$('#latest-session .timing-scroll');if(nextScroll){nextScroll.scrollTop=scrollTop;nextScroll.scrollLeft=scrollLeft;}
 $('#latest-session [data-retry-session]').onclick=loadSession;
}
function loadSession(){
 if(timingRequest)return timingRequest;
 clearTimeout(timingTimer);
 timingRequest=(async()=>{
  let delay=30000;
  try{const data=await api('live-timing',30000);timingSnapshot=data;renderTiming(data);delay=Math.max(20000,Math.min(300000,(Number(data.retryAfter)||30)*1000));}
  catch{renderTiming({...timingSnapshot,state:timingSnapshot?.rows?.length?'stale':'unavailable',message:'Connection lost. Showing any last received timing and retrying automatically.'});}
  finally{timingRequest=null;if(!document.hidden)timingTimer=setTimeout(loadSession,delay);}
 })();return timingRequest;
}
document.addEventListener('visibilitychange',()=>{clearTimeout(timingTimer);if(!document.hidden)loadSession()});
/* LIVE_TIMING_UI_END */
