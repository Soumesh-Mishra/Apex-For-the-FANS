// Standalone Node host for the same Worker used by Sites. Build first.
import http from 'node:http';
import {configuredPredictionStore} from './prediction-store.mjs';
const predictionsStore=configuredPredictionStore();
const runtimeEnv={GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID,APEX_SESSION_SECRET:process.env.APEX_SESSION_SECRET,OPENF1_ACCESS_TOKEN:process.env.OPENF1_ACCESS_TOKEN,PREDICTIONS_STORE:predictionsStore};
import worker from './dist/server/index.js';
const port=Number(process.env.PORT||4173);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be between 1 and 65535');
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain','X-APEX-Server':'apex-f1'});res.end('ok');return;}
  const origin=process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL||'http://localhost:'+port;
  const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
  // A standalone server must not trust a client-supplied Sites identity header.
  headers.delete('oai-authenticated-user-id');
  const chunks=[];let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>22000){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
  const request=new Request(new URL(req.url,origin),{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),duplex:'half'});
  const out=await worker.fetch(request,runtimeEnv);
  const responseHeaders=Object.fromEntries(out.headers);const cookies=out.headers.getSetCookie();if(cookies.length)responseHeaders['set-cookie']=cookies;
  res.writeHead(out.status,responseHeaders);res.end(req.method==='HEAD'?undefined:Buffer.from(await out.arrayBuffer()));
 }catch{if(!res.headersSent)res.writeHead(500);res.end('APEX encountered an error.');}
});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log('APEX listening on port '+port));
if(predictionsStore){setTimeout(()=>worker.scheduled({},runtimeEnv).catch(()=>{}),10000).unref();setInterval(()=>worker.scheduled({},runtimeEnv).catch(()=>{}),120000).unref();}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{predictionsStore?.close();process.exit(0);}));
