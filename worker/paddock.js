const PaddockAPI=(()=>{
 const rates=new Map();
 const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','Vary':'Cookie'}});
 async function handle(request,env={}){
  try{
   const url=new URL(request.url);
   if(!['GET','PATCH'].includes(request.method))return json({error:'Method not allowed'},405);
   if(request.method==='PATCH'&&(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json')))return json({error:'Invalid request origin or content type.'},403);
   const store=env.PREDICTIONS_STORE;
   if(!store)return json({mode:'device',reason:'backend_unavailable',googleEnabled:!!ApexAuth.configured?.(env)});
   const user=await ApexAuth.user(request,env);
   if(!user)return json({mode:'device',reason:'sign_in_required',googleEnabled:!!ApexAuth.configured?.(env)},request.method==='GET'?200:401);
   const accountKey=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('paddock:'+user.id))),b=>b.toString(16).padStart(2,'0')).join('');
   if(request.method==='GET')return store.read(state=>{const saved=state.paddocks?.[user.id];return json({mode:'account',accountKey,name:user.name,exists:!!saved,profile:saved?.profile||PaddockRules.defaults(),revision:saved?.revision||0,updatedAt:saved?.updatedAt||null});});
   const current=rates.get(accountKey),time=Date.now();if(current&&current.until>time){if(++current.count>60)return json({error:'Too many changes. Please retry in a minute.'},429);}else rates.set(accountKey,{count:1,until:time+60000});
   if(rates.size>1000)for(const [key,value] of rates)if(value.until<time)rates.delete(key);
   const text=await request.text();if(text.length>16000)return json({error:'Too many changes in one request.'},413);
   let body;try{body=JSON.parse(text);}catch{return json({error:'Invalid paddock request.'},400);}
   if(!body||!Array.isArray(body.operations)||body.operations.length>25)return json({error:'Send up to 25 changes at a time.'},400);
   if(body.accountKey!==accountKey)return json({error:'Your account changed. Reload before syncing.',reason:'account_changed'},409);
   return store.transaction(state=>{
    state.paddocks=state.paddocks||{};const existing=state.paddocks[user.id];let profile;
    try{profile=PaddockRules.apply(existing?.profile,body.operations);}catch(error){return json({error:error.message,profile:existing?.profile||PaddockRules.defaults()},409);}
    const changed=!existing||JSON.stringify(profile)!==JSON.stringify(existing.profile);
    const saved=changed?{profile,revision:(existing?.revision||0)+1,updatedAt:new Date().toISOString()}:existing;
    state.paddocks[user.id]=saved;
    return json({mode:'account',accountKey,name:user.name,exists:true,...saved});
   });
  }catch{return json({error:'Your account paddock is temporarily unavailable. Device preferences are still available.'},503);}
 }
 return {handle};
})();
