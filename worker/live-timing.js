// Server-only OpenF1 adapter. Never serialize provider credentials into the page.
const LiveTimingAPI = (() => {
 let session=null, sessionAt=0, roster=[], positions=new Map(), laps=new Map(), saved=null, cached=null, expires=0, pending=null, credential=null, deadline=0;
 const stamp=value=>Date.parse(value)||0;
 const phase=(s,now)=>now<stamp(s.date_start)?'scheduled':now>stamp(s.date_end)?'ended':'active';
 async function upstream(endpoint,query,token){
  const url=new URL('https://api.openf1.org/v1/'+endpoint);
  for(const [key,value] of Object.entries(query))url.searchParams.set(key,value);
  const response=await fetch(url,{headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(Math.max(1,Math.min(8000,deadline-Date.now()))),cache:'no-store'});
  if(!response.ok){const error=Error('Timing feed unavailable');error.status=response.status;error.retry=Math.min(300,Math.max(30,Number(response.headers.get('Retry-After'))||30));throw error;}
  const data=await response.json();if(!Array.isArray(data))throw Error('Invalid timing response');return data;
 }
 function merge(target,records,time){for(const record of records){if(Number(record.session_key)!==Number(session.session_key))continue;const n=Number(record.driver_number);if(!n)continue;const old=target.get(n);if(!old||time(record)>=time(old))target.set(n,record);}}
 async function update(env){
  deadline=Date.now()+24000;
  const now=Date.now(),token=String(env.OPENF1_ACCESS_TOKEN||'').trim();
  if(token!==credential){credential=token;sessionAt=0;}
  let retry=20;
  try{
   if(!session||now-sessionAt>=60000){
    const sessions=await upstream('sessions',{session_key:'latest'},token);
    const next=sessions.filter(s=>Number.isInteger(Number(s.session_key))&&stamp(s.date_start)&&stamp(s.date_end)).sort((a,b)=>stamp(b.date_start)-stamp(a.date_start))[0];
    if(!next)throw Error('No session available');
    if(session?.session_key!==next.session_key){roster=[];positions.clear();laps.clear();saved=null;}
    session=next;sessionAt=now;
   }
   const status=phase(session,now);
   if(status==='scheduled')cached={state:'scheduled',session,rows:[],message:'Timing will appear when the session starts.'};
   else if(status==='active'&&!token)cached={state:'auth_required',session,rows:[],message:'OpenF1 live timing requires a server-side access token. Free historical timing remains available after the live access window.'};
   else{
    // Reuse the roster; space requests to respect the public API burst limit.
    if(!roster.length){roster=await upstream('drivers',{session_key:session.session_key},token);await new Promise(resolve=>setTimeout(resolve,400));}
    const latest=Math.max(0,...Array.from(positions.values(),p=>stamp(p.date)));
    const positionQuery={session_key:session.session_key};if(latest)positionQuery['date>']=new Date(latest-10000).toISOString();
    const pos=await upstream('position',positionQuery,token);
    await new Promise(resolve=>setTimeout(resolve,400));
    const lap=await upstream('laps',{session_key:session.session_key},token);
    merge(positions,pos,p=>stamp(p.date));
    // A newer incomplete lap must not erase the last completed lap time.
    merge(laps,lap.filter(l=>Number(l.lap_duration)>0),l=>Number(l.lap_number)*1e9+stamp(l.date_start)/1e6);
    const rows=roster.map(driver=>{const p=positions.get(Number(driver.driver_number)),l=laps.get(Number(driver.driver_number));return {number:driver.driver_number,name:driver.full_name||driver.name_acronym||String(driver.driver_number),acronym:driver.name_acronym,team:driver.team_name||'',colour:/^[a-f\d]{6}$/i.test(driver.team_colour||'')?'#'+driver.team_colour:'#919198',position:Number(p?.position)||null,lap:l?.lap_number||null,lapTime:l?.lap_duration||null,positionAt:p?.date||null};}).sort((a,b)=>(a.position||999)-(b.position||999)||a.number-b.number);
    const dataAt=Math.max(0,...Array.from(positions.values(),p=>stamp(p.date)),...Array.from(laps.values(),l=>stamp(l.date_start)+Number(l.lap_duration)*1000));
    const state=status==='ended'?'ended':!dataAt?'waiting':now-dataAt>90000?'stale':'live';
    cached={state,session,rows,dataAt:dataAt?new Date(dataAt).toISOString():null,checkedAt:new Date(now).toISOString(),message:state==='ended'?'Session ended · last available timing, not an official classification.':state==='stale'?'No timing updates for over 90 seconds. Showing the last received data.':state==='waiting'?'Session window is open. Waiting for driver timing.':'Positions and completed laps refresh every 20 seconds.'};
    saved=cached;if(state==='ended')retry=60;
   }
  }catch(error){
   retry=error.retry||30;
   const auth=error.status===401||error.status===403;
   cached={session,rows:saved?.rows||[],dataAt:saved?.dataAt||null,state:auth?'auth_required':saved?'stale':'unavailable',message:auth?'OpenF1 denied access. Configure or renew the server access token.':error.status===429?'OpenF1 rate limit reached. Retrying automatically.':'Timing feed is temporarily unavailable. Retrying automatically.'};
  }
  cached.retryAfter=retry;expires=Date.now()+retry*1000;return cached;
 }
 return {async handle(request,env={}){
  if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers:{Allow:'GET'}});
  if(String(env.OPENF1_ACCESS_TOKEN||'').trim()!==credential)expires=0;
  if(!cached||Date.now()>=expires){if(!pending)pending=update(env).finally(()=>pending=null);await pending;}
  return Response.json(cached,{headers:{'Cache-Control':'no-store'}});
 }};
})();
