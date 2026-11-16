const PredictionRules=(()=>{
 const fields=['pole','p1','p2','p3','fastest'];
 function validate(picks,drivers){return !!picks&&fields.every(k=>typeof picks[k]==='string'&&drivers.includes(picks[k]))&&new Set([picks.p1,picks.p2,picks.p3]).size===3;}
 function score(picks,result){
  const parts={pole:0,p1:0,p2:0,p3:0,fastest:0};let exact=0;
  if(picks&&result){
   if(result.pole&&picks.pole===result.pole){parts.pole=3;exact++;}
   if(Array.isArray(result.podium)&&result.podium.length===3){['p1','p2','p3'].forEach((key,i)=>{if(picks[key]===result.podium[i]){parts[key]=5;exact++;}else if(result.podium.includes(picks[key]))parts[key]=2;});}
   if(result.fastest&&picks.fastest===result.fastest){parts.fastest=2;exact++;}
  }
  return {total:Object.values(parts).reduce((a,b)=>a+b,0),exact,parts};
 }
 return {fields,validate,score,maxPoints:20};
})();
