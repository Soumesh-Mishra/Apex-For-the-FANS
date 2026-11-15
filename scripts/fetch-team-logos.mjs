import {writeFile} from 'node:fs/promises';
const source='https://www.formula1.com/en/teams';
const response=await fetch(source,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(response.status);
const html=await response.text();
const logos=[];
for(const match of html.matchAll(/style="--f1-team-colour:(#[a-f0-9]{6});([^"]+)/gi)){
 const start=html.lastIndexOf('<a ',match.index);
 const card=html.slice(start,html.indexOf('</a>',match.index)+4);
 const profile=card.match(/href="([^"]+)/)?.[1];
 const images=[...card.matchAll(/<img\b[^>]*>/g)].map(m=>({alt:m[0].match(/alt="([^"]*)/)?.[1],src:m[0].match(/src="([^"]+)/)?.[1]}));
 logos.push({profile,images});
}
console.log(JSON.stringify(logos,null,2));
await writeFile('data/team-logo-references.json',JSON.stringify({source,retrievedAt:new Date().toISOString(),teams:logos},null,2));
