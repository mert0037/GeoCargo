// Each campaign owns its network, clock and shipments.
const releaseTimes = [0, 20, 40, 60, 75, 90, 105, 120, 132, 144, 156, 168, 180, 188, 196, 204, 212, 220];
const kmBetween = (a, b) => turf.distance(hubs[a], hubs[b]);
const megaMarkets=new Set(['New York','Shanghai','Rotterdam']);
const gateways=new Set(['Dubai','Rotterdam']);
function openingFee(city){return megaMarkets.has(city)?1550:gateways.has(city)?450:250}
function routeTrade(edge){
  if(edge.mode==='Air')return 45;
  return edge.km<=3000?208:120;
}
function voyageCost(edge){return Math.round(edge.mode==='Air'?230+edge.km*.035:24+edge.km*.008)}
function planRoute(a, b, mode) {
  const europe = ['Istanbul','Rotterdam','London','Frankfurt','Lisbon'];
  const asia = ['Dubai','Mumbai','Singapore','Shanghai','Tokyo'];
  const cross = (x,y) => europe.includes(x) && asia.includes(y);
  const via = mode === 'Freight' && (cross(a,b) || cross(b,a)) ? [a,'Suez',b] : [a,b];
  const km = via.slice(1).reduce((total,city,i) => total + kmBetween(via[i],city),0);
  const longHaulPremium=Math.max(0,km-3000)**2*.00006;
  const baseCost=125+km*(mode==='Air'?.12:.045)+longHaulPremium;
  const gatewayDiscount=gateways.has(a)||gateways.has(b)?0.65:1;
  return {a,b,mode,via,km,price:Math.round(baseCost*gatewayDiscount),duration:3+km/(mode==='Air'?1400:650)};
}
// Closure supplies a fresh shipment sequence on each restart.
function createOrderGenerator() {
  let count=0;
  return game => {
    const phase=Math.floor(game.time/60);
    let from='Istanbul',to=count===1?'Frankfurt':'Suez',priority=false;
    if(count>=2){
      const active=[...game.active];
      from=active[(count-2)%active.length];
      const connected=active.filter(city=>city!==from && nextLeg(game,from,city));
      const nearby=Object.keys(hubs).filter(city=>!game.active.has(city) && planRoute(from,city,'Freight').km<=5000)
        .sort((a,b)=>kmBetween(from,a)-kmBetween(from,b));
      const expansion=phase>0 && count%5===4 && nearby.length;
      if(expansion || !connected.length)to=nearby[0]||'Suez';
      else to=connected[count%connected.length];
      priority=phase>0 && count%3===0 && game.fleet.Air>0 && Boolean(nextLeg(game,from,to,true));
    }
    const km=kmBetween(from,to);
    return {id:++count,priority,from,to,at:from,progress:0,leg:null,hops:0,deadline:Math.min(240,game.time+(priority?32:48)),pay:Math.round((240+km*.12)*(priority?2.6:1))};
  };
}
function newGame() {
  const game={active:new Set(['Istanbul']),routes:[],orders:[],time:0,cash:3000,lives:5,delivered:0,bonus:0,effect:null,generate:createOrderGenerator()};
  game.orders.push(game.generate(game));
  Object.assign(game,{fleet:{Air:0,Freight:1},staff:1,missed:0,ethics:0,story:createStoryMemory(),scores:createScoreManager(),hold:0,demotion:0,levels:{Istanbul:1},ledger:[],events:[],series:[],flow:0});
  return game;
}
function canalAffected(game,edge){
  if(!game.effect || game.effect.end<=game.time || edge.mode!=='Freight')return false;
  return edge.via.slice(1).some((city,i)=>turf.booleanIntersects(turf.greatCircle(hubs[edge.via[i]],hubs[city]),game.effect.zone));
}
function slowdown(game,edge) {
  const slow=canalAffected(game,edge);
  const crewBoost=(game.overtime>game.time?1.25:1)*(game.loyal?1.2:1)*(1+.05*game.staff);
  return (slow?1/.4:1)/crewBoost;
}
// Dijkstra finds the first leg of the quickest open path.
function nextLeg(game,from,to,airOnly=false) {
  const pending=new Set(game.active),cost=new Map([[from,0]]),first=new Map();
  while(pending.size) {
    const at=[...pending].sort((a,b)=>(cost.get(a)??Infinity)-(cost.get(b)??Infinity))[0];
    if(!cost.has(at))break;
    if(at===to)return first.get(at);
    pending.delete(at);
    for(const edge of game.routes) {
      if(airOnly && edge.mode!=='Air')continue;
      if(edge.a!==at && edge.b!==at)continue;
      const target=edge.a===at?edge.b:edge.a;
      const candidate=cost.get(at)+edge.duration*slowdown(game,edge);
      if(candidate<(cost.get(target)??Infinity)){
        cost.set(target,candidate);
        first.set(target,first.get(at)??{edge,target});
      }
    }
  }
  return null;
}
function tick(game) {
  game.time++;
  if(game.time%15===0){
    const revenue=game.routes.reduce((sum,edge)=>sum+(canalAffected(game,edge)?0:routeTrade(edge)),0);
    const expense=Math.round((game.staff*95+game.fleet.Air*160+game.fleet.Freight*70+[...game.active].filter(city=>megaMarkets.has(city)).length*140)*(game.discount||1));
    transact(game,revenue,'Trade');transact(game,-expense,'Upkeep');
  }
  if(releaseTimes.includes(game.time))game.orders.push(game.generate(game));
  game.orders=game.orders.filter(order=>{
    if(!order.leg){
      const leg=nextLeg(game,order.at,order.to,order.priority);
      const busy=game.orders.filter(o=>o.leg);
      if(leg && busy.filter(o=>o.leg.edge.mode===leg.edge.mode).length<capacity(game,leg.edge.mode)){
        order.leg=leg;order.hops=(order.hops||0)+1;transact(game,-voyageCost(leg.edge),'Fuel');
      }
    }
    if(order.leg){
      order.progress+=1/(order.leg.edge.duration*slowdown(game,order.leg.edge));
      if(order.progress>=1){order.at=order.leg.target;order.leg=null;order.progress=0}
    }
    if(order.at===order.to){
      transact(game,order.medical?1200:Math.round(order.pay*[0,1,1.2,1.45,1.75][tier(game)]*(1+.12*Math.min(2,order.hops-1))),'Shipment delivered',order.to);game.scores.deliver();if(order.medical){game.lives=Math.min(5,game.lives+1);game.ethics++}game.delivered++;game.bonus+=order.deadline-game.time;
      return false;
    }
    if(game.time>=order.deadline){game.missed++;game.scores.miss();game.lives=Math.max(0,game.lives-1);return false}
    return true;
  });
}
const points=g=>g.delivered*100+g.scores.bonus()+g.active.size*250+g.bonus+Math.floor(g.cash/10);

function capacity(g,type){
  return type==='staff'?g.staff:Math.max(0,g.fleet[type]-(g.hold>g.time&&type===g.heldMode?1:0));
}
function transact(g,amount,label,city){
  g.cash+=amount;g.ledger.push({time:g.time,amount});
  if(city)g.events.push({amount,label,city});
}

const milestones=[[1,1,1],[3,2,2],[6,4,3],[9,6,5]];
function tier(g){const vehicles=g.fleet.Air+g.fleet.Freight;return Math.max(1,milestones.filter(([h,v,s])=>g.active.size>=h&&vehicles>=v&&g.staff>=s).length-g.demotion)}
// A campaign owns its choices; later chapters read only recorded decisions.
function createStoryMemory(){const flags=new Map();return {set:(key,value)=>flags.set(key,value),get:key=>flags.get(key)}}
// Each campaign owns its delivery streak and its high-score write.
function createScoreManager(){let streak=0,bonus=0;return {deliver(){bonus+=5*streak++},miss(){streak=0},bonus:()=>bonus,save(score){let ranks=[score];try{ranks.push(...JSON.parse(localStorage.getItem('geocargo-top')||'[]'));ranks.sort((a,b)=>b-a);ranks=ranks.slice(0,5);localStorage.setItem('geocargo-top',JSON.stringify(ranks))}catch{}return ranks}}}
