
const $=s=>document.querySelector(s);let config;
const requested=new URLSearchParams(location.search).get('next')||'/index.html#overview';let returnTo='/index.html#overview';try{const parsed=new URL(requested,location.origin);if(parsed.origin===location.origin&&!parsed.pathname.startsWith('/login')&&!parsed.pathname.startsWith('/api/')&&requested.startsWith('/')&&!requested.startsWith('//')&&!requested.includes('\\'))returnTo=parsed.pathname+parsed.search+parsed.hash}catch{}
document.querySelectorAll('[data-return]').forEach(a=>a.href=APEXEntry.loadingUrl(returnTo));
function status(text,error=false){$('#login-status').textContent=text;$('#login-status').classList.toggle('error',error)}
$('#retry-login').onclick=()=>location.reload();
const emailForm=$('#email-request'),verifyForm=$('#email-verify'),emailInput=$('#signin-email'),codeInput=$('#signin-code');
const resendButton=$('#email-resend'),emailStatus=$('#email-status');
let sentTo='',nextSendAt=0,emailBusy=false;
function showEmailStatus(message,error=false){
 emailStatus.textContent=message;
 emailStatus.classList.toggle('error',error);
}
async function emailAuth(action,body){
 const response=await fetch('/api/auth/email/'+action,{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(18000)
 });
 const data=await response.json();
 if(!response.ok){
  const error=Error(data.error||'Email sign-in is temporarily unavailable.');
  error.retryAfter=Number(data.retryAfter)||0;
  throw error;
 }
 return data;
}
async function sendCode(email){
 if(emailBusy)return;
 if(Date.now()<nextSendAt){
  showEmailStatus('Try again in '+Math.ceil((nextSendAt-Date.now())/1000)+' seconds.',true);
  return;
 }
 emailBusy=true;
 const button=emailForm.hidden?resendButton:emailForm.querySelector('button[type="submit"]');
 button.disabled=true;
 showEmailStatus('Sending your code…');
 try{
  await emailAuth('start',{email});
  sentTo=email;
  nextSendAt=Date.now()+60000;
  emailForm.hidden=true;
  verifyForm.hidden=false;
  codeInput.value='';
  showEmailStatus('We sent a code to '+email+'. It expires in 10 minutes.');
  codeInput.focus();
 }catch(error){
  if(error.retryAfter)nextSendAt=Date.now()+error.retryAfter*1000;
  showEmailStatus(error.retryAfter?'Please wait '+error.retryAfter+' seconds before trying again.':'Couldn’t send a code. Check the address and try again.',true);
 }finally{
  emailBusy=false;
  button.disabled=false;
 }
}
emailForm.onsubmit=event=>{event.preventDefault();sendCode(emailInput.value.trim());};
resendButton.onclick=()=>sendCode(sentTo);
$('#email-change').onclick=()=>{
 if(emailBusy)return;
 nextSendAt=0;
 verifyForm.hidden=true;
 emailForm.hidden=false;
 showEmailStatus('');
 emailInput.focus();
};
verifyForm.onsubmit=async event=>{
 event.preventDefault();
 if(emailBusy)return;
 emailBusy=true;
 const button=verifyForm.querySelector('button[type="submit"]');
 button.disabled=true;
 showEmailStatus('Checking your code…');
 try{
  await emailAuth('verify',{email:sentTo,code:codeInput.value});
  location.assign(APEXEntry.loadingUrl(returnTo));
 }catch(error){
  showEmailStatus(error.name==='TimeoutError'?'Verification timed out. Please try again.':error.message,true);
 }finally{
  emailBusy=false;
  button.disabled=false;
 }
};
async function completeSignIn(response){status('Verifying your Google account…');$('#google-button').inert=true;try{const result=await fetch('/api/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:response.credential,csrf:config.csrf})});const data=await result.json();if(!result.ok)throw Error(data.error||'Sign-in failed');location.assign(APEXEntry.loadingUrl(returnTo))}catch(error){status(error.message,true);$('#google-button').inert=false;$('#retry-login').hidden=false}}
async function start(){try{const meResponse=await fetch('/api/auth/me',{cache:'no-store'});if(!meResponse.ok)throw Error('Sign-in is temporarily unavailable.');const me=await meResponse.json();$('#email-signin').hidden=!me.emailEnabled;if(me.user){$('#signin-panel').hidden=true;$('#signedin-panel').hidden=false;$('#signed-name').textContent='Welcome, '+me.user.name+'.';$('#signed-email').textContent=me.user.email;$('#signed-avatar').textContent=me.user.name.charAt(0).toUpperCase();return}const response=await fetch('/api/auth/config',{cache:'no-store'});if(!response.ok)throw Error('Sign-in is temporarily unavailable.');config=await response.json();if(!config.enabled){$('#google-placeholder').hidden=Boolean(me.emailEnabled);status(me.emailEnabled?'':'Sign-in is temporarily unavailable. You can still explore APEX.');return}status('Loading Google sign-in…');const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=()=>{try{google.accounts.id.initialize({client_id:config.clientId,callback:completeSignIn,nonce:config.nonce,auto_select:false,use_fedcm_for_button:true});$('#google-placeholder').hidden=true;$('#google-button').hidden=false;google.accounts.id.renderButton($('#google-button'),{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'rectangular',width:Math.min(380,document.querySelector('.login-card').clientWidth)});status('Choose your Google account to continue.')}catch{status('Google sign-in could not load. Please reload and try again.',true);$('#retry-login').hidden=false}};script.onerror=()=>{status('Google sign-in could not load. Please reload and try again.',true);$('#retry-login').hidden=false};document.head.appendChild(script)}catch(error){status(error.message||'Sign-in is temporarily unavailable.',true);$('#retry-login').hidden=false}}
$('#signout').onclick=async()=>{$('#signout').disabled=true;try{const response=await fetch('/api/auth/signout',{method:'POST'});if(!response.ok)throw Error();location.reload()}catch{$('#signout').disabled=false;$('#signout').textContent='Could not sign out. Try again.'}};
start();
