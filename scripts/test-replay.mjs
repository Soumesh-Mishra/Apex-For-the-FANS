import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(await readFile('replay-core.js','utf8')+'\nglobalThis.core=ReplayCore;',context);
const core=context.core;
const workerSource=await readFile('dist/server/index.js','utf8');
const worker=await import('data:text/javascript;base64,'+Buffer.from(workerSource).toString('base64'));
for(const id of ['bahrain-2024','monaco-2024']){
 const response=await worker.default.fetch(new Request('https://apex.test/api/history/'+id));assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.id,id);assert.equal(data.duration,300);assert.equal(data.drivers.length,20);assert(data.outline.length>50);
 const prepared=core.prepare(data);
 for(const time of [0,30,95,180,300]){
  const snapshot=core.snapshot(prepared,time);assert.equal(snapshot.rows.length,20);
  for(const row of snapshot.rows){
   const completed=data.laps.filter(l=>l.driver===row.number&&l.end<=time).sort((a,b)=>b.end-a.end)[0];
   assert.equal(row.lastLap,completed?.duration??null,'Never reveal an unfinished lap duration');
   const started=data.laps.filter(l=>l.driver===row.number&&l.start<=time).sort((a,b)=>b.start-a.start)[0];
   assert.equal(row.lap,started?.lap??null);
   const historicalPosition=data.positions.filter(p=>p[1]===row.number&&p[0]<=time).at(-1);
   assert.equal(row.position,historicalPosition?.[2]??null);
  }
  assert(snapshot.controls.every(e=>e.time<=time),'No future race-control messages');
 }
 const initial=core.snapshot(prepared,0),later=core.snapshot(prepared,180);
 assert(initial.rows.some(row=>{const next=later.rows.find(r=>r.number===row.number);return next.lastLap!==row.lastLap}),'Recorded lap times change as replay advances');
 assert.equal(core.snapshot(prepared,-50).time,0);assert.equal(core.snapshot(prepared,900).time,300);
 assert.equal(core.snapshot(prepared,0).rows[0].code, id==='bahrain-2024'?'VER':'LEC','Correct historical race leader');
 const project=core.projection(data.outline);
 assert(data.outline.every(p=>{const[x,y]=project(p);return x>=0&&x<=520&&y>=0&&y<=270}),'Recorded track fits viewport');
 const first=initial.rows.find(r=>r.point);const after=later.rows.find(r=>r.number===first.number);assert.notDeepEqual(Array.from(first.point),Array.from(after.point));
 const missing=core.prepare({...data,locations:data.locations.filter(p=>p[0]<-5)});
 assert(core.snapshot(missing,0).rows.every(row=>row.point===null),'Missing coordinates never produce invented car positions');
 console.log('Verified',id,'driver order, completed laps, time seeking, recorded locations, track projection and race-control ordering');
}
assert.equal(core.latest([[1,1],[3,3]],2)[1],1);assert.equal(core.latest([[1,1]],0),null);
assert.equal(core.formatLap(96.753),'1:36.753');assert.equal(core.formatGap(null),'—');assert.equal(core.formatGap('+1 LAP'),'+1 LAP');
assert.equal((await worker.default.fetch(new Request('https://apex.test/api/history/unknown'))).status,404);
const page=await(await worker.default.fetch(new Request('https://apex.test/index.html'))).text();
assert(page.includes("$$('[data-timing-mode],[data-archive-mode]').forEach"),'Browser selector helper preserved when assembling page');
console.log('Historical replay tests passed.');
