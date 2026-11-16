/* TEAM_PICKER_START */
async function updateTeamLegend(team){
 const panel=$('#team-legend');panel.hidden=true;
 if(!team.legend)return;
 const image=$('#team-legend-image');image.hidden=true;
 $('#team-legend-name').textContent=team.legend.name;
 $('#team-legend-label').textContent=team.legend.label;
 $('#team-legend-note').textContent=team.legend.note;
 $('#legend-palette-label').textContent=team.legend.accentLabel;
 $('#legend-palette').title='Art-inspired secondary colours';
 panel.dataset.team=team.id;
 try{const preload=new Image();preload.src=team.legend.image;await preload.decode();if(document.documentElement.dataset.team!==team.id)return;image.src=team.legend.image;image.alt='Anime fan art of '+team.legend.name;image.hidden=false;panel.hidden=false;}catch{}
}
const defaultHero={src:$('.hero > img').getAttribute('src'),alt:$('.hero > img').alt,credit:$('.hero-credit').textContent,link:$('.hero-credit').getAttribute('href')};
async function updateTeamCar(team){
 const hero=$('.hero'),heroImage=$('.hero > img'),backdrop=$('#team-car-backdrop'),background=$('#team-car-background'),credit=$('.hero-credit');
 backdrop.hidden=true;heroImage.hidden=true;
 if(!team.car){delete hero.dataset.teamCar;delete backdrop.dataset.team;background.removeAttribute('src');heroImage.src=defaultHero.src;heroImage.alt=defaultHero.alt;heroImage.hidden=false;credit.textContent=defaultHero.credit;credit.href=defaultHero.link;return}
 hero.dataset.teamCar=team.id;backdrop.dataset.team=team.id;credit.textContent='2026 '+team.name+' · Formula 1 ↗';credit.href=team.carSource;
 try{const image=new Image();image.src=team.car;await image.decode();if(document.documentElement.dataset.team!==team.id)return;heroImage.src=team.car;heroImage.alt='2026 '+team.name+' Formula 1 car';heroImage.hidden=false;background.src=team.car;backdrop.hidden=false;}catch{if(document.documentElement.dataset.team===team.id)credit.textContent=team.name+' · Car image unavailable ↗'}
}
function populateTeamPicker(){
 $('#team').innerHTML=[TeamThemes.fallback,...TeamThemes.teams].map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join('');
 $('#teams-grid').innerHTML=TeamThemes.teams.map((t,i)=>'<button class="team-choice" type="button" data-theme="'+t.id+'" aria-label="Use '+esc(t.name)+' theme" aria-pressed="false" style="--card-primary:'+t.primary+';--card-secondary:'+t.secondary+';--card-detail:'+(t.detail||t.secondary)+';--card-base:'+t.base+'"><span class="team-livery" aria-hidden="true"><span class="team-number">'+String(i+1).padStart(2,'0')+'</span><span class="team-livery-keyline"></span><img class="team-card-car" src="'+esc(t.car)+'" alt="" loading="lazy" decoding="async"></span><span class="team-choice-body"><span class="team-choice-heading"><span class="team-choice-name">'+esc(t.name)+'</span><span class="team-choice-check" aria-hidden="true">✓</span></span><span class="team-palette">'+esc(t.palette)+'</span><span class="team-description">'+esc(t.description)+'</span><span class="team-choice-foot"><span class="team-swatches" aria-hidden="true"><i style="background:'+t.primary+'"></i><i style="background:'+t.secondary+'"></i><i style="background:'+(t.detail||t.base)+'"></i></span><span class="team-hex">'+t.primary+'</span><span class="team-choice-action">Use colours ↗</span></span></span></button>').join('');
 $$('[data-theme]').forEach(button=>button.addEventListener('click',()=>selectTeamTheme(button.dataset.theme,true)));
}
function selectTeamTheme(value,persist=false){
 const team=TeamThemes.apply(document.documentElement,value);
 $('#team').value=team.id;
 $('#current-team-name').textContent=team.name;
 $('#current-team-palette').textContent=team.palette;
 $('#active-team-label').textContent=team.shortName||team.name;
 $('#team-picker-link').setAttribute('aria-label','Choose team colours. Current: '+team.name);
 $$('[data-team-logo]').forEach(slot=>{slot.hidden=team.id==='apex';const image=slot.querySelector('img');if(team.logo){image.src=team.logo;image.alt=team.name+' logo';slot.title=team.name;}else{image.removeAttribute('src');image.alt='';slot.removeAttribute('title')}});
 $$('a.brand').forEach(brand=>brand.setAttribute('aria-label',team.id==='apex'?'APEX home':'APEX home · '+team.name));
 updateTeamCar(team);
 renderTeamAbout(team);
 updateTeamLegend(team);
 $$('[data-theme]').forEach(button=>{const selected=button.dataset.theme===team.id;button.setAttribute('aria-pressed',String(selected));button.querySelector('.team-choice-action').textContent=selected?'Selected ✓':'Use colours ↗'});
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',team.base);
 if(persist){window.PersonalPaddock?.setTeam(team.id);try{localStorage.setItem('apex-team',team.id)}catch{}toast(team.id==='apex'?'APEX original colours restored.':team.name+' colours applied.');}
 return team;
}
function renderTeamAbout(team){
 $('#about-team').value=team.id==='apex'?'':team.id;
 const h=team.history;
 $('#team-history-content').innerHTML=h?'<div class="about-history"><div class="small">'+esc(h.era)+'</div><h2>The story of '+esc(team.name)+'</h2><p>'+esc(h.history)+'</p><a class="text-btn" href="'+esc(team.primarySource)+'" target="_blank" rel="noopener">Official team profile ↗</a></div><article class="about-fightback"><div class="eyebrow">'+esc(h.kind)+'</div><div class="small">'+esc(h.year)+'</div><h2>'+esc(h.title)+'</h2><p>'+esc(h.story)+'</p><a class="text-btn" href="'+esc(h.url)+'" target="_blank" rel="noopener">Read the original story ↗</a></article>':'<div class="panel empty">Choose a team above to explore its history, comeback story and featured legends.</div>';
}
$('#about-team').innerHTML='<option value="">Choose a team…</option>'+TeamThemes.teams.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join('');
$('#about-team').onchange=e=>{if(e.target.value)selectTeamTheme(e.target.value,true)};
$$('[data-team-page]').forEach(b=>b.onclick=()=>{const about=b.dataset.teamPage==='about';$('#team-colours-panel').hidden=about;$('#team-about-panel').hidden=!about;$$('[data-team-page]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))})});
populateTeamPicker();
selectTeamTheme(document.documentElement.dataset.team||'apex');
$('#team').addEventListener('change',e=>selectTeamTheme(e.target.value,true));
$('#reset-theme').addEventListener('click',()=>selectTeamTheme('apex',true));
window.addEventListener('storage',e=>{if(e.key==='apex-team')selectTeamTheme(e.newValue)});
/* TEAM_PICKER_END */
