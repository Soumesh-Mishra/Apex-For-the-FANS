const StrategyCore=(()=>{
 const compounds=['SOFT','MEDIUM','HARD'];
 function validate(config,plan){
  if(!config?.safety||typeof config.safety.enabled!=='boolean')throw Error('Set a valid safety-car configuration.');
  const finite=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
  if(!Number.isInteger(config.laps)||!finite(config.laps,5,100)||!finite(config.base,30,240)||!finite(config.pitLoss,0,60)||!finite(config.fuelGain,0,.2))throw Error('Use 5–100 laps, a 30–240 second base lap, 0–60 seconds pit loss and 0–0.2 seconds fuel gain.');
  for(const name of compounds)if(!finite(config.tyres?.[name]?.offset,-5,5)||!finite(config.tyres?.[name]?.degradation,0,1))throw Error('Tyre offsets must be −5 to +5 seconds; degradation must be 0–1 seconds per tyre-age lap.');
  if(config.safety?.enabled){const s=config.safety;if(!Number.isInteger(s.from)||!Number.isInteger(s.to)||s.from<1||s.to<s.from||s.to>config.laps||!finite(s.pitFactor,0,1)||!finite(s.wearFactor,0,1)||!finite(s.slowdown,0,120))throw Error('Check the safety-car window, pit/wear percentages and slowdown.');}
  if(!plan||!Array.isArray(plan.stops)||plan.stops.length>2||!Array.isArray(plan.compounds)||plan.compounds.length!==plan.stops.length+1||!plan.compounds.every(c=>compounds.includes(c)))throw Error('Choose a compound for every active stint.');
  if(plan.stops.some((lap,i)=>!Number.isInteger(lap)||lap<1||lap>=config.laps||(i>0&&lap<=plan.stops[i-1])))throw Error('Pit laps must increase, starting at lap 1 and finishing before the final lap.');
 }
 function simulate(config,plan){
  validate(config,plan);let age=0,stint=0,total=0;const trace=[];
  for(let lap=1;lap<=config.laps;lap++){
   const compound=plan.compounds[stint],tyre=config.tyres[compound],s=config.safety,underSC=!!s?.enabled&&lap>=s.from&&lap<=s.to;
   const pace=config.base+tyre.offset+tyre.degradation*age-config.fuelGain*(lap-1)+(underSC?s.slowdown:0);
   if(pace<=0)throw Error('These assumptions produce a non-positive lap time. Increase the base lap time.');
   const pit=plan.stops.includes(lap),loss=pit?config.pitLoss*(underSC?s.pitFactor:1):0;
   total+=pace+loss;trace.push({lap,compound,age,pace,pitLoss:loss,pit,underSC,cumulative:total});
   age+=underSC?s.wearFactor:1;if(pit){stint++;age=0;}
  }
  return {total,trace,stops:plan.stops.length};
 }
 function compare(config,a,b){const A=simulate(config,a),B=simulate(config,b);return {A,B,gap:B.total-A.total};}
 function optimise(config,plan){
  validate(config,plan);let best={plan:{compounds:[...plan.compounds],stops:[...plan.stops]},total:simulate(config,plan).total};
  const candidate=stops=>{const value={compounds:plan.compounds,stops},total=simulate(config,value).total;if(total<best.total-1e-8)best={plan:{compounds:[...plan.compounds],stops:[...stops]},total};};
  if(plan.stops.length===1)for(let i=1;i<config.laps;i++)candidate([i]);
  if(plan.stops.length===2)for(let i=1;i<config.laps-1;i++)for(let j=i+1;j<config.laps;j++)candidate([i,j]);
  return best;
 }
 function csv(result){const rows=[['Lap','A compound','A pace (s)','A pit loss (s)','A elapsed (s)','B compound','B pace (s)','B pit loss (s)','B elapsed (s)','B minus A (s)','Safety car']];result.A.trace.forEach((a,i)=>{const b=result.B.trace[i];rows.push([a.lap,a.compound,a.pace.toFixed(3),a.pitLoss.toFixed(3),a.cumulative.toFixed(3),b.compound,b.pace.toFixed(3),b.pitLoss.toFixed(3),b.cumulative.toFixed(3),(b.cumulative-a.cumulative).toFixed(3),a.underSC?'yes':'no']);});return rows.map(row=>row.join(',')).join('\n');}
 return {compounds,validate,simulate,compare,optimise,csv};
})();
