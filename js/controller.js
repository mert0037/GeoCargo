let game,network,playing=false,paused=false,speed=1,fraction=0,incident=null,source=null;
const hud=hudView(),analytics=analyticsView();
function news(text){
  text=language==='tr'?text.split(' · ').map(t).join(' · '):text;field('headline').textContent=text;const li=document.createElement('li');li.textContent=text;field('history').prepend(li);
  if(field('history').children.length>24)field('history').lastChild.remove();
}
function pick(id,values,chosen){field(id).replaceChildren(...values.map(v=>new Option(t(v),v)));field(id).value=chosen}
function selection(){
  const a=field('origin').value,b=field('dest').value;if(!a||!b||a===b)return null;
  const edge=planRoute(a,b,field('mode').value);return {edge,total:edge.price+(game.active.has(b)?0:openingFee(b))};
}
function quote(){
  const p=selection();network.preview(p?.edge);
  field('quote').textContent=p?Math.round(p.edge.km).toLocaleString('en-US')+' km · '+dollars(p.total)+' · '+Math.ceil(p.edge.duration)+'s · '+tr('Fuel','Yakıt')+' '+dollars(voyageCost(p.edge))+' · '+tr('After build','Kalan')+' '+dollars(game.cash-p.total)+(game.cash-p.total<900?' ⚠':'')+(megaMarkets.has(p.edge.b)&&!game.active.has(p.edge.b)?' · '+tr('Hub upkeep','Merkez gideri')+' $140/15s':''):t('Choose a destination');
}
function orderPlan(o){field('origin').value=o.at;field('dest').value=o.to;source=null;quote();network.focus(o.to)}
function refresh(reset=false){
  game.flow=game.ledger.filter(x=>x.time>game.time-15).reduce((s,x)=>s+x.amount,0);
  const recent=game.ledger.filter(x=>x.time>game.time-15);const sample=[game.time,recent.reduce((s,x)=>s+Math.max(0,x.amount),0),recent.reduce((s,x)=>s-Math.min(0,x.amount),0)];
  if(game.series.at(-1)?.[0]===game.time)game.series.pop();game.series.push(sample);
  hud(game,reset);network.draw(game,incident);analytics(game);
  field('clock').textContent=tr('Q','Ç')+Math.min(4,1+Math.floor(game.time/60))+' · '+Math.floor((game.time===240?0:60-game.time%60)/60)+':'+String((game.time===240?0:60-game.time%60)%60).padStart(2,'0');
  const card=o=>button((o.priority?tr('Express','Ekspres'):tr('Standard','Standart'))+' · '+t(o.from)+' → '+t(o.to)+' · '+(o.deadline-game.time)+'s',()=>orderPlan(o));
  field('tasks').replaceChildren(...[...game.orders].sort((a,b)=>a.deadline-b.deadline).slice(0,2).map(card));
  field('orders').replaceChildren(...game.orders.map(o=>{const b=card(o),p=document.createElement('progress');p.max=44;p.value=o.deadline-game.time;b.append(p);return b}));
  field('routes').replaceChildren(...game.routes.map(e=>button(t(e.a)+' → '+t(e.b)+' · '+t(e.mode)+' ×',()=>{
    if(!playing||paused)return;
    if(game.orders.some(o=>o.leg?.edge===e))return news('Corridor busy. Close after arrival.');
    game.routes=game.routes.filter(r=>r!==e);news('Corridor closed: '+e.a+' → '+e.b);refresh();
  })));
  const next=milestones[tier(game)],counts=[game.active.size,game.fleet.Air+game.fleet.Freight,game.staff];
  field('requirements').textContent=next?tr('Next tier · hubs / vehicles / staff','Sonraki seviye · merkez / araç / personel')+' · '+next.map((n,i)=>counts[i]+'/'+n).join(' · '):t('Global Giant');
  field('badge').textContent=game.orders.filter(o=>!o.leg).length||'';
  field('effects').textContent=[game.hold>game.time?tr('Vehicle detained','Araç alıkondu'):'',game.discount?tr('Upkeep −10%','Gider −%10'):'',game.loyal?tr('Loyal crew +20%','Sadık ekip +%20'):'',game.effect?.end>game.time?tr('Canal delays','Kanal gecikmesi'):''].filter(Boolean).join(' · ');
  field('ratio').textContent=tr('On time / missed','Zamanında / kaçırılan')+' · '+game.delivered+' / '+game.missed;
  document.querySelector('[data-buy="Air"]').disabled=game.time<60;
  field('mode').querySelector('[value="Air"]').disabled=game.time<60;
  for(const e of game.events.splice(0)){network.money(e);news(t(e.label)+' · '+t(e.city)+' · '+dollars(e.amount))}
}
function begin(){
  game=newGame();ending=null;field("finalChart").hidden=true;playing=true;paused=false;speed=1;fraction=0;incident=null;source=null;field('brief').close();field('history').replaceChildren();
  pick('origin',['Istanbul'],'Istanbul');pick('dest',Object.keys(hubs),'Suez');
  field('mode').value='Freight';field('notice').textContent='';speedUI();news(chapterNews(0));quote();refresh(true);network.focus('Istanbul');
}
function build(){
  if(!playing||paused)return;
  const p=selection();if(!p)return;const {edge,total}=p;
  if(game.routes.some(r=>r.mode===edge.mode&&[r.a,r.b].includes(edge.a)&&[r.a,r.b].includes(edge.b)))return news('Corridor already open.');
  if(edge.km>(edge.mode==='Air'?8500:5000))return news(tr('Out of range. Connect through a nearer hub.','Menzil aşıldı. Yakın bir aktarma merkezi seç.'));
  if(game.routes.length>=game.staff*2)return news(tr('Hire staff to open more corridors.','Yeni koridor için personel al.'));
  if(edge.mode==='Air'&&(game.time<60||!game.fleet.Air))return news(tr('Buy a plane in chapter 2.','İkinci bölümde uçak al.'));
  if(game.cash<total)return news('Insufficient funds for this corridor.');
  transact(game,-total,'Corridor investment',edge.b);game.active.add(edge.b);game.levels[edge.b]??=1;game.routes.push(edge);
  pick('origin',[...game.active],edge.a);source=null;network.preview(null);refresh();
}
function buy(type){
  if(!playing||paused)return;
  const cost={Freight:900,Air:1500,staff:650}[type],city='Istanbul';if(type==='Air'&&game.time<60)return;
  if(cost>game.cash)return news('Insufficient budget.');
  if(type==='staff')game.staff++;else game.fleet[type]++;if(game.demotion)game.demotion--;
  transact(game,-cost,{staff:'Crew hired',upgrade:'Hub upgraded',Air:'Plane acquired',Freight:'Freighter acquired'}[type],city);refresh();
}
let ending=null,deadline=0;
function chapterNews(q){return 'Maya · '+pair(chapters[q])+' · '+pair([
 ['Atlas collapsed. Connect Istanbul to Suez.','Atlas çöktü. İstanbul ile Süveyş’i bağla.'],
 ['Planes and express orders unlocked.','Uçaklar ve ekspres siparişler açıldı.'],
 ['Check your fleet before the canal crisis.','Kanal krizinden önce filonu kontrol et.'],
 ['Keep the global supply network moving.','Küresel tedarik ağını çalışır tut.']][q])}
function showDecision(){
 const s=stories[incident.key];dialog(pair(s[0]),pair(s[1]),[[pair(s[2]),()=>choose(true)],[pair(s[3]),()=>choose(false)]]);
 field('actions').firstChild.disabled=game.cash<({inspection:700,crew:500,suez:800,medical:0}[incident.key]);
}
function choose(first){
 if(!incident)return;const key=incident.key,cost={inspection:700,crew:500,suez:800,medical:0}[key];
 if(first&&game.cash<cost)return;
 game.story.set(key,first);if(first&&cost)transact(game,-cost,pair(stories[key][0]),incident.city);
 if(key==='crew'&&!first)game.overtime=game.time+20;
 if(key==='suez'){if(first)game.ethics++;else game.effect={city:'Suez',end:game.time+25,zone:turf.circle(hubs.Suez,300)}}
 if(key==='medical'){if(first)game.orders.push({id:100,from:'Istanbul',to:'Lagos',at:'Istanbul',progress:0,leg:null,deadline:game.time+40,pay:1200,medical:true});else{transact(game,400,tr('Private contract','Özel sözleşme'),'Istanbul');game.ethics--}}
 incident=null;field('brief').close();refresh();
}
function openEvent(event){
 if(event.key){showDecision();return}
 dialog(t('Priority contract'),t(event.from)+' → '+t(event.to)+' · '+dollars(event.pay),[[t('Plan route'),()=>{field('brief').close();orderPlan(event)}],[t('Back to map'),()=>field('brief').close()]]);
}
function debrief(){
 dialog(t(ending.title),tr('Delivered','Teslimat')+' '+game.delivered+' · '+t('Score')+' '+points(game)+' · '+tr('Top five','En iyi beş')+' '+ending.ranks.join(' / '),[[t('Play again'),begin]]);
 field('finalChart').hidden=false;if(window.Chart){Chart.getChart(field('finalChart'))?.destroy();new Chart(field('finalChart'),{type:'line',data:{labels:game.series.map(x=>x[0]),datasets:[{label:tr('Income','Gelir'),data:game.series.map(x=>x[1]),borderColor:'#77e0af'},{label:tr('Expense','Gider'),data:game.series.map(x=>x[2]),borderColor:'#fa9080'}]},options:{animation:false}})}
}
function finish(){playing=false;incident=null;ending={title:!game.lives||game.cash<=-500?'Collapsed Startup':game.ethics>0?'Global Lifeline':'Ruthless Tycoon',ranks:game.scores.save(points(game))};debrief()}
function step(){
 tick(game);const time=game.time;
 if(time===240||!game.lives||game.cash<=-500){refresh();finish();return}
 if(time%60===0)news(chapterNews(time/60));
 if(time===120){
   if(game.story.get('inspection')){game.discount=.9;transact(game,600,tr('Clean audit','Temiz denetim'),'Istanbul')}
   else if(Math.random()<.7){game.heldMode='Freight';game.hold=time+20;game.demotion=1;transact(game,-1400,tr('Inspection fine','Denetim cezası'),'Istanbul')}
 }
 if(game.cash<=-500){refresh();finish();return}
 if(time===180){if(game.story.get('crew'))game.loyal=true;else game.staff=Math.max(0,game.staff-1)}
 const key={68:'inspection',95:'crew',138:'suez',188:'medical'}[time];
 if(key){incident={key,city:key==='suez'?'Suez':key==='medical'?'Lagos':'Istanbul',title:pair(stories[key][0])};deadline=performance.now()+15000;network.focus(incident.city);showDecision()}
 refresh();
}
function speedUI(){
  field('pause').classList.toggle('selected',paused);
  document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('selected',!paused&&Number(b.dataset.speed)===speed));
}
function setup(){
  network=mapView(city=>{
    if(!playing||paused)return;
    if(!source){if(!game.active.has(city))return news('Select an active origin first.');source=city;field('origin').value=city;news(t('Select a destination from')+' '+t(city))}
    else if(source!==city){field('dest').value=city;source=null;quote();field('build').focus();news('Review the quote and open the corridor.')}
  },city=>{if(source&&source!==city){field('dest').value=city;quote()}},openEvent);
  game=newGame();refresh(true);intro();
  field('build').onclick=build;field('pause').onclick=()=>{paused=!paused;speedUI()};
  document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{speed=Number(b.dataset.speed);paused=false;speedUI()});
  document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.buy));
  for(const name of ['company','ops'])field(name+'Tab').onclick=()=>{
    const hidden=field(name).hidden;field('company').hidden=true;field('ops').hidden=true;field(name).hidden=!hidden;analytics(game);
  };
  document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.parentElement.hidden=true);
  for(const id of ['origin','dest','mode'])field(id).onchange=quote;
  document.addEventListener('keydown',e=>{if(incident&&['1','2'].includes(e.key)){choose(e.key==='1');return}if(e.code==='Space'&&e.target===document.body){e.preventDefault();field('pause').click()}if(e.key==='Escape'){source=null;network.preview(null)}});
  let last=performance.now();
  function loop(now){
    if(incident){const left=Math.ceil((deadline-now)/1000);field('title').textContent=pair(stories[incident.key][0])+' · '+Math.max(0,left)+'s';if(left<=0)choose(false)}
    if(playing&&!incident&&!paused&&!document.hidden){fraction+=Math.min(.25,(now-last)/1000)*speed;while(fraction>=1&&playing&&!incident){fraction--;step()}}
    last=now;requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
function intro(){dialog(tr('The Atlas Collapse','Atlas’ın Çöküşü'),chapterNews(0),[[t('Start in Istanbul'),begin]])}
function switchLanguage(){
 language=language==='tr'?'en':'tr';try{localStorage.setItem('geo-language',language)}catch{}
 localizeStatic();if(!game)return;
 refresh(true);if(incident)showDecision();else if(ending)debrief();else if(!playing)intro();else{if(field('brief').open)field('brief').close();quote()}
 news(chapterNews(Math.min(3,Math.floor(game.time/60))));
}
field('language').onclick=field('dialogLang').onclick=switchLanguage;
localizeStatic();
field('brief').oncancel=e=>e.preventDefault();
if(window.L&&window.turf)setup();else dialog('Connection required','Connect to the internet to load the mapping libraries.',[['Reload',()=>location.reload()]]);

