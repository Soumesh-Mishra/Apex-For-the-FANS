import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import path from 'node:path';

// A small single-instance league store. SQLite transactions make each update
// atomic; a persistent volume is required when running inside a container.
export function createPredictionStore(file){
 if(file!==':memory:')mkdirSync(path.dirname(path.resolve(file)),{recursive:true,mode:0o700});
 const db=new DatabaseSync(file,{timeout:5000});
 if(file!==':memory:')chmodSync(file,0o600);
 db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS prediction_state (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL); PRAGMA user_version=1;');
 const initial={users:{},leagues:{},picks:{},results:{},deadlines:{}};
 db.prepare('INSERT OR IGNORE INTO prediction_state(id,value) VALUES (1,?)').run(JSON.stringify(initial));
 const select=db.prepare('SELECT value FROM prediction_state WHERE id=1'),save=db.prepare('UPDATE prediction_state SET value=? WHERE id=1');
 return {
  read(fn){return fn(JSON.parse(select.get().value));},
  transaction(fn){db.exec('BEGIN IMMEDIATE');try{const before=select.get().value,state=JSON.parse(before),result=fn(state);if(result&&typeof result.then==='function')throw Error('Prediction transactions must be synchronous');const after=JSON.stringify(state);if(after!==before)save.run(after);db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}},
  close(){db.close();}
 };
}

export function configuredPredictionStore(env=process.env){
 if(env.VERCEL)return null; // Vercel uses the separate managed Postgres adapter.
 // Render Free has ephemeral storage. Require an explicitly mounted data path.
 if(env.RENDER_EXTERNAL_URL&&!env.APEX_DATA_DIR)return null;
 return createPredictionStore(path.join(env.APEX_DATA_DIR||'.apex-data','predictions.sqlite'));
}
