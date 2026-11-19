let game,network,playing=false,paused=false,speed=1,fraction=0,incident=null,source=null;
const hud=hudView(),analytics=analyticsView();
function news(text){
  field('headline').textContent=text;const li=document.createElement('li');li.textContent=text;field('history').prepend(li);
  if(field('history').children.length>24)field('history').lastChild.remove();
}
function pick(id,values,chosen){field(id).replaceChildren(...values.map(v=>new Option(v,v)));field(id).value=chosen}
function selection(){
  const a=field('origin').value,b=field('dest').value;if(!a||!b||a===b)return null;
  const edge=planRoute(a,b,field('mode').value);return {edge,total:edge.price+(game.active.has(b)?0:350)};
}
function quote(){
  const p=selection();network.preview(p?.edge);
  field('quote').textContent=p?Math.round(p.edge.km).toLocaleString('en-US')+' km · '+dollars(p.total)+' · '+Math.ceil(p.edge.duration)+'s':'Choose a destination';
}
function orderPlan(o){field('origin').value=o.at;field('dest').value=o.to;source=null;quote();network.focus(o.to)}
function refresh(reset=false){
  game.flow=game.ledger.filter(x=>x.time>game.time-10).reduce((s,x)=>s+x.amount,0);
  const sample=[game.time,game.flow];
  if(game.series.at(-1)?.[0]===game.time)game.series.pop();game.series.push(sample);
  hud(game,reset);network.draw(game,incident);analytics(game);
  field('clock').textContent='Q'+Math.min(4,1+Math.floor(game.time/60))+' · '+Math.floor((240-game.time)/60)+':'+String((240-game.time)%60).padStart(2,'0');
  const card=o=>button(o.from+' → '+o.to+' · '+(o.deadline-game.time)+'s',()=>orderPlan(o));
  field('tasks').replaceChildren(...game.orders.slice(0,2).map(card));
  field('orders').replaceChildren(...game.orders.map(o=>{const b=card(o),p=document.createElement('progress');p.max=44;p.value=o.deadline-game.time;b.append(p);return b}));
  field('routes').replaceChildren(...game.routes.map(e=>button(e.a+' → '+e.b+' · '+e.mode+' ×',()=>{
    if(!playing||paused)return;
    if(game.orders.some(o=>o.leg?.edge===e))return news('Corridor busy. Close after arrival.');
    game.routes=game.routes.filter(r=>r!==e);news('Corridor closed: '+e.a+' → '+e.b);refresh();
  })));
  field('requirements').textContent=tier(game)===4?'Global network established.':'Next tier at '+(1+tier(game)*3)+' active hubs · '+game.active.size+' open.';
  field('badge').textContent=game.orders.filter(o=>!o.leg).length||'';
  field('effects').textContent=game.effect?.end>game.time?game.effect.title+' · reduced capacity for '+(game.effect.end-game.time)+'s':'All crews available.';
  for(const e of game.events.splice(0)){network.money(e);news(e.label+' · '+e.city+' · '+dollars(e.amount))}
}
function begin(){
  game=newGame();playing=true;paused=false;speed=1;fraction=0;incident=null;source=null;field('brief').close();field('history').replaceChildren();
  pick('origin',['Istanbul'],'Istanbul');pick('upgradeCity',['Istanbul'],'Istanbul');pick('dest',Object.keys(hubs),'Suez');
  field('mode').value='Freight';field('notice').textContent='';speedUI();news('First dispatch: open Istanbul → Suez');quote();refresh(true);network.focus('Istanbul');
}
function build(){
  if(!playing||paused)return;
  const p=selection();if(!p)return;const {edge,total}=p;
  if(game.routes.some(r=>r.mode===edge.mode&&[r.a,r.b].includes(edge.a)&&[r.a,r.b].includes(edge.b)))return news('Corridor already open.');
  if(game.cash<total)return news('Insufficient funds for this corridor.');
  transact(game,-total,'Corridor investment',edge.b);game.active.add(edge.b);game.levels[edge.b]??=1;game.routes.push(edge);
  pick('origin',[...game.active],edge.a);pick('upgradeCity',[...game.active],edge.b);source=null;network.preview(null);refresh();
}
function buy(type){
  if(!playing||paused)return;
  const cost={Freight:500,Air:750,staff:250,upgrade:600}[type],city=field('upgradeCity').value;
  if(cost>game.cash)return news('Insufficient budget.');
  if(type==='staff'&&game.staff>=2+2*tier(game))return news('Staff capacity reached.');
  if(type==='upgrade'&&game.levels[city]>=3)return news('Hub already at maximum level.');
  if(type==='staff')game.staff++;else if(type==='upgrade')game.levels[city]++;else game.fleet[type]++;
  transact(game,-cost,{staff:'Crew hired',upgrade:'Hub upgraded',Air:'Plane acquired',Freight:'Freighter acquired'}[type],city);refresh();
}
function resolveIncident(protect){
  if(!incident)return;
  if(protect){if(game.cash<400)return;transact(game,-400,'Priority handling',incident.city);game.bonus+=50}
  else {game.effect={...incident,end:game.time+30};news(incident.title+' · delays accepted')}
  incident=null;field('brief').close();refresh();
}
function openEvent(event){
  if(event.tender){
    dialog('Regional trade tender',event.city+' offers a $450 handling contract. One idle crew is required.',[
      ['Accept tender',()=>{
        if(game.offer!==event){field('brief').close();return}
        if(capacity(game,'staff')<=game.orders.filter(o=>o.leg).length){field('story').textContent='All crews are busy.';return}
        game.offer=null;transact(game,450,'Trade tender awarded',event.city);field('brief').close();refresh();
      }],['Back to map',()=>field('brief').close()]]);
    return;
  }
  if(event.id){dialog('Priority contract',event.from+' → '+event.to+' · '+dollars(event.pay)+' · deadline '+event.deadline+'s',[['Plan route',()=>{field('brief').close();orderPlan(event)}],['Back to map',()=>field('brief').close()]]);return}
  dialog(event.title,event.city+' · '+event.mode+' traffic disrupted. Decide within '+event.remaining+'s.',[...(game.cash>=400?[['Protect shipments · $400',()=>resolveIncident(true)]]:[]),['Accept delays',()=>resolveIncident(false)],['Monitor on map',()=>field('brief').close()]]);
}
function finish(){
  playing=false;incident=null;
  let ranks=[points(game)];try{ranks.push(...JSON.parse(localStorage.getItem('geocargo-top')||'[]'));ranks.sort((a,b)=>b-a);ranks=ranks.slice(0,5);localStorage.setItem('geocargo-top',JSON.stringify(ranks))}catch{}
  dialog(game.lives&&game.cash>=0?'Campaign complete':'Operations suspended',game.delivered+' delivered · '+points(game)+' points. Top scores: '+ranks.join(' / '),[['Play again',begin]]);
}
function step(){
  const before=game.orders.length;
  tick(game);
  if(game.time===240||!game.lives||game.cash<0){refresh();finish();return}
  if([70,170].includes(game.time)){
    game.offer={city:[...game.active].at(-1),tender:true,end:game.time+20};
    news('Trade tender · select the gold pin at '+game.offer.city);
  }
  if(game.offer?.end<=game.time)game.offer=null;
  if(incident){if(--incident.remaining<=0)resolveIncident(false)}
  else if([38,98,158,206].includes(game.time)){
    const [title,city,mode]=crises[game.time===38?0:1+Math.floor(Math.random()*7)];
    incident={title,city,mode,remaining:15};news(title+' · select the red pin');network.focus(city);
  }else if(game.orders.length>before)news('New shipment · '+game.orders.at(-1).to);
  refresh();
}
function speedUI(){
  field('pause').classList.toggle('selected',paused);
  document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('selected',!paused&&Number(b.dataset.speed)===speed));
}
function setup(){
  network=mapView(city=>{
    if(!playing||paused)return;
    if(!source){if(!game.active.has(city))return news('Select an active origin first.');source=city;field('origin').value=city;news('Select a destination from '+city)}
    else if(source!==city){field('dest').value=city;source=null;quote();field('build').focus();news('Review the quote and open the corridor.')}
  },city=>{if(source&&source!==city){field('dest').value=city;quote()}},openEvent);
  game=newGame();refresh(true);dialog('Your first dispatch',field('story').textContent,[['Start in Istanbul',begin]]);
  field('build').onclick=build;field('pause').onclick=()=>{paused=!paused;speedUI()};
  document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{speed=Number(b.dataset.speed);paused=false;speedUI()});
  document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.buy));
  for(const name of ['company','ops'])field(name+'Tab').onclick=()=>{
    const hidden=field(name).hidden;field('company').hidden=true;field('ops').hidden=true;field(name).hidden=!hidden;analytics(game);
  };
  document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.parentElement.hidden=true);
  for(const id of ['origin','dest','mode'])field(id).onchange=quote;
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body){e.preventDefault();field('pause').click()}if(e.key==='Escape'){source=null;network.preview(null)}});
  let last=performance.now();
  function loop(now){
    if(playing&&!paused&&!document.hidden){fraction+=Math.min(.25,(now-last)/1000)*speed;while(fraction>=1&&playing){fraction--;step()}}
    last=now;requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
field('brief').oncancel=e=>e.preventDefault();
if(window.L&&window.turf)setup();else dialog('Connection required','Connect to the internet to load the mapping libraries.',[['Reload',()=>location.reload()]]);

