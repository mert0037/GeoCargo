let game,network,paused=true,incident=null,playing=false;
function pick(id,values,selected){
  field(id).replaceChildren(...values.map(value=>new Option(value,value)));
  field(id).value=selected;
}
function selection(){
  const a=field('origin').value,b=field('dest').value;
  if(a===b)return null;
  const edge=planRoute(a,b,field('mode').value);
  return {edge,total:edge.price+(game.active.has(b)?0:350)};
}
function quote(){
  const plan=selection();
  field('quote').textContent=plan?Math.round(plan.edge.km).toLocaleString('en-US')+' km · '+dollars(plan.total)+' · '+Math.ceil(plan.edge.duration)+'s travel':'Choose two different hubs.';
}
function refresh(){dashboard(game);network.draw(game)}
function begin(){
  game=newGame();paused=false;playing=true;incident=null;field('brief').close();
  pick('origin',['Istanbul'],'Istanbul');pick('dest',Object.keys(hubs),'Suez');
  field('mode').value='Freight';field('pause').textContent='Pause';
  field('notice').textContent='Open the selected corridor to activate Suez and dispatch your first shipment.';
  quote();refresh();network.focus('Istanbul');
}
function build(){
  if(!playing||paused)return;
  const plan=selection();if(!plan)return;
  const {edge,total}=plan;
  if(game.routes.some(r=>r.mode===edge.mode&&[r.a,r.b].includes(edge.a)&&[r.a,r.b].includes(edge.b)))return field('notice').textContent='This corridor is already open.';
  if(game.cash<total)return field('notice').textContent='Insufficient funds.';
  game.cash-=total;game.active.add(edge.b);game.routes.push(edge);
  pick('origin',[...game.active],edge.a);quote();refresh();
  field('notice').textContent=edge.a+' → '+edge.b+' opened. Connected shipments dispatch automatically.';
}
function decide(protect){
  if(protect&&game.cash<400)return;
  if(protect){game.cash-=400;game.bonus+=50}
  else game.effect={...incident,end:game.time+30};
  incident=null;field('brief').close();refresh();
}
function crisis(){
  const [title,city,mode]=crises[game.time===38?0:1+Math.floor(Math.random()*7)];
  incident={title,city,mode,remaining:15};network.focus(city);
  dialog(title+' · 15s',mode+' corridors serving '+city+' face delays. Fund priority handling or accept half speed for 30 seconds.',[
    ...(game.cash>=400?[['Priority handling · $400',()=>decide(true)]]:[]),['Accept delays',()=>decide(false)]]);
}
function pause(){
  if(!playing||incident)return;
  paused=!paused;field('pause').textContent=paused?'Resume':'Pause';
}
function finish(){
  playing=false;
  let scores=[points(game)];
  try{scores.push(...JSON.parse(localStorage.getItem('geocargo-top')||'[]'));scores.sort((a,b)=>b-a);scores=scores.slice(0,5);localStorage.setItem('geocargo-top',JSON.stringify(scores))}catch{}
  dialog(game.lives?'Campaign complete':'Operations suspended',game.delivered+' shipments delivered · '+points(game)+' points. Best scores: '+scores.join(' / '),[['Play again',begin]]);
}
field('brief').oncancel=e=>e.preventDefault();
if(window.turf&&window.L){
  network=mapView(city=>{if(playing){field('dest').value=city;quote()}});network.draw(newGame());
  dialog('Your first dispatch',field('story').textContent,[['Start in Istanbul',begin]]);
  field('build').onclick=build;field('pause').onclick=pause;
  for(const id of ['origin','dest','mode'])field(id).onchange=quote;
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body){e.preventDefault();pause()}});
  setInterval(()=>{
    if(!playing||paused)return;
    tick(game);refresh();
    if(game.time===240||!game.lives)finish();
    else if(incident){incident.remaining--;if(incident.remaining===0)decide(false);else field('title').textContent=incident.title+' · '+incident.remaining+'s'}
    else if([38,98,158,206].includes(game.time))crisis();
  },1000);
}else dialog('Connection required','GeoCargo needs an internet connection for its mapping libraries.',[['Reload',()=>location.reload()]]);
