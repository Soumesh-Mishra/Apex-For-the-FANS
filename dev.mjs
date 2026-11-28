import http from 'node:http';
import {configuredPredictionStore} from './prediction-store.mjs';
const predictionsStore=configuredPredictionStore();
let activeWorker;
const runtimeEnv={GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID,APEX_SESSION_SECRET:process.env.APEX_SESSION_SECRET,RESEND_API_KEY:process.env.RESEND_API_KEY,APEX_EMAIL_FROM:process.env.APEX_EMAIL_FROM,OPENF1_ACCESS_TOKEN:process.env.OPENF1_ACCESS_TOKEN,OPENF1_USERNAME:process.env.OPENF1_USERNAME,OPENF1_PASSWORD:process.env.OPENF1_PASSWORD,PREDICTIONS_STORE:predictionsStore};
setInterval(()=>activeWorker?.scheduled?.({},runtimeEnv).catch(()=>{}),120000).unref();
import {readFile,stat} from 'node:fs/promises';
const server=http.createServer(async(req,res)=>{
 try {
  const {loadSite}=await import('./source.mjs?updated='+(await stat('source.mjs')).mtimeMs);
  const [code,auth,site]=await Promise.all([readFile('worker/handler.js','utf8'),Promise.all([readFile('worker/auth.js','utf8'),readFile('worker/duel.js','utf8'),readFile('worker/live-timing.js','utf8'),readFile('prediction-rules.js','utf8'),readFile('worker/predictions.js','utf8'),readFile('paddock-core.js','utf8'),readFile('worker/paddock.js','utf8'),readFile('worker/community.js','utf8')]).then(parts=>parts.join('\n')),loadSite()]);
  const {predictionRoster,page,calendarSnapshot,history,loginPage,privacyPage,teamCars,legendAssets,landingPage,threeAssets,creditsPage,entryReviewPage,duelSnapshot,pwaAssets}=site;
  const prefix='const predictionRoster='+JSON.stringify(predictionRoster)+';const pwaAssets='+JSON.stringify(pwaAssets)+';const duelSnapshot='+JSON.stringify(duelSnapshot)+';const entryReviewPage='+JSON.stringify(entryReviewPage)+';const creditsPage='+JSON.stringify(creditsPage)+';const threeAssets='+JSON.stringify(threeAssets)+';const landingPage='+JSON.stringify(landingPage)+';const legendAssets='+JSON.stringify(legendAssets)+';const teamCars='+JSON.stringify(teamCars)+';const historicalRecordings='+JSON.stringify(history)+';const calendarSnapshot='+JSON.stringify(calendarSnapshot)+';const page='+JSON.stringify(page)+';const loginPage='+JSON.stringify(loginPage)+';const privacyPage='+JSON.stringify(privacyPage)+';';
  const worker=await import('data:text/javascript;base64,'+Buffer.from(prefix+auth+code).toString('base64'));
  activeWorker=worker.default;
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>22000){res.writeHead(413);res.end('Request too large');return}chunks.push(chunk)}
  const request=new Request('http://'+(req.headers.host||'localhost:4173')+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),duplex:'half'});
  const out=await worker.default.fetch(request,runtimeEnv);
  const headers=Object.fromEntries(out.headers);const cookies=out.headers.getSetCookie();if(cookies.length)headers['set-cookie']=cookies;
  res.writeHead(out.status,headers);res.end(Buffer.from(await out.arrayBuffer()));
 }catch{res.writeHead(500);res.end('APEX encountered an error.')}
});
const port=Number(process.env.PORT)||4173;
server.listen(port,'0.0.0.0',()=>console.log('Local: http://localhost:'+port));
