import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {loadSite} from '../source.mjs';
const root='android/app/src/main/assets';
const site=await loadSite();
async function put(name,data){const file=path.join(root,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,data);}
const fetchBridge=`(()=>{
const networkFetch=window.fetch.bind(window);
const fetch=(input,init)=>networkFetch('/native-proxy?url='+encodeURIComponent(typeof input==='string'?input:input.url),init);
if(!AbortSignal.timeout)AbortSignal.timeout=ms=>{const controller=new AbortController();setTimeout(()=>controller.abort(),ms);return controller.signal;};
if(!Response.json)Response.json=(data,init={})=>new Response(JSON.stringify(data),{...init,headers:{'Content-Type':'application/json',...init.headers}});
const predictionRoster=${JSON.stringify(site.predictionRoster)};
const pwaAssets={},duelSnapshot=${JSON.stringify(site.duelSnapshot)},calendarSnapshot=${JSON.stringify(site.calendarSnapshot)},historicalRecordings=${JSON.stringify(site.history)};
const ApexAuth={handle:async request=>{const path=new URL(request.url).pathname;return Response.json(path==='/api/auth/me'?{user:null,googleEnabled:false}:path==='/api/auth/config'?{enabled:false}:path==='/api/auth/signout'?{ok:true}:{error:'Google sign-in is not configured in this Android build.'},{status:path==='/api/auth/google'?503:200});}};
${await readFile('paddock-core.js','utf8')}
${await readFile('worker/community.js','utf8')}
${await readFile('worker/paddock.js','utf8')}
${await readFile('prediction-rules.js','utf8')}
${await readFile('worker/predictions.js','utf8')}
${await readFile('worker/duel.js','utf8')}
${await readFile('worker/live-timing.js','utf8')}
${(await readFile('worker/handler.js','utf8')).replace('export default','const backend =')}
window.fetch=(input,init)=>{
 const url=new URL(typeof input==='string'?input:input.url,location.href);
 if(url.origin===location.origin&&url.pathname.startsWith('/api/'))return backend.fetch(new Request(url,input instanceof Request?input:init),{});
 return networkFetch(input,init);
};
})();`;
new vm.Script(fetchBridge);
await put('android-backend.js',fetchBridge);
function enhance(html){return html.replace('<head>','<head><script src="/android-backend.js"></script>').replace('<script src="/install.js" defer></script>','');}
await put('index.html',enhance(site.page));
await put('login.html',enhance(site.loginPage));
await put('privacy.html',site.privacyPage);
await put('credits.html',site.creditsPage);
await put('install.html',site.pwaAssets['/install']?Buffer.from(site.pwaAssets['/install'].body,'base64'):site.privacyPage);
await put('assets/entry/apex-carbon-hero.webp',Buffer.from(site.threeAssets['apex-carbon-hero.webp'],'base64'));
for(const [id,car] of Object.entries(site.teamCars))await put('assets/team-cars/'+id+'.webp',Buffer.from(car.dataUrl.split(',')[1],'base64'));
for(const [id,legend] of Object.entries(site.legendAssets))await put('assets/team-legends/'+id+'.jpg',Buffer.from(legend.dataUrl.split(',')[1],'base64'));
for(const [url,asset] of Object.entries(site.pwaAssets))if(url.includes('.'))await put(url.slice(1),Buffer.from(asset.body,'base64'));
await put('landing.html',enhance(site.landingPage));
// Root branding links stay in the bundled dashboard rather than an unresolved route.
await put('default.html',enhance(site.page));
console.log('Bundled Android dashboard, native data proxy adapter, team art and historical recordings.');
