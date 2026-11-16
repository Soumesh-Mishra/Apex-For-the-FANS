import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createPredictionStore} from '../prediction-store.mjs';

const folder=await mkdtemp(path.join(os.tmpdir(),'apex-leagues-'));
const file=path.join(folder,'leagues.sqlite');let store=createPredictionStore(file);
let time=Date.parse('2026-11-16T12:00:00Z'),offline=false,correction=false;
class Clock extends Date{constructor(...args){super(...(args.length?args:[time]))}static now(){return time;}}
const race={season:'2026',round:'21',raceName:'Las Vegas Grand Prix',date:'2026-11-22',time:'04:00:00Z',Qualifying:{date:'2026-11-21',time:'04:00:00Z'}};
const drivers=['a','b','c','d'].map(id=>({driverId:id,givenName:'Driver',familyName:id.toUpperCase()}));
const rules=await readFile('prediction-rules.js','utf8'),api=await readFile('worker/predictions.js','utf8');
let requests=0;
function context(){const ctx=vm.createContext({Date:Clock,crypto,URL,Request,Response,TextEncoder,AbortSignal,calendarSnapshot:{MRData:{RaceTable:{Races:[race]}}},predictionRoster:{season:2026,drivers:drivers.map(d=>({id:d.driverId,name:d.givenName+' '+d.familyName}))},ApexAuth:{user:async request=>request.headers.get('X-Test-Google')?{id:'google:verified-user',name:'Verified Racer'}:null},fetch:async input=>{
 requests++;if(offline)throw Error('Offline');const url=String(input);
 if(url.includes('/drivers.json'))return Response.json({MRData:{DriverTable:{Drivers:drivers}}});
 if(url.includes('/qualifying.json'))return Response.json({MRData:{RaceTable:{Races:[{...race,QualifyingResults:[{position:'1',Driver:{driverId:'a'}}]}]}}});
 if(url.includes('/results.json'))return Response.json({MRData:{RaceTable:{Races:[{...race,Results:(correction?['b','a','c']:['a','b','c']).map((id,i)=>({position:String(i+1),Driver:{driverId:id},FastestLap:{rank:id===(correction?'a':'b')?'1':String(i+2)}}))}]}}});
 return Response.json({MRData:{RaceTable:{Races:[race]}}});
}});vm.runInContext(rules+'\n'+api+'\nglobalThis.predictions=PredictionAPI;globalThis.rules=PredictionRules;',ctx);return ctx;}
let ctx=context();const origin='https://apex.test';
async function call(route='',{method='GET',body,cookie='',google=false,wrongOrigin=false}={}){
 const headers={Cookie:cookie};if(body!==undefined){headers['Content-Type']='application/json';headers.Origin=wrongOrigin?'https://attacker.test':origin;}if(google)headers['X-Test-Google']='verified';
 const response=await ctx.predictions.handle(new Request(origin+'/api/predictions'+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{PREDICTIONS_STORE:store});return {response,data:await response.json()};
}
const picks={pole:'a',p1:'a',p2:'b',p3:'c',fastest:'b'};
try{
 assert.equal(ctx.rules.score(picks,{pole:'a',podium:['a','b','c'],fastest:'b'}).total,20);
 assert.equal(ctx.rules.score({...picks,p1:'b',p2:'c',p3:'a'},{pole:'a',podium:['a','b','c'],fastest:'b'}).total,11,'Wrong-place podium awards 2 each, without exact-place double counting');
 assert(!ctx.rules.validate({...picks,p3:'a'},['a','b','c','d']));
 assert.equal((await call('/guest',{method:'POST',body:{name:'<script>bad</script>'}})).response.status,400);
 assert.equal((await call('/guest',{method:'POST',body:{name:'Racer'},wrongOrigin:true})).response.status,403);
 const a=await call('/guest',{method:'POST',body:{name:'Alex'}}),b=await call('/guest',{method:'POST',body:{name:'Jamie'}});
 const ca=a.response.headers.get('Set-Cookie').split(';')[0],cb=b.response.headers.get('Set-Cookie').split(';')[0];
 assert(a.response.headers.get('Set-Cookie').includes('Secure; HttpOnly; SameSite=Lax'));
 const created=await call('/leagues',{method:'POST',cookie:ca,body:{name:'Sunday Pit Wall'}}),league=created.data.league;
 assert.equal(created.response.status,201);assert.match(league.code,/^[A-F\d]{8}$/);
 assert.equal((await call('?league='+league.id)).response.status,404,'Non-members cannot read private leagues');
 assert.equal((await call('/join',{method:'POST',cookie:cb,body:{code:'00000000'}})).response.status,404);
 await call('/join',{method:'POST',cookie:cb,body:{code:league.code.toLowerCase()}});await call('/join',{method:'POST',cookie:cb,body:{code:league.code}});
 let result=await call('?league='+league.id,{cookie:ca});assert.equal(result.data.league.members,2,'Joining is idempotent');assert.equal(result.data.feedFresh,true);
 let count=requests;await Promise.all([call('?league='+league.id,{cookie:ca}),call('?league='+league.id,{cookie:cb})]);assert.equal(requests,count,'Shared metadata cache');
 assert.equal((await call('/picks',{method:'PUT',cookie:ca,body:{league:league.id,race:'2026-21',picks:{...picks,p2:'a'}}})).response.status,400);
 assert.equal((await call('/picks',{method:'PUT',cookie:ca,body:{league:league.id,race:'2026-21',picks:{...picks,fastest:'unknown'}}})).response.status,400);
 assert.equal((await call('/picks',{method:'PUT',cookie:ca,body:{league:league.id,race:'2026-21',picks}})).response.status,200);
 const other={pole:'b',p1:'b',p2:'c',p3:'a',fastest:'b'};await call('/picks',{method:'PUT',cookie:cb,body:{league:league.id,race:'2026-21',picks:other}});
 result=await call('?league='+league.id,{cookie:cb});assert.equal(result.data.ownPicks.pole,'b');assert(result.data.league.standings.every(row=>row.picks===null),'All shared picks hidden before deadline');assert(!JSON.stringify(result.data).includes('google:'));assert.equal(result.response.headers.get('Cache-Control'),'no-store');
 offline=true;time+=121000;result=await call('?league='+league.id,{cookie:ca});assert.equal(result.data.feedFresh,false);
 assert.equal((await call('/picks',{method:'PUT',cookie:ca,body:{league:league.id,race:'2026-21',picks}})).response.status,503,'Schedule outage fails closed for edits');
 offline=false;time+=31000;result=await call('?league='+league.id,{cookie:ca});assert.equal(result.data.feedFresh,true);
 store.close();store=createPredictionStore(file);result=await call('?league='+league.id,{cookie:ca});assert.equal(result.data.ownPicks.p1,'a','Picks survive a server restart');
 assert.throws(()=>store.transaction(state=>{state.users.bad={};throw Error('Rollback');}));assert(!store.read(state=>state.users.bad));
 time=Date.parse('2026-11-21T04:00:00Z');
 assert.equal((await call('/picks',{method:'PUT',cookie:ca,body:{league:league.id,race:'2026-21',picks}})).response.status,409,'Exact deadline enforced on server');
 result=await call('?league='+league.id,{cookie:ca});assert.equal(result.data.locked,true);assert.equal(result.data.roundScore.total,3,'Qualifying scores before race result');assert(result.data.league.standings.every(row=>row.picks),'Picks revealed only after lock');
 time=Date.parse('2026-11-22T07:00:00Z');await ctx.predictions.refresh({PREDICTIONS_STORE:store});result=await call('?league='+league.id,{cookie:ca});assert.equal(result.data.roundScore.total,20);assert.equal(result.data.league.standings[0].points,20);assert.equal(result.data.league.standings[1].points,8);
 correction=true;time+=301000;result=await call('?league='+league.id,{cookie:ca});assert.equal(result.data.roundScore.total,12);result=await call('?league='+league.id,{cookie:ca});assert.equal(result.data.league.standings.find(row=>row.you).points,12,'Corrected results replace points without accumulating');
 offline=true;time+=301000;result=await call('?league='+league.id,{cookie:ca});assert.equal(result.data.roundScore.total,12,'Provider outage retains published scores');offline=false;
 result=await call('?league='+league.id,{cookie:ca,google:true});assert.equal(result.data.user.guest,false);assert.equal(result.data.ownPicks.p1,'a','Verified Google session claims this browser’s guest picks');assert.equal(result.data.league.members,2);
 assert.equal((await call('?league='+league.id,{cookie:ca})).response.status,404,'Claimed guest cookie no longer grants account access');
 // A missing qualifying time must not reveal another user's predictions early.
 const savedDeadline=race.Qualifying;delete race.Qualifying;time=Date.parse('2026-11-16T12:00:00Z');ctx=context();store.transaction(state=>{delete state.deadlines['2026-21'];});
 result=await call('?league='+league.id,{cookie:cb});assert.equal(result.data.locked,false);assert(result.data.league.standings.every(row=>row.picks===null));race.Qualifying={date:'invalid',time:'invalid'};ctx=context();assert.equal((await call('/picks',{method:'PUT',cookie:cb,body:{league:league.id,race:'2026-21',picks}})).response.status,409,'Malformed deadlines fail closed');race.Qualifying=savedDeadline;time+=32*86400000;assert.equal((await call('?league='+league.id,{cookie:cb})).response.status,404,'Guest expiry is checked on the server');
 const disabled=await ctx.predictions.handle(new Request(origin+'/api/predictions'),{});assert.equal(disabled.status,503);assert.equal((await disabled.json()).enabled,false);
 console.log('Passed predictions: scoring, invite membership/privacy, duplicate joins, driver validation, deadline enforcement, outage/recovery, restart persistence, rollback, partial/corrected results, background settlement, Google guest linking, hidden picks, CSRF and disabled storage.');
}finally{store.close();await rm(folder,{recursive:true,force:true});}
