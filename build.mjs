import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {loadSite} from './source.mjs';
await mkdir('dist/server',{recursive:true});
const {predictionRoster,page,calendarSnapshot:snapshot,history,loginPage,privacyPage,teamCars,legendAssets,landingPage,threeAssets,creditsPage,entryReviewPage,duelSnapshot,pwaAssets}=await loadSite();
const auth=(await readFile('worker/auth.js','utf8'))+'\n'+(await readFile('worker/duel.js','utf8'))+'\n'+(await readFile('worker/live-timing.js','utf8'));
const predictions=(await readFile('prediction-rules.js','utf8'))+'\n'+(await readFile('worker/predictions.js','utf8'));
const handler=(await readFile('worker/community.js','utf8'))+'\n'+(await readFile('paddock-core.js','utf8'))+'\n'+(await readFile('worker/paddock.js','utf8'))+'\n'+(await readFile('worker/handler.js','utf8'));
await writeFile('dist/server/index.js','const predictionRoster='+JSON.stringify(predictionRoster)+';const pwaAssets='+JSON.stringify(pwaAssets)+';const duelSnapshot='+JSON.stringify(duelSnapshot)+';const entryReviewPage='+JSON.stringify(entryReviewPage)+';const creditsPage='+JSON.stringify(creditsPage)+';const threeAssets='+JSON.stringify(threeAssets)+';const landingPage='+JSON.stringify(landingPage)+';\nconst page='+JSON.stringify(page)+';\nconst loginPage='+JSON.stringify(loginPage)+';\nconst privacyPage='+JSON.stringify(privacyPage)+';\nconst legendAssets='+JSON.stringify(legendAssets)+';\nconst teamCars='+JSON.stringify(teamCars)+';\nconst calendarSnapshot='+JSON.stringify(snapshot)+';\nconst historicalRecordings='+JSON.stringify(history)+';\n'+auth+'\n'+predictions+'\n'+handler);
if(!process.argv.includes('--standalone')){
 try{await readFile('.openai/hosting.json');await mkdir('dist/.openai',{recursive:true});await copyFile('.openai/hosting.json','dist/.openai/hosting.json');}
 catch(error){if(error.code!=='ENOENT')throw error;}
}
console.log('Built APEX worker');
