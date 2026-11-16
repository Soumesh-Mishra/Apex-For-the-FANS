const PaddockRules=(()=>{
 const teams=['apex','alpine','aston-martin','audi','cadillac','ferrari','haas','mclaren','mercedes','racing-bulls','red-bull-racing','williams'];
 const defaults=()=>({team:'apex',spoilerFree:false,favouriteDrivers:[],savedRaces:[]});
 const validDriver=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,70}$/.test(id);
 function race(value){
  if(!value||typeof value!=='object')throw Error('Invalid saved race.');
  const season=Number(value.season),round=Number(value.round),name=value.name||value.raceName,circuit=value.circuit||value.Circuit?.circuitName||'',date=value.date;
  if(!Number.isInteger(season)||season<1950||season>new Date().getUTCFullYear()+1||!Number.isInteger(round)||round<1||round>30||typeof name!=='string'||!name.trim()||name.length>140||typeof circuit!=='string'||circuit.length>160||/[\u0000-\u001f<>]/.test(name+circuit)||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid saved race.');
  return {key:season+'-'+round,season,round,name:name.trim(),circuit:circuit.trim(),date};
 }
 function apply(profile,operations){
  const result={...defaults(),...profile,favouriteDrivers:[...(profile?.favouriteDrivers||[])],savedRaces:(profile?.savedRaces||[]).map(r=>race(r))};
  if(!Array.isArray(operations)||operations.length>120)throw Error('Too many paddock changes.');
  for(const operation of operations){
   if(!operation||typeof operation!=='object')throw Error('Invalid paddock change.');
   if(operation.type==='team'){if(!teams.includes(operation.value))throw Error('Choose a valid team.');result.team=operation.value;}
   else if(operation.type==='spoilers'){if(typeof operation.value!=='boolean')throw Error('Invalid spoiler preference.');result.spoilerFree=operation.value;}
   else if(operation.type==='driver-add'||operation.type==='driver-remove'){if(!validDriver(operation.value))throw Error('Invalid favourite driver.');if(operation.type==='driver-remove')result.favouriteDrivers=result.favouriteDrivers.filter(id=>id!==operation.value);else if(!result.favouriteDrivers.includes(operation.value))result.favouriteDrivers.push(operation.value);}
   else if(operation.type==='race-save'){const saved=race(operation.value),at=result.savedRaces.findIndex(r=>r.key===saved.key);if(at<0)result.savedRaces.push(saved);else result.savedRaces[at]=saved;}
   else if(operation.type==='race-remove'){if(typeof operation.value!=='string'||!/^\d{4}-\d{1,2}$/.test(operation.value))throw Error('Invalid saved race.');result.savedRaces=result.savedRaces.filter(r=>r.key!==operation.value);}
   else throw Error('Unknown paddock change.');
  }
  if(!teams.includes(result.team)||typeof result.spoilerFree!=='boolean'||!result.favouriteDrivers.every(validDriver))throw Error('Invalid paddock preferences.');
  if(result.favouriteDrivers.length>5)throw Error('Choose up to five favourite drivers.');
  if(result.savedRaces.length>100)throw Error('Save up to 100 races. Remove a saved race first.');
  return {team:result.team,spoilerFree:result.spoilerFree,favouriteDrivers:result.favouriteDrivers,savedRaces:result.savedRaces};
 }
 function seed(profile){return [{type:'team',value:profile.team},{type:'spoilers',value:profile.spoilerFree},...profile.favouriteDrivers.map(value=>({type:'driver-add',value})),...profile.savedRaces.map(value=>({type:'race-save',value}))];}
 const opKey=op=>op.type==='team'||op.type==='spoilers'?op.type:op.type.startsWith('driver-')?'driver:'+op.value:'race:'+(op.type==='race-save'?op.value.key:op.value);
 return {defaults,teams,race,apply,seed,opKey};
})();
