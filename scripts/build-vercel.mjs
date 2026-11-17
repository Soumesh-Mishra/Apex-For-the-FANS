import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadSite} from '../source.mjs';
const built=spawnSync(process.execPath,['build.mjs','--standalone'],{stdio:'inherit'});
if(built.status!==0)process.exit(built.status||1);
const site=await loadSite(),root='vercel-public';
async function put(name,body){const file=path.join(root,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,body);}
for(const [name,body] of Object.entries({'index.html':site.page,'login.html':site.loginPage,'loading.html':site.landingPage,'privacy.html':site.privacyPage,'credits.html':site.creditsPage,'entry-review.html':site.entryReviewPage}))await put(name,body);
for(const [url,asset] of Object.entries(site.pwaAssets))await put(url.slice(1)+(path.extname(url)?'':'.html'),Buffer.from(asset.body,'base64'));
await put('assets/entry/apex-carbon-hero.webp',Buffer.from(site.threeAssets['apex-carbon-hero.webp'],'base64'));
await put('assets/models/formula-f226.glb',Buffer.from(site.threeAssets['formula-f226.glb'],'base64'));
for(const [name,body] of Object.entries(site.threeAssets))if(name.endsWith('.js'))await put('assets/three/'+name,body);
for(const [id,car] of Object.entries(site.teamCars))await put('assets/team-cars/'+id+'.webp',Buffer.from(car.dataUrl.split(',')[1],'base64'));
for(const [id,legend] of Object.entries(site.legendAssets))await put('assets/team-legends/'+id+'.jpg',Buffer.from(legend.dataUrl.split(',')[1],'base64'));
console.log('Built APEX web pages, install support and public assets for Vercel.');
