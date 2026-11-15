import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('dist/server/index.js','utf8');
const worker=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const html=await(await worker.default.fetch(new Request('https://apex.test/index.html'))).text();
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const nodes=new Map();
const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',value:'',innerHTML:'',classList:{toggle(){},add(){},remove(){}},addEventListener(){},setAttribute(){},removeAttribute(){},querySelector(){return {textContent:''}}});return nodes.get(selector)};
let now=Date.parse('2026-11-11T06:30:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
const intervals=[];
const context=vm.createContext({Date:Clock,Intl,console,URL,Blob,AbortSignal,document:{querySelector:node,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){},scrollTo(){}},location:{hash:'#overview'},localStorage:{getItem(){return ''}},setInterval(fn,ms){intervals.push({fn,ms})},setTimeout(){},clearTimeout(){},requestAnimationFrame(){},matchMedia(){return {matches:false}},fetch:async()=>{throw Error('Offline')}});
// Suppress startup feed requests; exercise calendar failures explicitly below.
vm.runInContext(script.replace(/\/\* DUEL_UI_START \*\/[\s\S]*?\/\* DUEL_UI_END \*\//,'').replace(/\/\* REPLAY_UI_START \*\/[\s\S]*?\/\* REPLAY_UI_END \*\//,'').replace(/\/\* TEAM_PICKER_START \*\/[\s\S]*?\/\* TEAM_PICKER_END \*\//,'').replace(/\/\* APP_AUTH_UI_START \*\/[\s\S]*?\/\* APP_AUTH_UI_END \*\//,'').replace(/\/\* SPOILER_UI_START \*\/[\s\S]*?\/\* SPOILER_UI_END \*\//,'').replace(/\/\* LIBRARY_UI_START \*\/[\s\S]*?\/\* LIBRARY_UI_END \*\//,'').replace(/\/\* CALCULATOR_UI_START \*\/[\s\S]*?\/\* CALCULATOR_UI_END \*\//,'').replace('refreshAll();setInterval(()=>','setInterval(()=>'),context);
assert.equal(node('#next-name').textContent,'Las Vegas GP','Bundled schedule starts countdown before any network response');
const initial=Number(node('#secs').textContent);now+=1000;vm.runInContext('tick()',context);assert.equal(Number(node('#secs').textContent),(initial+59)%60,'Seconds tick down');
await vm.runInContext('loadCalendar()',context);
assert.equal(node('#next-name').textContent,'Las Vegas GP','Failed request preserves countdown');
assert(intervals.some(x=>x.ms===60000&&x.fn.name==='loadCalendar'),'Automatic calendar retry registered');
// All requests fail: server must return its verified schedule, not a 502.
const realFetch=globalThis.fetch;
try{
 let attempts=0;globalThis.fetch=async()=>{attempts++;throw Error('Upstream unavailable')};
 const response=await worker.default.fetch(new Request('https://apex.test/api/calendar'));
 const fallback=await response.json();
 assert.equal(response.status,200);assert.equal(attempts,2);assert.equal(fallback._apex.source,'snapshot');
 assert(fallback.MRData.RaceTable.Races.length>0);
 // Valid response recovers and replaces the saved-schedule state.
 context.fetch=async()=>Response.json({...fallback,_apex:{source:'feed',verifiedAt:new Date().toISOString()}});
 await vm.runInContext('loadCalendar()',context);
 assert.equal(vm.runInContext('state.errors.calendar',context),undefined);
 now=Date.parse('2026-11-22T04:00:00Z');vm.runInContext('tick()',context);
 assert.equal(node('#next-name').textContent,'Qatar GP','Countdown advances at race start');
 now=Date.parse('2027-01-01T00:00:00Z');vm.runInContext('tick()',context);
 assert.equal(node('#next-name').textContent,'Season complete');assert.equal(node('#secs').textContent,'--','Completed season clears previous countdown');
 globalThis.fetch=async()=>Response.json({MRData:{RaceTable:{Races:[]}}});
 assert.equal((await(await worker.default.fetch(new Request('https://apex.test/api/calendar'))).json())._apex.source,'snapshot','Empty upstream calendar falls back');
}finally{globalThis.fetch=realFetch}
console.log('Passed: initial offline countdown, ticking, retries, server outage fallback, recovery, race rollover, season end, empty feed fallback, browser script syntax.');
