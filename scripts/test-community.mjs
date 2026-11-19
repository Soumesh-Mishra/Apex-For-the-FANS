import assert from 'node:assert/strict';
import {createPredictionStore} from '../prediction-store.mjs';
import worker from '../dist/server/index.js';
const origin='https://apex.test',store=createPredictionStore(':memory:');
async function call(path,cookie='',body){
 const request=new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:body&&JSON.stringify(body)});
 return worker.fetch(request,{PREDICTIONS_STORE:store});
}
async function guest(name){
 const response=await call('/api/predictions/guest','',{name});
 assert.equal(response.status,201);return response.headers.get('set-cookie').split(';')[0];
}
const path='/api/community';
try{
 const a=await guest('Fan One'),b=await guest('Fan Two');
 assert.equal((await call(path,'',{kind:'chat',text:'Hello'})).status,401);
 assert.equal((await call(path,a,{kind:'chat',text:'Watching the race'})).status,201);
 assert.equal((await (await call(path,b)).json()).chat[0].text,'Watching the race');
 assert.equal((await call(path,a,{kind:'chat',text:'Again'})).status,429);
 const topic=await (await call(path,b,{kind:'topic',title:'Pit this lap?',text:'How long would you stay out?'})).json();
 const c=await guest('Fan Three');
 assert.equal((await call(path,c,{kind:'reply',topic:topic.id,text:'One more lap.'})).status,201);
 const detail=await (await call(path+'?topic='+topic.id)).json();
 assert.equal(detail.topic.replies[0].text,'One more lap.');
 assert.equal(detail.topic.replies[0].name,'Fan Three');
 assert.equal((await (await call(path)).json()).topics[0].count,1);
 console.log('Community public reads, guest sessions, chat, cooldown, topics and replies passed.');
}finally{store.close()}
