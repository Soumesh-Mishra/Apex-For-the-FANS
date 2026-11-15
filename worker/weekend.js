async function weekendApi(request){
 const u=new URL(request.url),json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':status===200?'public, max-age=120':'no-store'}});
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 try{
  let endpoint;
  if(u.pathname==='/api/weekend/results'){
   const year=u.searchParams.get('year'),round=u.searchParams.get('round'),kind=u.searchParams.get('kind');
   if(!/^20\d{2}$/.test(year||'')||Number(year)>new Date().getUTCFullYear()+1||!/^([1-9]|[12]\d|30)$/.test(round||'')||!['qualifying','sprint','results'].includes(kind))return json({error:'Invalid weekend'},400);
   endpoint='https://api.jolpi.ca/ergast/f1/'+year+'/'+round+'/'+kind+'.json?limit=100';
  }else if(u.pathname==='/api/weekend/weather'){
   const lat=Number(u.searchParams.get('lat')),lon=Number(u.searchParams.get('lon'));
   if(!u.searchParams.has('lat')||!u.searchParams.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return json({error:'Invalid circuit coordinates'},400);
   endpoint='https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=16';
  }else return json({error:'Not found'},404);
  const r=await fetch(endpoint,{signal:AbortSignal.timeout(10000),cf:{cacheTtl:120,cacheEverything:true}});
  if(!r.ok)throw Error();const data=await r.json();if(data.error)throw Error();
  return json({data,checkedAt:new Date().toISOString()});
 }catch{return json({error:'Weekend feed temporarily unavailable'},502)}
}
