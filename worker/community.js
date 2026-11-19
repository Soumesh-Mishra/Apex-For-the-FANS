const CommunityAPI = (() => {
 const json = (data, status = 200) => Response.json(data, {status, headers:{'Cache-Control':'no-store', Vary:'Cookie'}});
 const publicPost = ({id, name, text, created}) => ({id, name, text, created});
 const initial = () => ({chat:[], topics:[]});

 async function handle(request, env){
  try {
   const store = env.PREDICTIONS_STORE;
   if(!store) return json({error:'Community needs a connected APEX server with shared storage.'},503);
   if(!['GET','POST'].includes(request.method)) return json({error:'Method not allowed.'},405);
   if(request.method==='POST' && (request.headers.get('Origin')!==new URL(request.url).origin || !request.headers.get('Content-Type')?.startsWith('application/json'))) return json({error:'Invalid request origin or format.'},403);
   const user = await PredictionAPI.identity(request,env,store);
   if(request.method==='GET'){
    const topicId = new URL(request.url).searchParams.get('topic');
    return store.read(state => {
     const room = state.community || initial();
     const viewer = user?.name || null;
     if(topicId){
      const topic = room.topics.find(t=>t.id===topicId);
      return topic ? json({viewer, topic:{...publicPost(topic),title:topic.title,replies:topic.replies.map(publicPost)}}) : json({error:'Discussion unavailable.'},404);
     }
     return json({viewer, chat:room.chat.slice(-50).reverse().map(publicPost), topics:room.topics.slice().sort((a,b)=>b.updated-a.updated).map(t=>({id:t.id,title:t.title,name:t.name,created:t.created,count:t.replies.length}))});
    });
   }
   if(!user) return json({error:'Choose a fan name to post.'},401);
   const raw = await request.text();
   if(raw.length>9000) return json({error:'Post is too long.'},413);
   let body;
   try {body=JSON.parse(raw)} catch {return json({error:'Invalid post.'},400)}
   const kind=body?.kind, text=typeof body?.text==='string' ? body.text.trim() : '';
   const title=typeof body?.title==='string' ? body.title.trim() : '';
   if(!['chat','topic','reply'].includes(kind) || !text || text.length>(kind==='chat'?500:2000) || (kind==='topic' && (!title || title.length>100))) return json({error:'Check the title and message length.'},400);
   return store.transaction(state=>{
    const room = state.community ||= initial();
    const topic = kind==='reply' && room.topics.find(t=>t.id===body.topic);
    if(kind==='reply' && !topic) return json({error:'Discussion unavailable.'},404);
    const now=Date.now(), since=room.lastPost?.[user.id]||0;
    if(now-since<3000) return json({error:'Please wait a few seconds before posting again.'},429);
    if(kind==='topic' && room.topics.length>=400 || topic && topic.replies.length>=200) return json({error:'This discussion space is full.'},409);
    room.lastPost ||= {};
    for(const key of Object.keys(room.lastPost)) if(room.lastPost[key]<now-3000) delete room.lastPost[key];
    room.lastPost[user.id]=now;
    const post={id:crypto.randomUUID(),name:user.name,text,created:now};
    if(kind==='topic') room.topics.push({...post,title,updated:now,replies:[]});
    if(kind==='reply'){topic.replies.push(post);topic.updated=now;}
    if(kind==='chat'){room.chat.push(post);if(room.chat.length>50) room.chat.shift();}
    return json({id:post.id},201);
   });
  } catch {return json({error:'Community is temporarily unavailable. Please retry.'},503);}
 }
 return {handle};
})();
