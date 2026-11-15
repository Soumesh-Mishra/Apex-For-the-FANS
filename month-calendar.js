let calendarLayout='list', calendarMonth=null, calendarDay=null;
const localDay=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
function renderMonthCalendar(){
 const root=$('#month-calendar');root.hidden=calendarLayout!=='month';$('#calendar-list').hidden=calendarLayout==='month';
 if(calendarLayout!=='month')return;
 if(!calendarMonth){const d=state.next?dateOf(state.next):new Date();calendarMonth=new Date(d.getFullYear(),d.getMonth(),1)}
 const query=$('#race-search').value.toLowerCase();
 const events=[];const labels={FirstPractice:'Practice 1',SecondPractice:'Practice 2',ThirdPractice:'Practice 3',SprintQualifying:'Sprint qualifying',Sprint:'Sprint',Qualifying:'Qualifying'};
 state.races.filter(r=>(state.scope==='all'||dateOf(r)>=new Date())&&JSON.stringify(r).toLowerCase().includes(query)).forEach(r=>{
  events.push({date:dateOf(r),name:'Grand Prix',race:r,isRace:true});
  Object.entries(labels).forEach(([key,name])=>{if(r[key]?.date){const date=dateOf(r[key]);if(Number.isFinite(+date))events.push({date,name,race:r,isRace:false})}});
 });events.sort((a,b)=>a.date-b.date);
 const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth(),days=new Date(year,month+1,0).getDate(),offset=(calendarMonth.getDay()+6)%7;
 const inMonth=events.filter(e=>e.date.getFullYear()===year&&e.date.getMonth()===month);
 if(!calendarDay||!calendarDay.startsWith(year+'-'+String(month+1).padStart(2,'0'))){calendarDay=inMonth.length?localDay(inMonth[0].date):localDay(calendarMonth)}
 const title=new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(calendarMonth);
 let cells='<span class="month-blank" aria-hidden="true"></span>'.repeat(offset);
 for(let n=1;n<=days;n++){const date=new Date(year,month,n),key=localDay(date),items=inMonth.filter(e=>localDay(e.date)===key),race=items.some(e=>e.isRace),important=items.some(e=>!e.isRace);
 cells+='<button type="button" class="month-day '+(race?'race-day ':'')+(key===calendarDay?'day-selected ':'')+(key===localDay(new Date())?'day-today':'')+'" data-day="'+key+'" aria-pressed="'+(key===calendarDay)+'" aria-label="'+esc(new Intl.DateTimeFormat(undefined,{dateStyle:'full'}).format(date)+(items.length?': '+items.map(e=>e.race.raceName+' '+e.name).join(', '):': No scheduled sessions'))+'"><span>'+n+'</span><span class="day-markers">'+(race?'<b aria-hidden="true">⚑</b>':'')+(important?'<i aria-hidden="true"></i>':'')+'</span></button>';
 }
 const selected=events.filter(e=>localDay(e.date)===calendarDay);
 root.innerHTML='<div class="month-shell"><div class="month-top"><h2>'+esc(title)+'</h2><div><button data-month-step="-1" aria-label="Previous month">‹</button><button id="month-today">Today</button><button data-month-step="1" aria-label="Next month">›</button></div></div><div class="month-legend"><span><b>⚑</b> Race day</span><span><i></i> Practice · qualifying · sprint</span><span class="small">Local time</span></div><div class="month-weekdays">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>'<span>'+d+'</span>').join('')+'</div><div class="month-days">'+cells+'</div></div><section class="month-agenda" aria-live="polite"><div class="small">SELECTED DATE</div><h3>'+esc(new Intl.DateTimeFormat(undefined,{weekday:'long',day:'numeric',month:'long'}).format(new Date(year,month,Number(calendarDay.slice(-2)))))+'</h3>'+ (selected.length?selected.map(e=>'<article class="month-event '+(e.isRace?'race-event':'')+'"><span class="small">'+(e.isRace?'⚑ RACE DAY':esc(e.name))+'</span><h4>'+esc(e.race.raceName)+'</h4><p>'+esc(e.race.Circuit.circuitName)+'</p><strong>'+esc(fmtTime(e.date))+' · '+esc(e.name)+'</strong>'+(e.isRace?'<button class="text-btn" data-month-add="'+esc(e.race.round)+'">+ Add race to calendar</button>':'')+'</article>').join(''):'<p class="month-empty">No scheduled F1 sessions on this date.</p>')+'</section>';
 $$('[data-day]').forEach(b=>b.onclick=()=>{calendarDay=b.dataset.day;renderMonthCalendar();$('#month-calendar [data-day="'+calendarDay+'"]').focus()});
 $$('[data-month-step]').forEach(b=>b.onclick=()=>{calendarMonth=new Date(year,month+Number(b.dataset.monthStep),1);calendarDay=null;renderMonthCalendar()});
 $('#month-today').onclick=()=>{const d=new Date();calendarMonth=new Date(d.getFullYear(),d.getMonth(),1);calendarDay=localDay(d);renderMonthCalendar()};
 $$('[data-month-add]').forEach(b=>b.onclick=()=>downloadCalendar(state.races.find(r=>String(r.round)===b.dataset.monthAdd)));
}
$$('#calendar-layout button').forEach(b=>b.onclick=()=>{calendarLayout=b.dataset.layout;$$('#calendar-layout button').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});renderCalendar()});
