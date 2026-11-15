/* APP_AUTH_UI_START */
function accountPath(){return '/login?next='+encodeURIComponent(location.pathname+location.search+location.hash)}
function updateAccountLink(){$('#account-link').href=accountPath()}
updateAccountLink();window.addEventListener('hashchange',updateAccountLink);
(async()=>{try{const response=await fetch('/api/auth/me',{cache:'no-store'});if(!response.ok)return;const data=await response.json();if(data.user){$('#account-label').textContent=data.user.name;$('#account-initial').textContent=data.user.name.charAt(0).toUpperCase();$('#account-link').setAttribute('aria-label','Your APEX account: '+data.user.name)}}catch{}})();
/* APP_AUTH_UI_END */
