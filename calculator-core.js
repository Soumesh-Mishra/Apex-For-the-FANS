const ChampionshipCalculator=(()=>{
 const scales={race:[25,18,15,12,10,8,6,4,2,1],race75:[19,14,12,10,8,6,4,3,2,1],race50:[13,10,8,6,5,4,3,2,1],race25:[6,4,3,2,1],sprint:[8,7,6,5,4,3,2,1],none:[]};
 function project(drivers,events){
  const ids=new Set(drivers.map(d=>d.id));if(ids.size!==drivers.length||drivers.some(d=>!Number.isFinite(d.points)||d.points<0))throw Error('The baseline standings are invalid. Refresh and try again.');
  const added=new Map(drivers.map(d=>[d.id,0]));
  for(const event of events){const points=scales[event.scale];if(!points)throw Error('Choose a valid points scale.');const used=new Set();for(let i=0;i<points.length;i++){const id=event.order[i];if(!id)continue;if(!ids.has(id))throw Error('A selected driver is no longer in this baseline.');if(used.has(id))throw Error('Each driver can occupy only one scoring position per session.');used.add(id);added.set(id,added.get(id)+points[i])}}
  const rows=drivers.map(d=>({...d,added:added.get(d.id),total:d.points+added.get(d.id)})).sort((a,b)=>b.total-a.total||a.position-b.position);
  let rank=0;rows.forEach((r,i)=>{if(i===0||r.total!==rows[i-1].total)rank=i+1;r.rank=rank;r.gap=rows[0].total-r.total;r.tied=rows.some(x=>x.id!==r.id&&x.total===r.total)});return rows;
 }
 return {scales,project};
})();
