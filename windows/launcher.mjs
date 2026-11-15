import {spawn} from 'node:child_process';
import {readFile,writeFile,open} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const config=JSON.parse(await readFile(path.join(root,'installation.json'),'utf8'));
const origin='http://127.0.0.1:'+config.port;
const pidFile=path.join(root,'server.pid');
async function running(){try{const r=await fetch(origin+'/healthz',{signal:AbortSignal.timeout(1000)});return r.ok&&r.headers.get('X-APEX-Server')==='apex-f1';}catch{return false;}}
if(process.argv.includes('--stop')){
 if(await running()){const pid=Number(await readFile(pidFile,'utf8'));if(Number.isInteger(pid)&&pid>0)process.kill(pid);}
 process.exit(0);
}
if(!await running()){
 const log=await open(path.join(root,'server.log'),'a');
 const child=spawn(process.execPath,['--use-env-proxy','--dns-result-order=ipv4first','server.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(config.port),PUBLIC_ORIGIN:origin,GOOGLE_CLIENT_ID:'',APEX_SESSION_SECRET:''},detached:true,windowsHide:true,stdio:['ignore',log.fd,log.fd]});
 await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
 await writeFile(pidFile,String(child.pid));child.unref();await log.close();
 let ready=false;for(let attempt=0;attempt<40;attempt++){if(await running()){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,250));}
 if(!ready)throw Error('APEX did not start. Check server.log in '+root);
}
if(process.argv.includes('--check')){console.log('APEX is ready at '+origin);process.exit(0);}
const browser=spawn(config.browser,['--app='+origin+'/index.html?source=windows#overview','--window-size=1360,900'],{detached:true,windowsHide:false,stdio:'ignore'});
browser.on('error',error=>writeFile(path.join(root,'launch-error.log'),error.message));browser.unref();
