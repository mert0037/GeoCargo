// Each campaign owns its network, clock and shipments.
const releaseTimes = [0, 20, 40, 60, 75, 90, 105, 120, 132, 144, 156, 168, 180, 188, 196, 204, 212, 220];
const kmBetween = (a, b) => turf.distance(hubs[a], hubs[b]);
function planRoute(a, b, mode) {
  const europe = ['Istanbul','Rotterdam','London','Frankfurt','Lisbon'];
  const asia = ['Dubai','Mumbai','Singapore','Shanghai','Tokyo'];
  const cross = (x,y) => europe.includes(x) && asia.includes(y);
  const via = mode === 'Freight' && (cross(a,b) || cross(b,a)) ? [a,'Suez',b] : [a,b];
  const km = via.slice(1).reduce((total,city,i) => total + kmBetween(via[i],city),0);
  return {a,b,mode,via,km,price:Math.round(125+km*(mode==='Air'?0.12:0.045)),duration:3+km/(mode==='Air'?1400:650)};
}
// Closure supplies a fresh shipment sequence on each restart.
function orderFactory() {
  let count=0;
  return game => {
    const phase=Math.floor(game.time/60);
    const from=[...game.active][count % game.active.size];
    const nearby=Object.keys(hubs).filter(city=>city!==from).sort((a,b)=>kmBetween(from,a)-kmBetween(from,b));
    const to=count===0?'Suez':nearby[(count*3)%(3+phase*4)];
    return {id:++count,from,to,at:from,progress:0,leg:null,deadline:Math.min(240,game.time+44-phase*2),pay:Math.round(1050+kmBetween(from,to)*0.19)};
  };
}
function newGame() {
  const game={active:new Set(['Istanbul']),routes:[],orders:[],time:0,cash:3000,lives:5,delivered:0,bonus:0,effect:null,generate:orderFactory()};
  game.orders.push(game.generate(game));
  return game;
}
function slowdown(game,edge) {
  const effect=game.effect;
  return effect && effect.end>game.time && effect.mode===edge.mode && edge.via.includes(effect.city)?2:1;
}
// Dijkstra finds the first leg of the quickest open path.
function nextLeg(game,from,to) {
  const pending=new Set(game.active),cost=new Map([[from,0]]),first=new Map();
  while(pending.size) {
    const at=[...pending].sort((a,b)=>(cost.get(a)??Infinity)-(cost.get(b)??Infinity))[0];
    if(!cost.has(at))break;
    if(at===to)return first.get(at);
    pending.delete(at);
    for(const edge of game.routes) {
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
  if(releaseTimes.includes(game.time))game.orders.push(game.generate(game));
  game.orders=game.orders.filter(order=>{
    order.leg??=nextLeg(game,order.at,order.to);
    if(order.leg){
      order.progress+=1/(order.leg.edge.duration*slowdown(game,order.leg.edge));
      if(order.progress>=1){order.at=order.leg.target;order.leg=null;order.progress=0}
    }
    if(order.at===order.to){
      game.cash+=order.pay;game.delivered++;game.bonus+=order.deadline-game.time;
      return false;
    }
    if(game.time>=order.deadline){game.lives=Math.max(0,game.lives-1);return false}
    return true;
  });
}
const points=g=>g.delivered*100+g.active.size*250+g.bonus+Math.floor(g.cash/10);
