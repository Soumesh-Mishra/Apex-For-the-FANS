import worker from '../dist/server/index.js';
import {createPostgresStore} from '../postgres-store.mjs';
let database;
function store(){const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;if(!url)return null;return database||(database=createPostgresStore(url));}

// Web-standard handler: no listening server, timers or ephemeral SQLite files.
export default {
 async fetch(request){
  try{
   const url=new URL(request.url);
   const origin=process.env.PUBLIC_ORIGIN||url.origin;
   const headers=new Headers(request.headers);
   headers.delete('oai-authenticated-user-id');
   const body=['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer();
   if(body&&body.byteLength>22000)return Response.json({error:'Request too large'},{status:413});
   const trusted=new Request(new URL(url.pathname+url.search,origin),{method:request.method,headers,body});
   const env={GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID,APEX_SESSION_SECRET:process.env.APEX_SESSION_SECRET,OPENF1_ACCESS_TOKEN:process.env.OPENF1_ACCESS_TOKEN,OPENF1_USERNAME:process.env.OPENF1_USERNAME,OPENF1_PASSWORD:process.env.OPENF1_PASSWORD};
   if(url.pathname==='/api/cron/settle'){
    if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
    if(!process.env.CRON_SECRET||headers.get('Authorization')!=='Bearer '+process.env.CRON_SECRET)return Response.json({error:'Unauthorized'},{status:401});
    const db=store();if(!db)return Response.json({error:'Persistent database is not configured'},{status:503});
    await db.run(PREDICTIONS_STORE=>worker.scheduled({}, {...env,PREDICTIONS_STORE}));
    return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
   }
   const durable=url.pathname==='/api/community'||url.pathname==='/api/paddock'||url.pathname==='/api/predictions'||url.pathname.startsWith('/api/predictions/');
   const db=durable?store():null;
   const response=db?await db.run(PREDICTIONS_STORE=>worker.fetch(trusted,{...env,PREDICTIONS_STORE})):await worker.fetch(trusted,env);
   if(request.method==='HEAD')return new Response(null,{status:response.status,headers:response.headers});
   return response;
  }catch{return Response.json({error:'APEX is temporarily unavailable. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});}
 }
};
