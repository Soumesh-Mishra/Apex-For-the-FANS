import {spawnSync} from 'node:child_process';
for(const name of ['test-team-themes','test-replay','test-countdown','test-auth','test-entry-pages','test-duel','test-pwa','test-server']){
 const result=spawnSync(process.execPath,['scripts/'+name+'.mjs'],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
