/* WEEKEND_UI_START */
let weekendRound='',weekendKind='qualifying',weekendGeneration=0;
const weekendCache=new Map();
const weekendLabels={FirstPractice:'Practice 1',SecondPractice:'Practice 2',ThirdPractice:'Practice 3',SprintQualifying:'Sprint qualifying',Sprint:'Sprint',Qualifying:'Qualifying'};
function weekendSessions(r){return [...Object.entries(weekendLabels).filter(([k])=>r[k]?.date).map(([k,label])=>({key:k,label,date:dateOf(r[k])})),{key:'Race',label:'Grand Prix',date:dateOf(r)}].filter(s=>Number.isFinite(+s.date)).sort((a,b)=>a.date-b.date)}
function chosenWeekend(){return state.races.find(r=>String(r.round)===weekendRound)}
function tickWeekend(){const r=chosenWeekend();if(!r)return;const next=weekendSessions(r).find(s=>s.date>new Date());const el=$('#weekend-countdown');if(!el)return;if(!next){el.textContent='All scheduled start times have passed';return}let seconds=Math.max(0,Math.floor((next.date-new Date())/1000));const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60),s=seconds%60;el.textContent=next.label+' in '+d+'d '+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function renderWeekend(){
 if(!state.races.length){$('#weekend-summary').innerHTML='<div class="empty">The weekend schedule is unavailable. Refresh to retry.</div>';return}
 if(!chosenWeekend()){const r=state.races.find(r=>+dateOf(r)+21600000>Date.now())||state.races.at(-1);weekendRound=String(r.round)}
 const r=chosenWeekend(),loc=r.Circuit.Location,sessions=weekendSessions(r),next=sessions.find(s=>s.date>new Date());
 $('#weekend-race').innerHTML=state.races.map(r=>'<option value="'+esc(r.round)+'">R'+esc(r.round)+' · '+esc(r.raceName)+'</option>').join('');$('#weekend-race').value=weekendRound;
 $('#weekend-summary').innerHTML='<div class="weekend-banner"><div><span class="eyebrow">'+esc(r.season)+' · ROUND '+esc(r.round)+' · '+(r.Sprint?'SPRINT WEEKEND':'GRAND PRIX WEEKEND')+'</span><h2>'+esc(r.raceName)+'</h2><p>'+esc(r.Circuit.circuitName)+' · '+esc(loc.locality)+', '+esc(loc.country)+'</p><a class="text-btn" href="https://www.openstreetmap.org/?mlat='+encodeURIComponent(loc.lat)+'&mlon='+encodeURIComponent(loc.long)+'#map=14/'+encodeURIComponent(loc.lat)+'/'+encodeURIComponent(loc.long)+'" target="_blank" rel="noopener">Explore circuit location ↗</a></div><div class="weekend-next"><span class="small">'+(next?'NEXT SCHEDULED START':'WEEKEND SCHEDULE')+'</span><strong id="weekend-countdown"></strong><button class="text-btn" id="weekend-add">+ Add race to calendar</button></div></div>';
 $('#weekend-add').onclick=()=>downloadCalendar(r);tickWeekend();
 $('#weekend-schedule').innerHTML=sessions.map(s=>'<div class="weekend-session '+(s===next?'session-next':'')+'"><div><span class="small">'+esc(new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short'}).format(s.date))+'</span><h3>'+esc(s.label)+'</h3></div><div><strong>'+esc(fmtTime(s.date))+'</strong><span class="small">'+(s===next?'UP NEXT':s.date<new Date()?'START TIME PASSED':'SCHEDULED')+'</span></div></div>').join('')+'<p class="disclaimer">Schedule status reflects start times only. It does not confirm that a session is running or complete.</p>';
 $('#weekend-result-tabs [data-weekend-result="sprint"]').disabled=!r.Sprint;
 if(!r.Sprint&&weekendKind==='sprint')weekendKind='qualifying';
 $$('#weekend-result-tabs button').forEach(b=>b.classList.toggle('selected',b.dataset.weekendResult===weekendKind));
 if(location.hash==='#weekend')loadWeekend();
}
async function weekendFetch(path){const cached=weekendCache.get(path);if(cached&&Date.now()-cached.at<60000)return cached.value;const value=await api(path);weekendCache.set(path,{at:Date.now(),value});return value}
async function loadWeekend(){
 const r=chosenWeekend();if(!r)return;const generation=++weekendGeneration,kind=weekendKind;
 $('#weekend-results').innerHTML='<div class="empty">Checking this weekend’s published '+(kind==='results'?'race':kind)+' classification…</div>';
 $('#weekend-weather').textContent='Checking the circuit forecast…';
 const active=()=>generation===weekendGeneration;
 await Promise.allSettled([
  (async()=>{try{const response=await weekendFetch('weekend/results?year='+encodeURIComponent(r.season)+'&round='+encodeURIComponent(r.round)+'&kind='+kind);if(!active())return;const race=response.data?.MRData?.RaceTable?.Races?.find(x=>String(x.round)===String(r.round)&&String(x.season)===String(r.season)),rows=race?.[kind==='qualifying'?'QualifyingResults':kind==='sprint'?'SprintResults':'Results'];if(!rows?.length){$('#weekend-results').innerHTML='<div class="empty">No '+(kind==='results'?'race':kind)+' classification has been published for '+esc(r.raceName)+' yet.</div>';return}
  $('#weekend-results').innerHTML='<div class="disclaimer">'+esc(r.season)+' · '+esc(r.raceName)+' · Published '+(kind==='results'?'race':kind)+' results · Checked '+esc(fmtTime(new Date(response.checkedAt)))+'</div><div class="weekend-table"><table class="data-table"><thead><tr><th>POS</th><th>DRIVER / TEAM</th><th>'+(kind==='qualifying'?'Q1 / Q2 / Q3':'TIME / STATUS')+'</th><th>'+(kind==='qualifying'?'':'PTS')+'</th></tr></thead><tbody>'+rows.map(d=>'<tr><td>'+esc(d.position)+'</td><td>'+esc(d.Driver.givenName+' '+d.Driver.familyName)+'<small class="weekend-team">'+esc(d.Constructor.name)+'</small></td><td>'+esc(kind==='qualifying'?[d.Q1||'—',d.Q2||'—',d.Q3||'—'].join(' / '):d.Time?.time||d.status)+'</td><td>'+esc(kind==='qualifying'?'':d.points)+'</td></tr>').join('')+'</tbody></table></div>';
  }catch{if(active())$('#weekend-results').innerHTML='<div class="empty">Classification feed unavailable. Refresh weekend to retry.</div>'}})(),
  (async()=>{try{const {data,checkedAt}=await weekendFetch('weekend/weather?lat='+encodeURIComponent(r.Circuit.Location.lat)+'&lon='+encodeURIComponent(r.Circuit.Location.long));if(!active())return;const daily=data.daily;if(!daily?.time?.length)throw Error();const circuitDay=date=>new Intl.DateTimeFormat('en-CA',{timeZone:data.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date),dates=new Set(weekendSessions(r).map(s=>circuitDay(s.date)));const days=daily.time.map((date,i)=>({date,i})).filter(d=>dates.has(d.date));const metric=(v,unit)=>Number.isFinite(v)?Math.round(v)+unit:'Unavailable';
  $('#weekend-weather').innerHTML=(days.length?days.map(({date,i})=>'<div class="weekend-weather-day"><strong>'+esc(date)+'</strong><div><span>'+metric(daily.temperature_2m_min?.[i],'°')+' – '+metric(daily.temperature_2m_max?.[i],'°C')+'</span><span>Rain chance '+metric(daily.precipitation_probability_max?.[i],'%')+'</span><span>Max wind '+metric(daily.wind_speed_10m_max?.[i],' km/h')+'</span></div></div>').join(''):'<p>This weekend is outside the available forecast window. Forecasts cover up to 16 days ahead; past weather is not shown.</p>')+'<p class="disclaimer">Daily forecast · Circuit timezone '+esc(data.timezone)+' · Checked '+esc(fmtTime(new Date(checkedAt)))+'<br><a href="https://open-meteo.com/" target="_blank" rel="noopener">Weather by Open-Meteo ↗</a></p>';
  }catch{if(active())$('#weekend-weather').innerHTML='<p>Weather is temporarily unavailable. Refresh weekend to retry.</p>'}})()
 ]);
}
$('#weekend-race').onchange=e=>{weekendRound=e.target.value;renderWeekend()};
$$('[data-weekend-result]').forEach(b=>b.onclick=()=>{weekendKind=b.dataset.weekendResult;renderWeekend()});
$('#weekend-refresh').onclick=async()=>{weekendCache.clear();const b=$('#weekend-refresh');b.disabled=true;try{await loadCalendar();await loadWeekend()}finally{b.disabled=false}};
window.addEventListener('hashchange',()=>{if(location.hash==='#weekend')renderWeekend()});
setInterval(()=>{tickWeekend();if(location.hash==='#weekend'&&chosenWeekend())renderWeekend()},60000);setInterval(tickWeekend,1000);
/* WEEKEND_UI_END */
