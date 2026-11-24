const sources = {
  calendar: 'https://api.jolpi.ca/ergast/f1/current.json?limit=100',
  drivers: 'https://api.jolpi.ca/ergast/f1/current/driverStandings.json',
  constructors: 'https://api.jolpi.ca/ergast/f1/current/constructorStandings.json',
  results: 'https://api.jolpi.ca/ergast/f1/current/last/results.json?limit=30',
  session: 'https://api.openf1.org/v1/sessions?session_key=latest',
  news: 'https://www.autosport.com/rss/feed/f1'
};
export default {
  async scheduled(event,env={}) { await PredictionAPI.refresh(env); },
  async fetch(request,env={}) {
    const url=new URL(request.url);
    if(Object.hasOwn(pwaAssets,url.pathname)){
      if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
      const asset=pwaAssets[url.pathname];
      return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)),{headers:{'Content-Type':asset.type,'Cache-Control':url.pathname==='/sw.js'?'no-cache':'no-store','X-Content-Type-Options':'nosniff',...(url.pathname==='/sw.js'?{'Service-Worker-Allowed':'/'}:{})}});
    }
    if(url.pathname==='/assets/entry/apex-carbon-hero.webp'&&['GET','HEAD'].includes(request.method))return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(threeAssets['apex-carbon-hero.webp']),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
    if(url.pathname==='/entry-review'&&request.method==='GET')return new Response(entryReviewPage,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    if(url.pathname==='/credits'&&request.method==='GET')return new Response(creditsPage,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    if(url.pathname==='/assets/models/formula-f226.glb'&&['GET','HEAD'].includes(request.method))return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(threeAssets['formula-f226.glb']),c=>c.charCodeAt(0)),{headers:{'Content-Type':'model/gltf-binary','Cache-Control':'public, max-age=3600'}});
    if(url.pathname.startsWith('/assets/three/')){
      const name=url.pathname.slice('/assets/three/'.length);
      if(!name.endsWith('.js')||!['GET','HEAD'].includes(request.method)||!Object.hasOwn(threeAssets,name))return new Response('Not found',{status:404});
      return new Response(request.method==='HEAD'?null:threeAssets[name],{headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
    }
    if(url.pathname.startsWith('/assets/team-legends/')){
 const id=url.pathname.match(/^\/assets\/team-legends\/([a-z0-9-]+)\.jpg$/)?.[1];
 if(!id||!Object.hasOwn(legendAssets,id)||!['GET','HEAD'].includes(request.method))return new Response('Not found',{status:404});
 const body=request.method==='HEAD'?null:Uint8Array.from(atob(legendAssets[id].dataUrl.split(',')[1]),c=>c.charCodeAt(0));
 return new Response(body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
 }
 if(url.pathname.startsWith('/assets/team-cars/')){
      const id=url.pathname.match(/^\/assets\/team-cars\/([a-z0-9-]+)\.webp$/)?.[1];
      if(!id||!Object.hasOwn(teamCars,id)||!['GET','HEAD'].includes(request.method))return new Response('Not found',{status:404});
      const car=teamCars[id],etag='"'+car.sha256+'"';
      const headers={'Content-Type':'image/webp','Cache-Control':'public, max-age=86400','ETag':etag,'X-Content-Type-Options':'nosniff'};
      if(request.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers});
      const body=request.method==='HEAD'?null:Uint8Array.from(atob(car.dataUrl.split(',')[1]),c=>c.charCodeAt(0));
      return new Response(body,{headers});
    }
    if(url.pathname==='/api/predictions'||url.pathname.startsWith('/api/predictions/'))return PredictionAPI.handle(request,env);
    if(url.pathname==='/api/community')return CommunityAPI.handle(request,env);
    if(url.pathname==='/api/paddock')return PaddockAPI.handle(request,env);
    if(url.pathname==='/api/live-timing')return LiveTimingAPI.handle(request,env);
    if(url.pathname==='/api/driver-duel')return DuelAPI.handle(request);
    if(url.pathname==='/api/race-library'){
      const season=url.searchParams.get('season'),round=url.searchParams.get('round');
      if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
      if(!/^\d{4}$/.test(season||'')||Number(season)<1950||Number(season)>new Date().getUTCFullYear()||(round!==null&&!/^([1-9]|[12]\d|30)$/.test(round)))return Response.json({error:'Invalid archive selection'},{status:400});
      try{const endpoint='https://api.jolpi.ca/ergast/f1/'+season+(round?'/'+round+'/results':'')+'.json?limit=100';const upstream=await fetch(endpoint,{signal:AbortSignal.timeout(10000),cf:{cacheTtl:3600,cacheEverything:true}});if(!upstream.ok)throw Error();const data=await upstream.json();if(!Array.isArray(data.MRData?.RaceTable?.Races))throw Error();return Response.json(data,{headers:{'Cache-Control':'public, max-age=120'}})}catch{return Response.json({error:'Race archive temporarily unavailable'},{status:502,headers:{'Cache-Control':'no-store'}})}
    }
    if(url.pathname.startsWith('/api/auth/'))return ApexAuth.handle(request,env);
    if((url.pathname==='/login'||url.pathname==='/privacy')&&request.method==='GET')return new Response(url.pathname==='/login'?loginPage:privacyPage,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Cross-Origin-Opener-Policy':'same-origin-allow-popups','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
    if(url.pathname.startsWith('/api/')) {
      const kind=url.pathname.slice(5);
      if(kind.startsWith('history/')) {
        const id=kind.slice(8);
        if(!Object.hasOwn(historicalRecordings,id))return Response.json({error:'Historical recording not found'},{status:404});
        return Response.json(historicalRecordings[id],{headers:{'Cache-Control':'public, max-age=3600'}});
      }
      if(!sources[kind]) return Response.json({error:'Not found'},{status:404});
      if(kind==='calendar') {
        for(const endpoint of [sources.calendar,'https://api.jolpi.ca/ergast/f1/current.json']) {
          try {
            const response=await fetch(endpoint,{signal:AbortSignal.timeout(4500),cf:{cacheTtl:180,cacheEverything:true}});
            if(!response.ok) throw new Error('Calendar feed unavailable');
            const data=await response.json();
            if(!data.MRData?.RaceTable?.Races?.length) throw new Error('Empty calendar');
            data._apex={source:'feed',verifiedAt:new Date().toISOString()};
            return Response.json(data,{headers:{'Cache-Control':'public, max-age=60'}});
          }catch{}
        }
        return Response.json(calendarSnapshot,{headers:{'Cache-Control':'no-store'}});
      }
      try {
        const upstream=await fetch(sources[kind],{headers:{'User-Agent':'APEX F1 Dashboard/1.0'},signal:AbortSignal.timeout(12000),cf:{cacheTtl:kind==='session'?30:180,cacheEverything:true}});
        if(!upstream.ok) throw new Error('Feed unavailable ('+upstream.status+')');
        if(kind==='news') {
          const xml=await upstream.text();
          const clean=s=>(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
          const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,12).map(m=>{
            const field=n=>clean(m[1].match(new RegExp('<'+n+'[^>]*>([\\s\\S]*?)<\\/'+n+'>'))?.[1]);
            const raw=m[1].match(/<(?:media:content|enclosure)[^>]*url=["']([^"']+)/)?.[1];
            return {title:field('title'),url:field('link'),date:field('pubDate'),description:field('description'),image:raw?.replace(/&amp;/g,'&'),source:'Autosport'};
          }).filter(x=>x.title&&x.url.startsWith('https://'));
          if(!items.length) throw new Error('News feed unavailable');
          return Response.json({items,fetchedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=180'}});
        }
        return new Response(await upstream.text(),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age='+ (kind==='session'?30:180)}});
      } catch(e) {return Response.json({error:e.message},{status:502});}
    }
    if(url.pathname!=='/'&&url.pathname!=='/loading'&&url.pathname!=='/index.html') return new Response('Not found',{status:404});
    return new Response(url.pathname==='/loading'?landingPage:page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  }
};
