import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createPredictionStore} from '../prediction-store.mjs';
const core=await readFile('paddock-core.js','utf8'),backend=await readFile('worker/paddock.js','utf8');
const folder=await mkdtemp(path.join(os.tmpdir(),'apex-paddock-')),file=path.join(folder,'paddock.sqlite');let store=createPredictionStore(file),user=null;
const ctx=vm.createContext({Date,crypto,URL,Request,Response,TextEncoder,ApexAuth:{user:async()=>user,configured:()=>true}});
vm.runInContext(core+'\n'+backend+'\nglobalThis.api=PaddockAPI;globalThis.rules=PaddockRules;',ctx);
const origin='https://apex.test';
async function call(method='GET',body,headers={}){const response=await ctx.api.handle(new Request(origin+'/api/paddock',{method,headers:{Origin:origin,'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined}),{PREDICTIONS_STORE:store});return {status:response.status,data:await response.json()};}
const race={season:2024,round:1,raceName:'Bahrain Grand Prix',Circuit:{circuitName:'Bahrain International Circuit'},date:'2024-03-02'};
try{
 assert.equal((await call()).data.mode,'device');assert.equal((await call('PATCH',{operations:[]})).status,401);
 user={id:'google:alice',name:'Alice'};let result=await call(),aliceKey=result.data.accountKey;assert.equal(result.data.exists,false);assert.equal(result.data.profile.team,'apex');assert(!JSON.stringify(result.data).includes('google:alice'));
 assert.equal((await call('PATCH',{accountKey:aliceKey,operations:[]},{Origin:'https://attacker.test'})).status,403);
 const operations=[{type:'team',value:'ferrari'},{type:'spoilers',value:true},{type:'driver-add',value:'leclerc'},{type:'race-save',value:race}];
 result=await call('PATCH',{accountKey:aliceKey,operations});assert.equal(result.status,200);assert.equal(result.data.profile.favouriteDrivers[0],'leclerc');assert.equal(result.data.profile.savedRaces[0].key,'2024-1');const revision=result.data.revision;
 result=await call('PATCH',{accountKey:aliceKey,operations});assert.equal(result.data.revision,revision,'Retrying the same changes is idempotent');
 await call('PATCH',{accountKey:aliceKey,operations:[{type:'driver-add',value:'norris'}]});await call('PATCH',{accountKey:aliceKey,operations:[{type:'race-save',value:{...race,round:8,raceName:'Monaco Grand Prix'}}]});
 result=await call();assert.equal(result.data.profile.favouriteDrivers.length,2);assert.equal(result.data.profile.savedRaces.length,2,'Unrelated edits from another device survive');
 assert.equal((await call('PATCH',{accountKey:aliceKey,operations:[{type:'team',value:'evil'}]})).status,409);
 assert.equal((await call('PATCH',{accountKey:aliceKey,operations:[{type:'race-save',value:{...race,date:'2024-02-31'}}]})).status,409);
 assert.equal((await call('PATCH',{accountKey:aliceKey,operations:['a','b','c','d'].map(value=>({type:'driver-add',value}))})).status,409,'Six favourites fail atomically');assert.equal((await call()).data.profile.favouriteDrivers.length,2);
 user={id:'google:bob',name:'Bob'};assert.equal((await call()).data.exists,false);assert.equal((await call('PATCH',{accountKey:aliceKey,operations})).status,409,'A cookie/account switch cannot upload the old account’s data to the new one');
 user={id:'google:alice',name:'Alice'};store.close();store=createPredictionStore(file);assert.equal((await call()).data.profile.team,'ferrari','Preferences survive restart');
 const disabled=await ctx.api.handle(new Request(origin+'/api/paddock'),{});assert.equal((await disabled.json()).mode,'device');

 // Execute the real browser controller against the real API with small DOM stubs.
 // This tests offline queues and account boundaries without mocking sync logic.
 user=null;let offline=false,denyStorage=false;const values=new Map([['apex-team','mclaren']]),nodes=new Map(),events=new Map();
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:'',textContent:'',innerHTML:'',checked:false,hidden:false,disabled:false,querySelectorAll:()=>[],classList:{toggle(){},contains(){return false;}}});return nodes.get(selector);};
 const html={dataset:{team:'mclaren',spoilerFree:'false'}};
 const teams=['apex','ferrari','mclaren','mercedes'].map(id=>({id,name:id,primary:'#FF302E'}));
 const browser=vm.createContext({Date,crypto,URL,Request,Response,TextEncoder,AbortSignal,structuredClone,CustomEvent:class{constructor(type){this.type=type;}},localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>{if(denyStorage)throw Error('Quota');values.set(key,value);}},document:{documentElement:html,hidden:false,addEventListener(){},createElement:()=>node('new')},window:{addEventListener:(type,fn)=>{events.set(type,[...(events.get(type)||[]),fn]);},dispatchEvent:event=>{for(const fn of events.get(event.type)||[])fn(event);}},location:{hash:'#paddock'},$:node,$$:()=>[],esc:value=>String(value??'').replaceAll('<','&lt;'),TeamThemes:{teams:teams.slice(1),fallback:teams[0],resolve:id=>teams.find(t=>t.id===id)||teams[0]},selectTeamTheme:id=>html.dataset.team=id,SpoilerMode:{key:'apex-spoiler-free',apply:value=>html.dataset.spoilerFree=String(value)},updateSpoilerControls(){},initRaceCenterShortcuts(){},state:{races:[]},setInterval(){},setTimeout(){return 1;},clearTimeout(){},fetch:async(input,init={})=>{if(offline)throw Error('Offline');return ctx.api.handle(new Request(new URL(input,origin),{...init,headers:{...init.headers,Origin:origin}}),{PREDICTIONS_STORE:store});}});
 const roster={season:2026,checkedAt:'2026-11-16T00:00:00Z',drivers:[{id:'leclerc',name:'Charles Leclerc',team:'Ferrari'},{id:'norris',name:'Lando Norris',team:'McLaren'}]};
 vm.runInContext(core+'\n'+(await readFile('paddock-ui.js','utf8')).replace('__PADDOCK_ROSTER__',JSON.stringify(roster)),browser);
 const idle=()=>new Promise(resolve=>setImmediate(resolve));await idle();
 const personal=browser.window.PersonalPaddock;assert.equal(personal.profile().team,'mclaren','Legacy team preference migrates');
 personal.toggleDriver('leclerc');personal.toggleRace(race);assert.equal(personal.profile().savedRaces.length,1);assert(values.get('apex-personal-paddock-v1').includes('leclerc'));
 user={id:'google:charlie',name:'Charlie'};await personal.sync();let charlie=await call();assert.equal(charlie.data.profile.team,'mclaren');assert.equal(charlie.data.profile.savedRaces.length,1,'First account imports this device’s paddock');
 offline=true;personal.toggleDriver('norris');assert.equal(personal.profile().favouriteDrivers.length,2);await personal.sync();assert.equal(personal.profile().favouriteDrivers.length,2,'Failed sync keeps offline changes');
 offline=false;await personal.sync();assert.equal((await call()).data.profile.favouriteDrivers.length,2,'Queued changes retry successfully');
 const charlieKey=(await call()).data.accountKey;
 await call('PATCH',{accountKey:charlieKey,operations:[{type:'race-save',value:{...race,round:8,raceName:'Monaco Grand Prix'}}]});await personal.sync();assert.equal(personal.profile().savedRaces.length,2,'Another device’s edit is loaded');
 personal.setSpoilers(true);await personal.sync();await call('PATCH',{accountKey:charlieKey,operations:[{type:'spoilers',value:false}]});await personal.sync();assert.equal(html.dataset.spoilerFree,'true','Remote sync must not reveal spoilers');
 // Unsynced changes stay scoped to the previous account when cookies change.
 offline=true;personal.setTeam('mercedes');await personal.sync();user={id:'google:bob',name:'Bob'};offline=false;await personal.sync();assert.equal((await call()).data.profile.team,'apex');assert.equal(personal.profile().favouriteDrivers.length,0,'Switching accounts does not copy favourites');
 user={id:'google:charlie',name:'Charlie'};await personal.sync();assert.equal((await call()).data.profile.team,'mercedes','Original account retains its pending changes');
 user=null;await personal.sync();assert.equal(personal.profile().team,'mclaren','Signing out restores the separate device paddock');
 denyStorage=true;personal.toggleDriver('norris');personal.toggleRace({...race,round:8,raceName:'Monaco Grand Prix'});assert.equal(personal.profile().favouriteDrivers.length,2);assert.equal(personal.profile().savedRaces.length,2,'Blocked storage keeps subsequent edits in memory');
 console.log('Passed Personal Paddock: validation, idempotency, merge-safe operations, account isolation, persistence, legacy migration, offline retry, remote edits, spoiler protection, account switching, sign-out and blocked-storage fallback.');
}finally{store.close();await rm(folder,{recursive:true,force:true});}
