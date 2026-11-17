import pg from 'pg';
const empty=()=>({users:{},leagues:{},picks:{},results:{},deadlines:{}});

// Retain the existing synchronous domain operations inside a request-scoped
// database transaction. The row lock prevents lost updates across instances.
export function snapshotStore(value){
 let state=structuredClone(value);
 return {
  read(fn){return fn(structuredClone(state));},
  transaction(fn){const next=structuredClone(state),result=fn(next);if(result&&typeof result.then==='function')throw Error('Prediction transactions must be synchronous');state=next;return result;},
  snapshot(){return structuredClone(state);}
 };
}
export function createPostgresStore(connectionString){
 const url=new URL(connectionString);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('Invalid database URL');
 // Keep certificate verification enabled even for provider URLs with sslmode=require.
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 const pool=new pg.Pool({connectionString:url.href,ssl:{rejectUnauthorized:true},max:2,connectionTimeoutMillis:8000,idleTimeoutMillis:10000,allowExitOnIdle:true});
 pool.on('error',()=>{});
 let ready;
 async function initialize(){
  if(!ready)ready=(async()=>{
   await pool.query('CREATE TABLE IF NOT EXISTS apex_state (id integer PRIMARY KEY CHECK (id = 1), value jsonb NOT NULL)');
   await pool.query('INSERT INTO apex_state(id,value) VALUES (1,$1::jsonb) ON CONFLICT (id) DO NOTHING',[JSON.stringify(empty())]);
  })().catch(error=>{ready=null;throw error;});
  return ready;
 }
 return {
  async run(action){
   await initialize();const client=await pool.connect();let broken=false;
   try{
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '8s'");
    await client.query("SET LOCAL statement_timeout = '12s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '55s'");
    const {rows}=await client.query('SELECT value FROM apex_state WHERE id=1 FOR UPDATE');
    const store=snapshotStore(rows[0].value),before=JSON.stringify(rows[0].value),result=await action(store);
    if(result instanceof Response&&result.status>=500){await client.query('ROLLBACK');return result;}
    const after=JSON.stringify(store.snapshot());
    if(after!==before)await client.query('UPDATE apex_state SET value=$1::jsonb WHERE id=1',[after]);
    await client.query('COMMIT');return result;
   }catch(error){try{await client.query('ROLLBACK');}catch{broken=true;}throw error;}
   finally{client.release(broken);}
  },
  close:()=>pool.end()
 };
}
