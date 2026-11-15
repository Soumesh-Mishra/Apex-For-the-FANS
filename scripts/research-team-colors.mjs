import {writeFile} from 'node:fs/promises';
const url='https://www.formula1.com/en/teams';
const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(response.status);
const html=await response.text();
const items=[];
for(const match of html.matchAll(/style="--f1-team-colour:(#[a-f0-9]{6});([^"]+)/gi)){
 const start=html.lastIndexOf('<a ',match.index);
 const card=html.slice(start,html.indexOf('</a>',match.index)+4);
 const href=card.match(/href="([^"]+)/)?.[1];
 items.push({url:href?.startsWith('/')?'https://www.formula1.com'+href:href,primary:match[1].toUpperCase(),accessible:match[2].match(/#[a-f0-9]{6}/i)?.[0].toUpperCase(),label:card.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,140)});
}
if(items.length!==11||new Set(items.map(t=>t.primary)).size!==11)throw Error('Unexpected team palette count');
await writeFile('data/team-colour-reference.json',JSON.stringify({source:url,retrievedAt:new Date().toISOString(),method:'Primary colours from the --f1-team-colour CSS property on official 2026 team cards. accessible is F1’s separate accessible-colour value, not a brand secondary.',teams:items},null,2));
console.log(JSON.stringify(items,null,2));
