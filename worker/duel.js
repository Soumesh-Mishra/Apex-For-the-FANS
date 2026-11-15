const DuelAPI=(()=>{
 const origin='https://api.jolpi.ca/ergast/f1/';
 async function json(url){const response=await fetch(url,{signal:AbortSignal.timeout(9000),cf:{cacheTtl:3600,cacheEverything:true}});if(!response.ok)throw Error('Archive unavailable');return response.json();}
 async function archive(path,field){let items=[],race=null;for(let offset=0;offset<500;offset+=100){const data=await json(origin+path+'.json?limit=100&offset='+offset);if(!Array.isArray(data.MRData?.RaceTable?.Races))throw Error('Invalid archive response');const current=data.MRData.RaceTable.Races[0];race??=current||null;const rows=current?.[field]||[];if(!Array.isArray(rows))throw Error('Invalid archive rows');items.push(...rows);const total=Number(data.MRData.total);if(!Number.isFinite(total)||offset+100>=total||!rows.length)break;}return {race,items};}
 function saved(year,round){return String(year)==='2024'&&String(round)==='1';}
 async function handle(request){
  if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
  const p=new URL(request.url).searchParams,year=p.get('season'),round=p.get('round'),part=p.get('part')||'event',driver=p.get('driver');
  if(!/^\d{4}$/.test(year||'')||Number(year)<1950||Number(year)>new Date().getUTCFullYear()||!/^([1-9]|[1-4]\d|50)$/.test(round||'')||!['event','laps','stints'].includes(part)||(part==='laps'&&!/^[a-z0-9_]{1,60}$/.test(driver||'')))return Response.json({error:'Invalid driver duel selection'},{status:400});
  const headers={'Cache-Control':'public, max-age=300'};
  if(part==='event'){
   try{const results=await archive(year+'/'+round+'/results','Results');if(!results.race||!results.items.length)return Response.json({race:null,qualifying:null,pits:null,source:'jolpica',warnings:[]},{headers});
    const [q,pits]=await Promise.allSettled([archive(year+'/'+round+'/qualifying','QualifyingResults'),archive(year+'/'+round+'/pitstops','PitStops')]);
    return Response.json({race:{...results.race,Results:results.items},qualifying:q.status==='fulfilled'&&q.value.items.length?q.value.items:null,pits:pits.status==='fulfilled'&&pits.value.items.length?pits.value.items:null,source:'jolpica',warnings:[q.status==='rejected'?'Qualifying archive unavailable.':'',pits.status==='rejected'?'Pit-stop archive unavailable.':''].filter(Boolean)},{headers});
   }catch{if(saved(year,round))return Response.json({...duelSnapshot.event,source:'bundled',capturedAt:duelSnapshot.capturedAt},{headers});return Response.json({error:'Race data could not be loaded. Retry or choose the bundled 2024 Bahrain race.'},{status:502});}
  }
  if(part==='laps'){
   try{const data=await archive(year+'/'+round+'/drivers/'+driver+'/laps','Laps');return Response.json({rows:data.items,source:'jolpica'},{headers});}catch{if(saved(year,round)&&duelSnapshot.laps[driver])return Response.json({rows:duelSnapshot.laps[driver],source:'bundled'},{headers});return Response.json({error:'Lap history unavailable for this driver.'},{status:502});}
  }
  const date=p.get('date');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!date.startsWith(year+'-')||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)return Response.json({error:'Invalid race date'},{status:400});
  if(Number(year)<2023||Date.parse(date+'T23:59:59Z')>Date.now()-48*3600000)return Response.json({available:false,rows:[],message:'Tyre history is available for older completed sessions from 2023 onward.'},{headers});
  try{const sessions=await json('https://api.openf1.org/v1/sessions?year='+year+'&session_name=Race');if(!Array.isArray(sessions))throw Error();const matching=sessions.filter(s=>s.session_name==='Race'&&!s.is_cancelled&&Math.abs(Date.parse(s.date_start)-Date.parse(date+'T12:00:00Z'))<=36*3600000).sort((a,b)=>Math.abs(Date.parse(a.date_start)-Date.parse(date+'T12:00:00Z'))-Math.abs(Date.parse(b.date_start)-Date.parse(date+'T12:00:00Z')));const session=matching[0];if(!session||!Number.isInteger(session.session_key))return Response.json({available:false,rows:[],message:'No matching historical tyre session.'},{headers});const rows=await json('https://api.openf1.org/v1/stints?session_key='+session.session_key);if(!Array.isArray(rows))throw Error();return Response.json({available:rows.length>0,session:session.session_key,rows,source:'openf1'},{headers});}
  catch{if(saved(year,round))return Response.json({...duelSnapshot.tyres,source:'bundled'},{headers});return Response.json({available:false,rows:[],message:'Tyre history is temporarily unavailable.'},{headers});}
 }
 return {handle};
})();
