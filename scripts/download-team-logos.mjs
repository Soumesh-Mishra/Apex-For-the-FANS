import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const references=JSON.parse(await readFile('data/team-logo-references.json','utf8'));
const queue=[...references.teams];
const logos={};
const results=await Promise.allSettled(Array.from({length:3},async()=>{while(queue.length){const team=queue.shift();const id=team.profile.split('/').at(-1);const original=team.images.find(image=>image.src?.includes('logowhite.webp'))?.src;if(!original)throw Error('Missing official logo: '+id);const source=original.replace('c_lfill,w_48/','c_lfill,w_192/');let success=false;for(let attempt=0;attempt<3&&!success;attempt++){try{const r=await fetch(source,{signal:AbortSignal.timeout(15000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error('Logo request failed '+r.status);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<100||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Invalid WebP logo');logos[id]={source,profile:'https://www.formula1.com'+team.profile,dataUrl:'data:image/webp;base64,'+bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')};console.log('Verified logo',id,bytes.length,'bytes');success=true}catch(e){if(attempt===2)throw e;console.log('Retry logo',id,e.message)}}}}));
const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason;
if(Object.keys(logos).length!==11)throw Error('Expected 11 team logos');
await writeFile('data/team-logos.json',JSON.stringify({source:references.source,retrievedAt:new Date().toISOString(),note:'Official white team-logo assets from Formula1.com team cards; CDN width requested at 192px. Stored without recolouring or alteration.',logos},null,2));
