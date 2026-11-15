const ReplayCore = (()=>{
  function latest(rows,time){let lo=0,hi=rows.length-1,result=null;while(lo<=hi){const mid=(lo+hi)>>1;if(rows[mid][0]<=time){result=rows[mid];lo=mid+1}else hi=mid-1}return result}
  function group(rows){const map=new Map();for(const row of rows){if(!map.has(row[1]))map.set(row[1],[]);map.get(row[1]).push(row)}for(const values of map.values())values.sort((a,b)=>a[0]-b[0]);return map}
  function prepare(data){return {data,positions:group(data.positions),intervals:group(data.intervals),locations:group(data.locations)}}
  function snapshot(prepared,time){
    const {data}=prepared;time=Math.max(0,Math.min(data.duration,time));
    const rows=data.drivers.map(driver=>{
      const position=latest(prepared.positions.get(driver.number)||[],time);
      const interval=latest(prepared.intervals.get(driver.number)||[],time);
      const laps=data.laps.filter(l=>l.driver===driver.number);
      const started=laps.filter(l=>l.start<=time).sort((a,b)=>b.start-a.start)[0];
      const completed=laps.filter(l=>l.end<=time).sort((a,b)=>b.end-a.end)[0];
      const stint=data.stints.filter(s=>s.driver===driver.number&&started&&s.start<=started.lap&&s.end>=started.lap).sort((a,b)=>b.start-a.start)[0];
      const point=latest(prepared.locations.get(driver.number)||[],time);
      return {...driver,position:position?.[2]??null,gap:interval?.[2]??null,interval:interval?.[3]??null,lap:started?.lap??null,lastLap:completed?.duration??null,compound:stint?.compound??null,point:point&&time-point[0]<=3?[point[2],point[3]]:null};
    }).sort((a,b)=>(a.position??999)-(b.position??999)||a.number-b.number);
    return {time,rows,controls:data.controls.filter(e=>e.time<=time).slice(-4)};
  }
  function projection(outline){const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);const scale=Math.min(450/Math.max(1,maxX-minX),210/Math.max(1,maxY-minY));return point=>[260+(point[0]-(minX+maxX)/2)*scale,135-(point[1]-(minY+maxY)/2)*scale]}
  function formatLap(seconds){if(!Number.isFinite(seconds))return '—';return Math.floor(seconds/60)+':'+(seconds%60).toFixed(3).padStart(6,'0')}
  function formatGap(value){if(value===null||value===undefined)return '—';if(typeof value==='number')return value===0?'LEADER':'+'+value.toFixed(3);return String(value)}
  return {latest,group,prepare,snapshot,projection,formatLap,formatGap};
})();
