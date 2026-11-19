(()=>{
 const el=id=>document.querySelector('#community-'+id);
 const join=el('join'), compose=el('compose');
 let mode='chat',topic='',revision=0,lastFeed='',busy=false,notice='',timer;
 const active=()=>location.hash==='#community' && !document.hidden;
 async function request(path,body){
  const response=await fetch(path,{method:body?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(12000),headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const result=await response.json();
  if(!response.ok) throw Error(result.error||'Community could not load.');
  return result;
 }
 function element(tag,text,cls){
  const node=document.createElement(tag);node.textContent=text;if(cls) node.className=cls;return node;
 }
 function post(item){
  const article=document.createElement('article');
  article.append(element('strong',item.name),element('span',' · '+new Date(item.created).toLocaleString(),'source'),element('p',item.text));
  return article;
 }
 function showFeed(data){
  const viewer=data.viewer;
  join.hidden=!!viewer;compose.hidden=!viewer;
  el('viewer').textContent=viewer?'Posting publicly as '+viewer:'Anyone can read. Choose a fan name to join in.';
  el('heading').textContent=data.topic?.title || (mode==='chat'?'Race chat':'Discussions');
  const signature=JSON.stringify([mode,topic,data.chat,data.topics,data.topic]);
  if(signature===lastFeed)return;
  lastFeed=signature;
  const feed=el('feed'),items=[];
  if(topic)items.push(post(data.topic),...data.topic.replies.map(post));
  else if(mode==='chat')items.push(...data.chat.map(post));
  else for(const t of data.topics){
   const button=element('button','','community-topic');
   button.append(element('strong',t.title),element('span',t.name+' · '+t.count+' replies','source'));
   button.onclick=()=>switchTo('topics',t.id);items.push(button);
  }
  if(!items.length)items.push(element('p',mode==='chat'?'No messages yet. What caught your eye this weekend?':'No discussions yet. Start with a question for the grid.'));
  feed.replaceChildren(...items);
 }
 async function refresh(){
  clearTimeout(timer);
  if(!active())return;
  const current=++revision;
  try{
   const data=await request('/api/community'+(topic?'?topic='+encodeURIComponent(topic):''));
   if(current!==revision)return;
   showFeed(data);el('status').textContent=notice;
  }catch(error){if(current===revision)el('status').textContent=error.message+' Retrying shortly.';}
  finally{if(current===revision && active())timer=setTimeout(refresh,6000);}
 }
 const drafts=new Map();
 function switchTo(next,id=''){
  if(busy)return;
  drafts.set(topic||mode,[compose.elements.title.value,compose.elements.message.value]);
  mode=next;topic=id;lastFeed='';notice='';
  const draft=drafts.get(topic||mode)||['',''];
  compose.elements.title.value=draft[0];compose.elements.message.value=draft[1];
  const newTopic=mode==='topics'&&!topic;
  el('back').hidden=!topic;el('title-label').hidden=!newTopic;
  compose.elements.title.required=newTopic;compose.elements.message.maxLength=mode==='chat'?500:2000;
  el('label').textContent=newTopic?'Opening post':topic?'Reply':'Message';
  el('send').textContent=newTopic?'Start discussion':topic?'Post reply':'Post message';
  for(const tab of ['chat','topics']){
   el(tab).classList.toggle('selected',tab===mode);
   el(tab).setAttribute('aria-pressed',String(tab===mode));
  }
  el('heading').textContent=topic?'Discussion':newTopic?'Discussions':'Race chat';
  el('feed').replaceChildren();el('status').textContent='Loading…';refresh();
 }
 for(const tab of ['chat','topics'])el(tab).onclick=()=>switchTo(tab);
 el('back').onclick=()=>switchTo('topics');
 async function submit(event){
  event.preventDefault();if(busy)return;
  const form=event.currentTarget,button=form.querySelector('button');
  busy=true;button.disabled=true;notice='';
  try{
   if(form===join)await request('/api/predictions/guest',{name:join.elements.name.value});
   else{
    const kind=topic?'reply':mode==='topics'?'topic':'chat';
    const result=await request('/api/community',{kind,topic,title:compose.elements.title.value,text:compose.elements.message.value});
    compose.reset();
    if(kind==='topic'){busy=false;switchTo('topics',result.id);return;}
   }
   await refresh();
  }catch(error){notice=error.message;el('status').textContent=notice;}
  finally{button.disabled=false;busy=false;}
 }
 join.onsubmit=compose.onsubmit=submit;
 function visit(){clearTimeout(timer);revision++;if(active())refresh();}
 window.addEventListener('hashchange',visit);
 document.addEventListener('visibilitychange',visit);
 visit();
})();
