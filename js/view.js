const field=id=>document.getElementById(id);
const dollars=n=>'$'+n.toLocaleString('en-US');
function dialog(title,text,buttons){
  field('title').textContent=title;field('story').textContent=text;
  field('actions').replaceChildren(...buttons.map(([label,action])=>{
    const button=document.createElement('button');button.textContent=label;button.onclick=action;return button;
  }));
  if(!field('brief').open)field('brief').showModal();
}
function mapView(select){
  const map=L.map('map',{minZoom:2}).setView([36,31],4);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors · © CARTO'}).addTo(map);
  const layer=L.layerGroup().addTo(map);
  return {focus:city=>map.flyTo([...hubs[city]].reverse(),4),draw(game){
    layer.clearLayers();
    for(const edge of game.routes){
      edge.via.slice(1).forEach((city,i)=>L.geoJSON(turf.greatCircle(hubs[edge.via[i]],hubs[city]),{style:{color:edge.mode==='Air'?'#6ddfed':'#ffc561',weight:3}}).addTo(layer));
    }
    for(const [city,coords] of Object.entries(hubs)){
      L.circleMarker([...coords].reverse(),{radius:game.active.has(city)?8:5,color:game.active.has(city)?'#80f6cf':'#a6bdca',fillOpacity:.85}).bindTooltip(city).on('click',()=>select(city)).addTo(layer);
    }
    for(const order of game.orders.filter(o=>o.leg)){
      const edge=order.leg.edge;
      const via=edge.a===order.at?edge.via:[...edge.via].reverse();
      const point=turf.along(turf.lineString(via.map(city=>hubs[city])),order.progress*edge.km);
      L.circleMarker([...point.geometry.coordinates].reverse(),{color:'#fff',radius:4}).bindTooltip('Shipment '+order.id).addTo(layer);
    }
    if(game.effect?.end>game.time)L.circle([...hubs[game.effect.city]].reverse(),{radius:350000,color:'#ff7760'}).addTo(layer);
  }};
}
function dashboard(game){
  field('metrics').textContent=[dollars(game.cash),game.lives+' lives',points(game)+' pts','Q'+Math.min(4,1+Math.floor(game.time/60)),(240-game.time)+'s left'].join('  ·  ');
  field('orders').replaceChildren(...game.orders.map(order=>{
    const card=document.createElement('p');
    card.textContent=order.from+' → '+order.to+' · '+dollars(order.pay)+' · '+(order.deadline-game.time)+'s · '+(order.leg?'In transit':'Awaiting connection');
    return card;
  }));
  if(!game.orders.length)field('orders').textContent='All shipments cleared.';
}
