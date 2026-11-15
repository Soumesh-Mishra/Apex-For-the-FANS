import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
const probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),PUBLIC_ORIGIN:'https://apex.test',GOOGLE_CLIENT_ID:'123-test.apps.googleusercontent.com',APEX_SESSION_SECRET:'test-only-session-secret-32-bytes-minimum-not-production'},stdio:['ignore','pipe','pipe']});
try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server start timed out')),10000);child.stdout.on('data',chunk=>{if(String(chunk).includes('APEX listening')){clearTimeout(timeout);resolve();}});child.on('error',reject);child.on('exit',code=>{clearTimeout(timeout);reject(Error('Server exited '+code));});});
 const origin='http://127.0.0.1:'+port;
 assert.equal(await(await fetch(origin+'/healthz')).text(),'ok');
 assert.equal((await fetch(origin+'/install')).status,200);
 assert.equal((await(await fetch(origin+'/manifest.webmanifest')).json()).display,'standalone');
 const auth=await fetch(origin+'/api/auth/config',{headers:{'oai-authenticated-user-id':'forged-host-identity'}});assert.equal(auth.status,200);
 const cookie=auth.headers.get('set-cookie');const sealed=cookie.match(/__Host-apex_google_flow=([^;]+)/)[1];const flow=JSON.parse(Buffer.from(sealed.split('.')[0],'base64url').toString());assert.equal(flow.siteUserId,'','Standalone host must strip client-supplied hosting identity');
 assert.equal((await fetch(origin+'/api/auth/google',{method:'POST',headers:{Origin:'https://wrong.test','Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await fetch(origin+'/api/auth/google',{method:'POST',body:'x'.repeat(23000)})).status,413);
 console.log('Passed standalone HTTP host, health check, install manifest, identity stripping, origin protection and request limit checks.');
}finally{child.kill('SIGTERM');}
