const TeamThemes=(()=>{
 const teams=__TEAM_CONFIG__;
 const fallback={id:'apex',name:'APEX Original',shortName:'APEX',primary:'#FF302E',secondary:'#FFFFFF',base:'#101012',palette:'Red · white · black',description:'The original APEX pit wall.'};
 const rgb=hex=>hex.slice(1).match(/../g).map(n=>parseInt(n,16));
 const hex=channels=>'#'+channels.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
 function mix(a,b,amount){const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v*(1-amount)+y[i]*amount))}
 function luminance(color){const c=rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
 function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
 function resolve(value){const text=String(value||'').toLowerCase();return teams.find(t=>t.id===text||[t.name,...t.aliases].some(a=>a.toLowerCase()===text))||fallback}
 function tokens(value){const team=resolve(value);const background=team.base,panel=mix(background,'#FFFFFF',.035),panel2=mix(background,'#FFFFFF',.07);let ink=team.primary;for(let i=0;i<=100;i++){ink=mix(team.primary,'#FFFFFF',i/100);if([background,panel,panel2].every(bg=>contrast(ink,bg)>=4.5))break}let legendInk=team.legend?.accent||team.primary;for(let i=0;i<=100;i++){legendInk=mix(team.legend?.accent||team.primary,'#FFFFFF',i/100);if([background,panel,panel2].every(bg=>contrast(legendInk,bg)>=4.5))break}const foreground=contrast('#101012',team.primary)>=contrast('#FFFFFF',team.primary)?'#101012':'#FFFFFF';return {'--legend-accent':team.legend?.accent||team.primary,'--legend-secondary':team.legend?.accentSecondary||team.secondary,'--legend-ink':legendInk,'--legend-soft':(team.legend?.accent||team.primary)+'18','--accent':team.primary,'--red':team.primary,'--accent-ink':ink,'--accent-on':foreground,'--accent-secondary':team.secondary,'--accent-detail':team.detail||team.secondary,'--accent-soft':team.primary+'14','--accent-border':team.primary+'55','--accent-glow':team.primary+'20','--bg':background,'--panel':panel,'--panel2':panel2,'--line':mix(panel,'#FFFFFF',.105),'--sidebar':mix(background,'#FFFFFF',.015),'--muted':'#B1B1BA'};}
 function apply(root,value){const team=resolve(value);for(const[key,val]of Object.entries(tokens(team.id)))root.style.setProperty(key,val);root.dataset.team=team.id;return team}
 return {teams,fallback,resolve,tokens,apply,mix,contrast};
})();
try{TeamThemes.apply(document.documentElement,localStorage.getItem('apex-team'))}catch{TeamThemes.apply(document.documentElement,'apex')}
