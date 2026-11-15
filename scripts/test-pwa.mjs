import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import worker from '../dist/server/index.js';
const get=(path,method='GET')=>worker.fetch(new Request('https://apex.test'+path,{method}));
const manifest=await(await get('/manifest.webmanifest')).json();
assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');
for(const icon of manifest.icons){const r=await get(icon.src);assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/png');const b=Buffer.from(await r.arrayBuffer());assert.equal(b.readUInt32BE(16),Number(icon.sizes.split('x')[0]));}
for(const path of ['/','/index.html','/login']){const html=await(await get(path)).text();assert(html.includes('rel="manifest"'));assert(html.includes('src="/install.js"'));}
assert((await(await get('/install')).text()).includes('iPhone &amp; iPad'));
assert.equal((await get('/sw.js')).headers.get('Service-Worker-Allowed'),'/');
assert.equal((await get('/sw.js')).headers.get('Cache-Control'),'no-cache');
assert.equal((await get('/install','POST')).status,405);
assert.equal(await(await get('/icons/apex-192.png','HEAD')).text(),'');
// Exercise offline routing: never intercept APIs, auth requests or other origins.
const listeners={},cached=new Response('offline fallback');let fetchFails=false;
const sandbox={URL,Request,Response,Promise,fetch:async()=>{if(fetchFails)throw Error('offline');return new Response('fresh');},caches:{match:async()=>cached,open:async()=>({add:async()=>{}}),keys:async()=>[]},self:{location:{origin:'https://apex.test'},addEventListener:(type,fn)=>listeners[type]=fn}};
vm.runInNewContext(await readFile('pwa/sw.js','utf8'),sandbox);
for(const url of ['https://apex.test/api/results','https://apex.test/api/auth/me','https://other.test/']){let intercepted=false;listeners.fetch({request:{url,method:'GET',mode:'cors'},respondWith(){intercepted=true;}});assert.equal(intercepted,false);}
for(const offline of [false,true]){fetchFails=offline;let result;listeners.fetch({request:{url:'https://apex.test/index.html',method:'GET',mode:'navigate'},respondWith(p){result=p;}});assert.equal(await(await result).text(),offline?'offline fallback':'fresh');}
console.log('Passed install routes, PNG dimensions, manifest, metadata, HEAD, methods and online/offline isolation checks.');
