import {mkdir,writeFile} from 'node:fs/promises';
const configs=[{id:'bahrain-2024',key:9472,driver:1,title:'Bahrain Grand Prix · 2024'},{id:'monaco-2024',key:9523,driver:16,title:'Monaco Grand Prix · 2024'}];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function get(endpoint,params){const u=new URL('https://api.openf1.org/v1/'+endpoint);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));for(let attempt=0;attempt<4;attempt++){try{await pause(600);const r=await fetch(u,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();if(!Array.isArray(data)||!data.length)throw Error('Empty '+endpoint);console.log(endpoint,data.length);return data}catch(e){if(attempt===3)throw e;console.log('Retry',endpoint,e.message);await pause(3000*(attempt+1))}}}
await mkdir('data/history',{recursive:true});
for(const config of configs){
 const session=(await get('sessions',{session_key:config.key}))[0];
 const anchor=(await get('laps',{session_key:config.key,driver_number:config.driver,lap_number:3}))[0];
 const start=Date.parse(anchor.date_start),end=start+300000;
 const endISO=new Date(end).toISOString();
 const drivers=await get('drivers',{session_key:config.key});
 const laps=await get('laps',{session_key:config.key,'date_start<':endISO});
 const positions=await get('position',{session_key:config.key,'date<':endISO});
 const intervals=await get('intervals',{session_key:config.key,'date>':new Date(start-60000).toISOString(),'date<':endISO});
 const locations=await get('location',{session_key:config.key,'date>':new Date(start-1000).toISOString(),'date<':endISO});
 const stints=await get('stints',{session_key:config.key});
 const controls=await get('race_control',{session_key:config.key,'date<':endISO});
 const time=date=>Math.round((Date.parse(date)-start)/1000*1000)/1000;
 const seen=new Set();
 const gps=locations.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.x!==0||p.y!==0)).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).filter(p=>{const key=p.driver_number+':'+Math.floor(time(p.date));if(seen.has(key))return false;seen.add(key);return true}).map(p=>[time(p.date),p.driver_number,p.x,p.y]);
 const completeLaps=laps.filter(l=>l.date_start&&Number.isFinite(l.lap_duration)&&l.lap_duration>0);
 const outline=gps.filter(p=>p[1]===config.driver&&p[0]>=0&&p[0]<=anchor.lap_duration).map(p=>[p[2],p[3]]);
 const data={id:config.id,title:config.title,source:'https://openf1.org/',fetchedAt:new Date().toISOString(),session,start:new Date(start).toISOString(),duration:300,drivers:drivers.map(d=>({number:d.driver_number,name:d.full_name,code:d.name_acronym,team:d.team_name,color:'#'+d.team_colour})),positions:positions.map(p=>[time(p.date),p.driver_number,p.position]).sort((a,b)=>a[0]-b[0]),intervals:intervals.map(p=>[time(p.date),p.driver_number,p.gap_to_leader,p.interval]).sort((a,b)=>a[0]-b[0]),laps:completeLaps.map(l=>({driver:l.driver_number,lap:l.lap_number,start:time(l.date_start),end:time(l.date_start)+l.lap_duration,duration:l.lap_duration})),locations:gps,outline,stints:stints.map(s=>({driver:s.driver_number,start:s.lap_start,end:s.lap_end,compound:s.compound})),controls:controls.map(c=>({time:time(c.date),message:c.message,flag:c.flag,scope:c.scope,category:c.category})).sort((a,b)=>a.time-b.time)};
 if(data.outline.length<50||data.locations.length<1000||data.drivers.length<10)throw Error('Incomplete recording');
 await writeFile('data/history/'+config.id+'.json',JSON.stringify(data));
 console.log('Saved',config.id,'start',data.start,'locations',gps.length,'outline',outline.length);
}
