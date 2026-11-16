const PredictionAPI=(()=>{
 const COOKIE='__Host-apex_prediction_guest',metaCache=new Map(),resultCache=new Map(),limits=new Map();let refreshing=false;
 const reply=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Vary':'Cookie',...headers}});
 const fail=(message,status=400)=>{const error=Error(message);error.status=status;throw error;};
 const name=(value,min=2,max=30)=>{if(typeof value!=='string')fail('Enter a name.');const n=value.normalize('NFKC').trim().replace(/\s+/g,' ');if(n.length<min||n.length>max||! /^[\p{L}\p{N} ._'’!\-]+$/u.test(n))fail('Use '+min+'–'+max+' letters, numbers, spaces or simple punctuation.');return n;};
 const now=()=>Date.now();
 const cookie=request=>(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
 const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
 const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
 function limit(key,max){const time=now(),previous=limits.get(key);if(!previous||previous.until<time)limits.set(key,{until:time+60000,count:1});else if(++previous.count>max)fail('Too many requests. Please wait a minute.',429);if(limits.size>2000)for(const [id,value] of limits)if(value.until<time)limits.delete(id);}
 async function jsonFetch(path){const response=await fetch('https://api.jolpi.ca/ergast/f1/'+path,{signal:AbortSignal.timeout(7000),cache:'no-store'});if(!response.ok)throw Error('Race data unavailable');return response.json();}
 async function metadata(year){
  let entry=metaCache.get(year);if(entry?.data&&entry.until>now())return entry.data;
  if(entry?.pending)return entry.pending;
  entry=entry||{};metaCache.set(year,entry);
  entry.pending=(async()=>{
   let races,drivers,fresh=true;
   try{const [schedule,roster]=await Promise.all([jsonFetch(year+'.json?limit=100'),jsonFetch(year+'/drivers.json?limit=100')]);races=schedule.MRData?.RaceTable?.Races;drivers=roster.MRData?.DriverTable?.Drivers?.map(d=>({id:d.driverId,name:d.givenName+' '+d.familyName}));if(!races?.length||!drivers?.length)throw Error();}
   catch{fresh=false;races=entry.data?.rawRaces||calendarSnapshot.MRData.RaceTable.Races.filter(r=>Number(r.season)===year);drivers=entry.data?.drivers||predictionRoster.drivers.filter(()=>Number(predictionRoster.season)===year).map(d=>({id:d.id,name:d.name}));}
   const data={year,drivers:drivers||[],fresh,rawRaces:races||[],races:(races||[]).map(r=>({key:year+'-'+r.round,round:Number(r.round),name:r.raceName,date:r.date+'T'+(r.time||'00:00:00Z'),deadline:r.Qualifying?.date&&r.Qualifying?.time?r.Qualifying.date+'T'+r.Qualifying.time:null}))};
   entry.data=data;entry.until=now()+(fresh?120000:30000);return data;
  })().finally(()=>entry.pending=null);return entry.pending;
 }
 async function resultFor(race){
  let cache=resultCache.get(race.key);if(cache?.until>now())return cache.data;
  if(cache?.pending)return cache.pending;
  cache=cache||{};resultCache.set(race.key,cache);
  cache.pending=(async()=>{
   const [year,round]=race.key.split('-');const settled=await Promise.allSettled([jsonFetch(year+'/'+round+'/qualifying.json?limit=100'),now()>Date.parse(race.date)?jsonFetch(year+'/'+round+'/results.json?limit=100'):Promise.resolve(null)]);
   const qualifying=settled[0].status==='fulfilled'?settled[0].value?.MRData?.RaceTable?.Races?.[0]:null;
   const finish=settled[1].status==='fulfilled'?settled[1].value?.MRData?.RaceTable?.Races?.[0]:null;
   const matching=r=>r&&String(r.season)===year&&String(Number(r.round))===String(Number(round));
   const pole=matching(qualifying)?qualifying.QualifyingResults?.find(r=>Number(r.position)===1)?.Driver?.driverId:null;
   const results=matching(finish)?finish.Results||[]:[];
   const podium=[1,2,3].map(position=>results.find(r=>Number(r.position)===position)?.Driver?.driverId);
   const fastest=results.find(r=>Number(r.FastestLap?.rank)===1)?.Driver?.driverId;
   const data={pole:pole||null,podium:podium.every(Boolean)?podium:null,fastest:fastest||null,qualifyingAvailable:matching(qualifying)&&!!pole,raceAvailable:matching(finish)&&podium.every(Boolean),checkedAt:new Date().toISOString()};
   cache.data=data;cache.until=now()+300000;return data;
  })().finally(()=>cache.pending=null);return cache.pending;
 }
 async function identity(request,env,store){
  const token=cookie(request),guestId=/^[a-f\d]{48}$/.test(token)?'guest:'+await digest(token):null;
  const google=await ApexAuth.user(request,env);
  if(google){
   const id=google.id;store.transaction(state=>{
    state.users[id]={name:String(google.name||'F1 fan').slice(0,100),guest:false};
    if(guestId&&state.users[guestId]?.expiresAt>now()){
     for(const league of Object.values(state.leagues))if(league.members.includes(guestId))league.members=Array.from(new Set(league.members.map(member=>member===guestId?id:member)));
     for(const [key,pick] of Object.entries(state.picks))if(pick.user===guestId){const next=pick.league+'|'+id+'|'+pick.race;if(!state.picks[next])state.picks[next]={...pick,user:id};delete state.picks[key];}
     delete state.users[guestId];
    }
   });return {id,name:google.name,guest:false};
  }
  return guestId?store.read(state=>state.users[guestId]?.expiresAt>now()?{id:guestId,...state.users[guestId]}:null):null;
 }
 function leagueFor(state,id,user){const league=Object.hasOwn(state.leagues,id)?state.leagues[id]:null;if(!league||!user||!league.members.includes(user.id))fail('League not found.',404);return league;}
 function deadlines(data,store){return store.transaction(state=>data.races.map(race=>{const date=Date.parse(race.deadline);if(data.fresh&&Number.isFinite(date)){const previous=state.deadlines[race.key];state.deadlines[race.key]=previous?Math.min(previous,date):date;}return {...race,deadline:state.deadlines[race.key]?new Date(state.deadlines[race.key]).toISOString():race.deadline};}));}
 async function settle(race,store){
  const result=await resultFor(race);
  store.transaction(state=>{const previous=state.results[race.key]||{};state.results[race.key]={pole:result.qualifyingAvailable?result.pole:previous.pole||null,podium:result.raceAvailable?result.podium:previous.podium||null,fastest:result.raceAvailable?result.fastest:previous.fastest||null,checkedAt:result.checkedAt};});
 }
 async function refresh(env={}){
  const store=env.PREDICTIONS_STORE;if(!store||refreshing)return;refreshing=true;
  try{
   const pending=store.read(state=>Array.from(new Set(Object.values(state.picks).map(p=>p.race))).filter(key=>state.deadlines[key]<=now()&&(!state.results[key]?.checkedAt||now()-Date.parse(state.results[key].checkedAt)>=300000)).sort((a,b)=>(Date.parse(state.results[a]?.checkedAt)||0)-(Date.parse(state.results[b]?.checkedAt)||0)).slice(0,2));
   for(const key of pending){const data=await metadata(Number(key.split('-')[0])),race=deadlines(data,store).find(r=>r.key===key);if(race&&Date.parse(race.deadline)<=now())await settle(race,store);}
  }finally{refreshing=false;}
 }
 async function handle(request,env={}){
  try{
   const url=new URL(request.url),path=url.pathname.slice('/api/predictions'.length),store=env.PREDICTIONS_STORE;
   if(!store)return reply({enabled:false,error:'Shared prediction leagues need a hosted APEX backend with persistent storage.'},503);
   if(!['GET','POST','PUT'].includes(request.method))return reply({error:'Method not allowed'},405,{Allow:'GET, POST, PUT'});
   if(request.method!=='GET'&&(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json')))fail('Invalid request origin or content type.',403);
   let body={};if(request.method!=='GET'){const text=await request.text();if(text.length>6000)fail('Request is too large.',413);try{body=JSON.parse(text);}catch{fail('Invalid request body.');}if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid request body.');}
   const user=await identity(request,env,store);
   if(path==='/guest'&&request.method==='POST'){
    if(user)return reply({user:{name:user.name,guest:user.guest}});limit('new-guest',20);const label=name(body.name),token=random(),id='guest:'+await digest(token);
    store.transaction(state=>{if(Object.keys(state.users).length>=10000)fail('League capacity reached. Please contact the host.',503);state.users[id]={name:label,guest:true,expiresAt:now()+2592000000};});
    return reply({user:{name:label,guest:true}},201,{'Set-Cookie':COOKIE+'='+token+'; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax'});
   }
   limit(user?.id||'anonymous-read',request.method==='GET'?120:30);
   if(path==='/leagues'&&request.method==='POST'){
    if(!user)fail('Sign in or choose a guest name first.',401);const label=name(body.name,3,40),id=crypto.randomUUID(),year=new Date().getUTCFullYear();
    const league=store.transaction(state=>{if(Object.values(state.leagues).filter(l=>l.members.includes(user.id)).length>=20)fail('You can belong to up to 20 leagues.');let code;do{code=random().slice(0,8).toUpperCase();}while(Object.values(state.leagues).some(l=>l.code===code));const value={id,name:label,code,year,members:[user.id],createdAt:new Date().toISOString()};state.leagues[id]=value;return value;});return reply({league:{id:league.id,name:league.name,code:league.code,year:league.year}},201);
   }
   if(path==='/join'&&request.method==='POST'){
    if(!user)fail('Sign in or choose a guest name first.',401);const code=String(body.code||'').trim().toUpperCase();if(!/^[A-F\d]{8}$/.test(code))fail('Enter the 8-character invite code.');
    const id=store.transaction(state=>{const league=Object.values(state.leagues).find(l=>l.code===code);if(!league)fail('No league matches that invite code.',404);if(!league.members.includes(user.id)){if(league.members.length>=100)fail('This league is full.');if(Object.values(state.leagues).filter(l=>l.members.includes(user.id)).length>=20)fail('You can belong to up to 20 leagues.');league.members.push(user.id);}return league.id;});return reply({leagueId:id});
   }
   if(path==='/picks'&&request.method==='PUT'){
    if(!user)fail('Sign in or choose a guest name first.',401);
    const league=store.read(state=>leagueFor(state,body.league,user)),data=await metadata(league.year),races=deadlines(data,store),race=races.find(r=>r.key===body.race);
    if(!data.fresh)fail('The schedule or driver feed is unavailable. Picks cannot be changed until the deadline can be verified.',503);
    if(!race?.deadline||!Number.isFinite(Date.parse(race.deadline))||!Number.isFinite(Date.parse(race.date)))fail('A qualifying start time is not available for this race.',409);
    if(!PredictionRules.validate(body.picks,data.drivers.map(d=>d.id)))fail('Choose a driver for every prediction and three different podium drivers.');
    store.transaction(state=>{leagueFor(state,body.league,user);if(now()>=state.deadlines[race.key]||now()>=Date.parse(race.date))fail('Predictions are locked for this race.',409);state.picks[league.id+'|'+user.id+'|'+race.key]={league:league.id,user:user.id,race:race.key,picks:Object.fromEntries(PredictionRules.fields.map(k=>[k,body.picks[k]])),updatedAt:new Date().toISOString()};});return reply({ok:true});
   }
   if(path===''&&request.method==='GET'){
    const selected=url.searchParams.get('league');const league=selected?store.read(state=>leagueFor(state,selected,user)):null;
    const data=await metadata(league?.year||new Date().getUTCFullYear()),races=deadlines(data,store);
    const requested=url.searchParams.get('race'),race=races.find(r=>r.key===requested)||races.find(r=>Date.parse(r.deadline)>now())||races.at(-1)||null;
    // Settle the selected round on demand; the Node background worker handles
    // other entered rounds without making a page request wait for a whole season.
    if(league&&race&&race.deadline&&Date.parse(race.deadline)<=now())await settle(race,store);
    return store.read(state=>{
     const leagues=user?Object.values(state.leagues).filter(l=>l.members.includes(user.id)).map(l=>({id:l.id,name:l.name,code:l.code,year:l.year,members:l.members.length})):[];
     const result=race?state.results[race.key]||null:null,locked=!!race&&((!!race.deadline&&now()>=Date.parse(race.deadline))||now()>=Date.parse(race.date));
     const detail=league?{...leagues.find(l=>l.id===league.id),standings:league.members.map(id=>{const entries=Object.values(state.picks).filter(p=>p.league===league.id&&p.user===id);const points=entries.reduce((total,p)=>total+PredictionRules.score(p.picks,state.results[p.race]).total,0);const current=entries.find(p=>p.race===race?.key);return {name:state.users[id]?.name||'F1 fan',guest:!!state.users[id]?.guest,you:id===user.id,points,roundPoints:PredictionRules.score(current?.picks,result).total,picks:locked?current?.picks||null:null};}).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name))}:null;
     if(detail){let rank=0,last=null;detail.standings.forEach((row,i)=>{if(row.points!==last)rank=i+1;row.rank=rank;last=row.points;});}
     const own=league&&race?state.picks[league.id+'|'+user.id+'|'+race.key]:null;
     return reply({enabled:true,user:user?{name:user.name,guest:user.guest}:null,leagues,league:detail,races:races.map(r=>({...r,locked:(!!r.deadline&&now()>=Date.parse(r.deadline))||now()>=Date.parse(r.date)})),race,locked,feedFresh:data.fresh,drivers:data.drivers,ownPicks:own?.picks||null,savedAt:own?.updatedAt||null,result,roundScore:PredictionRules.score(own?.picks,result),serverTime:new Date().toISOString(),rules:{pole:3,exactPodium:5,otherPodium:2,fastest:2,max:20}});
    });
   }
   return reply({error:'Not found'},404);
  }catch(error){return reply({error:error.status?error.message:'Prediction leagues are temporarily unavailable. Please retry.'},error.status||503);}
 }
 return {handle,refresh};
})();
