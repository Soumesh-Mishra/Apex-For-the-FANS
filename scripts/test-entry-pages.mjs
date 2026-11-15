import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import worker from '../dist/server/index.js';
const origin='https://apex.test';
for(const path of ['/','/login?preview=1','/loading?mode=welcome&preview=1','/loading?mode=transition&preview=1']){
 const response=await worker.fetch(new Request(origin+path));assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
 const html=await response.text();assert(!/__[A-Z_]+__/.test(html),'All entry template markers must be compiled: '+path);
 assert(!html.includes('drift-webgl'));assert(!html.includes('type="module"'));assert(html.includes('Choose your team'));
 for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
 if(path.startsWith('/loading')){assert(html.includes('data-loading-continue'));assert(html.includes('OPTION A'));assert(html.includes('OPTION B'));}
}
const image=await worker.fetch(new Request(origin+'/assets/entry/apex-carbon-hero.webp'));assert.equal(image.headers.get('Content-Type'),'image/webp');const bytes=new Uint8Array(await image.arrayBuffer());assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(new TextDecoder().decode(bytes.slice(8,12)),'WEBP');
const head=await worker.fetch(new Request(origin+'/assets/entry/apex-carbon-hero.webp',{method:'HEAD'}));assert.equal(await head.text(),'');
const script=await readFile('paddock-entry.js','utf8');
const context={document:{documentElement:{dataset:{team:'apex'}},querySelectorAll:()=>[],querySelector:()=>null,body:{hasAttribute:()=>false}},window:{addEventListener(){}},location:{origin,search:''},URL,URLSearchParams,TeamThemes:{apply:()=>({id:'apex',name:'APEX',logo:null}),fallback:{},teams:[]}};
const safeNext=vm.runInNewContext(script+';APEXEntry.safeNext',context);
for(const input of ['//evil.test','/\\evil.test','https://evil.test','javascript:alert(1)','/loading?next=/loading','/login','/api/auth/me','/assets/entry/x','/'])assert.equal(safeNext(input),'/index.html#overview',input);
assert.equal(safeNext('/index.html#calendar'),'/index.html#calendar');assert.equal(safeNext('/index.html?season=2024#timing'),'/index.html?season=2024#timing');
console.log('Passed login, both loading variants, compiled scripts, hero asset, HEAD and safe return navigation checks.');
