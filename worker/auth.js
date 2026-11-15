const ApexAuth=(()=>{
 const encoder=new TextEncoder(),decoder=new TextDecoder();
 const SESSION='__Host-apex_session',FLOW='__Host-apex_google_flow';
 let cachedKeys=null,keyExpiry=0;
 const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Vary':'Cookie',...headers}});
 const bytes64=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const base64=bytes=>{let s='';for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
 const random=()=>base64(crypto.getRandomValues(new Uint8Array(32)));
 const cookies=request=>Object.fromEntries((request.headers.get('Cookie')||'').split(';').map(part=>{const at=part.indexOf('=');return at<0?[]:[part.slice(0,at).trim(),part.slice(at+1)]}).filter(pair=>pair.length===2));
 const cookie=(name,value,age)=>name+'='+value+'; Path=/; Max-Age='+age+'; Secure; HttpOnly; SameSite=Lax';
 const configured=env=>/^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID||'')&&typeof env.APEX_SESSION_SECRET==='string'&&env.APEX_SESSION_SECRET.length>=32;
 async function signingKey(secret,purpose){return crypto.subtle.importKey('raw',encoder.encode(purpose+':'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
 async function seal(value,secret,purpose){const body=base64(encoder.encode(JSON.stringify(value)));const signature=await crypto.subtle.sign('HMAC',await signingKey(secret,purpose),encoder.encode(body));return body+'.'+base64(new Uint8Array(signature))}
 async function unseal(token,secret,purpose){try{if(typeof token!=='string'||token.length>5000)return null;const parts=token.split('.');if(parts.length!==2||!parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)))return null;const valid=await crypto.subtle.verify('HMAC',await signingKey(secret,purpose),bytes64(parts[1]),encoder.encode(parts[0]));if(!valid)return null;const value=JSON.parse(decoder.decode(bytes64(parts[0])));return Number.isFinite(value.exp)&&value.exp>Date.now()/1000?value:null}catch{return null}}
 const siteIdentity=request=>request.headers.get('oai-authenticated-user-id')||'';
 async function user(request,env){if(!configured(env))return null;const session=await unseal(cookies(request)[SESSION],env.APEX_SESSION_SECRET,'session');if(!session||session.siteUserId!==siteIdentity(request)||typeof session.sub!=='string')return null;return {id:session.sub,name:session.name,email:session.email}}
 async function googleKeys(refresh=false){if(!refresh&&cachedKeys&&keyExpiry>Date.now())return cachedKeys;const r=await fetch('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Google verification is temporarily unavailable');const data=await r.json();if(!Array.isArray(data.keys))throw Error('Google verification is temporarily unavailable');cachedKeys=data.keys;const maxAge=Number(r.headers.get('Cache-Control')?.match(/max-age=(\d+)/)?.[1]||300);keyExpiry=Date.now()+Math.min(maxAge,3600)*1000;return cachedKeys;}
 async function verifyGoogle(credential,clientId,nonce){
  if(typeof credential!=='string'||credential.length>16000)throw Error('Invalid Google credential');
  const parts=credential.split('.');if(parts.length!==3||!parts.every(part=>/^[A-Za-z0-9_-]+$/.test(part)))throw Error('Invalid Google credential');
  let header,claims;try{header=JSON.parse(decoder.decode(bytes64(parts[0])));claims=JSON.parse(decoder.decode(bytes64(parts[1])))}catch{throw Error('Invalid Google credential')}
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>128||header.crit)throw Error('Invalid Google signing algorithm');
  let keys=await googleKeys();let jwk=keys.find(key=>key.kid===header.kid&&key.kty==='RSA'&&(!key.alg||key.alg==='RS256'));if(!jwk){keys=await googleKeys(true);jwk=keys.find(key=>key.kid===header.kid&&key.kty==='RSA'&&(!key.alg||key.alg==='RS256'))}if(!jwk)throw Error('Unknown Google signing key');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes64(parts[2]),encoder.encode(parts[0]+'.'+parts[1])))throw Error('Invalid Google signature');
  const now=Date.now()/1000;
  if(!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||claims.aud!==clientId||!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.iat)||claims.iat>now+60||claims.nonce!==nonce||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255||typeof claims.email!=='string'||claims.email.length>254||claims.email_verified!==true)throw Error('Google credential validation failed');
  return claims;
 }
 async function handle(request,env={}){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/auth/me'&&request.method==='GET')return json({user:await user(request,env),googleEnabled:configured(env)});
  if(path==='/api/auth/config'&&request.method==='GET'){
   if(!configured(env))return json({enabled:false});
   const nonce=random(),csrf=random();const value=await seal({nonce,csrf,exp:Math.floor(Date.now()/1000)+600,siteUserId:siteIdentity(request)},env.APEX_SESSION_SECRET,'flow');
   return json({enabled:true,clientId:env.GOOGLE_CLIENT_ID,nonce,csrf},200,{'Set-Cookie':cookie(FLOW,value,600)});
  }
  if(path==='/api/auth/signout'&&request.method==='POST'){
   if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid request origin'},403);
   const response=json({ok:true});response.headers.append('Set-Cookie',cookie(SESSION,'',0));response.headers.append('Set-Cookie',cookie(FLOW,'',0));return response;
  }
  if(path==='/api/auth/google'&&request.method==='POST'){
   if(!configured(env))return json({error:'Google sign-in is not enabled yet.'},503);
   if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Invalid sign-in request'},403);
   const flow=await unseal(cookies(request)[FLOW],env.APEX_SESSION_SECRET,'flow');if(!flow||flow.siteUserId!==siteIdentity(request))return json({error:'Sign-in expired. Reload this page and try again.'},403);
   let body;try{const text=await request.text();if(text.length>20000)return json({error:'Sign-in request too large'},413);body=JSON.parse(text)}catch{return json({error:'Invalid sign-in request'},400)}
   if(typeof body.csrf!=='string'||body.csrf!==flow.csrf)return json({error:'Invalid sign-in request'},403);
   try{
    const claims=await verifyGoogle(body.credential,env.GOOGLE_CLIENT_ID,flow.nonce);
    const name=String(claims.name||claims.email.split('@')[0]).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,100);
    const session=await seal({sub:'google:'+claims.sub,email:claims.email,name,siteUserId:siteIdentity(request),exp:Math.floor(Date.now()/1000)+604800},env.APEX_SESSION_SECRET,'session');
    const response=json({ok:true,user:{name,email:claims.email}});response.headers.append('Set-Cookie',cookie(SESSION,session,604800));response.headers.append('Set-Cookie',cookie(FLOW,'',0));return response;
   }catch{return json({error:'We could not verify this Google sign-in. Reload the page and try again.'},401)}
  }
  if(path.startsWith('/api/auth/'))return json({error:'Not found'},404);
  return null;
 }
 return {handle,user,verifyGoogle,configured};
})();
