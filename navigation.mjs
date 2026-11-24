/** Display order and labels shared by the sidebar, section menu and page header. */
export const sections = [
 {group:'Race weekend', pages:[
  {id:'overview',label:'Overview',icon:'grid',primary:true,description:'The next race and your weekend at a glance.'},
  {id:'timing',label:'Race Center',icon:'activity',primary:true,description:'Live timing, race library, recorded replays and Driver Duel.'},
  {id:'calendar',label:'Calendar',icon:'calendar',primary:true,description:'Race dates, session times and calendar layouts.'},
  {id:'strategy',label:'Strategy Lab',icon:'scenarioChart',description:'Compare tyres, pit stops and safety-car scenarios.'},
  {id:'news',label:'Latest News',icon:'news',description:'Formula 1 headlines and race coverage.'}
 ]},
 {group:'The grid', pages:[
  {id:'standings',label:'Standings',icon:'trophy',description:'Driver and constructor standings and the championship calculator.'},
  {id:'teams',label:'Teams',icon:'teams',description:'Team colours, car finishes, legends and history.'}
 ]},
 {group:'Fan paddock', pages:[
  {id:'paddock',label:'My Paddock',icon:'paddockPass',primary:true,description:'Your favourite drivers, saved races and preferences.'},
  {id:'leagues',label:'Prediction Leagues',icon:'pickSheet',description:'Make race predictions and compare league scores.'},
  {id:'community',label:'The Grandstand',icon:'terrace',description:'Join public race chat or a fan discussion.'}
 ]}
];

export function navigationMarkup(){
 const destinations=Object.fromEntries(sections.flatMap(({group,pages})=>pages.map(({id,label,primary})=>[id,{group,label,primary:!!primary}])));
 const sidebar=sections.map(({group,pages})=>`<div class="nav-group" role="group" aria-label="${group}"><span class="nav-group-title" aria-hidden="true">${group}</span>${pages.map(({id,label,icon,primary})=>`<button type="button" data-view="${id}" class="${primary?'nav-primary':'nav-secondary'}" title="${label}"><i data-icon="${icon}"></i><span class="nav-label">${label}</span></button>`).join('')}</div>`).join('');
 const menu=sections.map(({group,pages})=>`<details class="menu-section" name="apex-sections" data-group="${group}"><summary>${group}</summary><div class="web-menu-grid">${pages.map(({id,label,description,icon,primary})=>`<button type="button" class="${primary?'menu-primary':'menu-secondary'}" data-go="${id}"><strong>${(['strategy','leagues','community'].includes(id))?`<i data-icon="${icon}" aria-hidden="true"></i> `:''}${label}</strong><span>${description}</span></button>`).join('')}</div></details>`).join('');
 return {destinations,sidebar,menu};
}
