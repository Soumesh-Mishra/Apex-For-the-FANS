import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {loadSite} from '../source.mjs';
const {page}=await loadSite();
const core=page.match(/<script data-team-bootstrap>([\s\S]*?)<\/script>/)[1];
const main=page.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(main);
const expected={'alpine':'#00A1E8','aston-martin':'#229971','audi':'#FF2D00','cadillac':'#AAAAAD','ferrari':'#E8002D','haas':'#DEE1E2','mclaren':'#FF8000','mercedes':'#27F4D2','racing-bulls':'#6692FF','red-bull-racing':'#3671C6','williams':'#1868DB'};
const root={style:{setProperty(){}},dataset:{}};
const context=vm.createContext({document:{documentElement:root},localStorage:{getItem(){return 'Ferrari'}}});
vm.runInContext(core+'\nglobalThis.themes=TeamThemes;',context);const themes=context.themes;
assert.equal(root.dataset.team,'ferrari','Legacy preference migrates to current theme');
assert.equal(themes.teams.length,11);assert.deepEqual(themes.teams.map(t=>t.id).sort().join(','),Object.keys(expected).sort().join(','));
const logos=JSON.parse(await readFile('data/team-logos.json','utf8')).logos;
const cars=JSON.parse(await readFile('data/team-cars.json','utf8')).cars;
assert.equal(new Set(Object.values(cars).map(car=>car.sha256)).size,11,'Every team has a distinct car asset');
for(const team of themes.teams){assert.equal(team.car,'/assets/team-cars/'+team.id+'.webp');assert(cars[team.id].profile.endsWith('/'+team.id));assert.equal(cars[team.id].year,2026);const bytes=Buffer.from(cars[team.id].dataUrl.split(',')[1],'base64');assert.equal(createHash('sha256').update(bytes).digest('hex'),cars[team.id].sha256)}
for(const team of themes.teams){const logo=logos[team.id];assert(logo.profile.endsWith('/'+team.id));assert.equal(team.logo,logo.dataUrl);const bytes=Buffer.from(team.logo.split(',')[1],'base64');assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(createHash('sha256').update(bytes).digest('hex'),logo.sha256);}
assert.equal((page.match(/data-team-logo hidden/g)||[]).length,2,'Desktop and mobile logo slots start hidden');
for(const team of [themes.fallback,...themes.teams]){
 const values=themes.tokens(team.id);
 if(team.id!=='apex')assert.equal(values['--accent'],expected[team.id],'Exact primary from official F1 team card');
 assert(themes.contrast(values['--accent'],values['--accent-on'])>=4.5,team.id+' button text contrast');
 for(const surface of ['--bg','--panel','--panel2']){
  assert(themes.contrast(values['--accent-ink'],values[surface])>=4.5,team.id+' accent text contrast on '+surface);
  assert(themes.contrast('#F5F5F5',values[surface])>=4.5,team.id+' body text contrast');
  assert(themes.contrast(values['--muted'],values[surface])>=4.5,team.id+' secondary text contrast');
 }
 themes.apply(root,team.id);assert.equal(root.dataset.team,team.id);
 console.log('Verified',team.name,values['--accent'],'button contrast',themes.contrast(values['--accent'],values['--accent-on']).toFixed(2));
}
assert.equal(themes.resolve('Red Bull').id,'red-bull-racing');assert.equal(themes.resolve('Haas').id,'haas');assert.equal(themes.resolve('not-a-team').id,'apex');
assert.notEqual(themes.tokens('red-bull-racing')['--accent'],themes.tokens('racing-bulls')['--accent']);
context.localStorage.getItem=()=>{throw Error('Storage disabled')};vm.runInContext(core,vm.createContext({document:{documentElement:root},localStorage:context.localStorage}));assert.equal(root.dataset.team,'apex');
assert(!page.includes('__TEAM_'),'No unexpanded theme placeholders');
const historical=JSON.parse(await readFile('data/history/bahrain-2024.json','utf8'));assert.equal(historical.drivers.find(d=>d.number===44).team,'Mercedes','Historical driver identity untouched');
console.log('All 11 team themes plus APEX pass palette, contrast, legacy preference and blocked-storage checks.');
