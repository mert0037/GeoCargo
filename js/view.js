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
  const map=L.map('map',{minZoom:2,maxZoom:7,maxBounds:[[-82,-190],[84,190]],maxBoundsViscosity:1}).setView([36,31],4);
  L.geoJSON(countries,{
    interactive:false,attribution:'Natural Earth',
    style:{color:'#52757b',weight:1,fillColor:'#214650',fillOpacity:1}
  }).addTo(map);
  const cargo=L.layerGroup().addTo(map);
  let frame=0;
  function animate(game){
    cancelAnimationFrame(frame);
    cargo.clearLayers();
    const tracks=game.orders.filter(o=>o.leg).map(order=>{
      const edge=order.leg.edge;
      const via=edge.a===order.at?edge.via:[...edge.via].reverse();
      const line=turf.lineString(via.map(city=>hubs[city]));
      const marker=L.circleMarker([...hubs[order.at]].reverse(),{radius:5,color:'#fff',fillColor:'#fbac58',fillOpacity:1,weight:2,className:'vehicle'}).addTo(cargo);
      return {order,edge,line,marker};
    });
    let elapsed=0,last=performance.now();
    function move(now){
      if(!paused && playing)elapsed=Math.min(1,elapsed+(now-last)/1000);
      last=now;
      for(const {order,edge,line,marker} of tracks){
        const duration=edge.duration*slowdown(game,edge);
        const progress=Math.min(1,Math.max(0,order.progress-(1-elapsed)/duration));
        const position=turf.along(line,progress*edge.km).geometry.coordinates;
        marker.setLatLng([position[1],position[0]]).bringToFront();
      }
      if(tracks.length && elapsed<1)frame=requestAnimationFrame(move);
    }
    move(last);
  }
  const layer=L.layerGroup().addTo(map);
  return {focus:city=>map.flyTo([...hubs[city]].reverse(),4),draw(game){
    layer.clearLayers();
    for(const edge of game.routes){
      edge.via.slice(1).forEach((city,i)=>L.geoJSON(turf.greatCircle(hubs[edge.via[i]],hubs[city]),{style:{color:edge.mode==='Air'?'#6ddfed':'#ffc561',weight:3}}).addTo(layer));
    }
    for(const [city,coords] of Object.entries(hubs)){
      L.circleMarker([...coords].reverse(),{radius:game.active.has(city)?8:5,color:game.active.has(city)?'#80f6cf':'#a6bdca',fillOpacity:.85}).bindTooltip(city,{permanent:game.active.has(city),direction:'top',offset:[0,-6]}).on('click',()=>select(city)).addTo(layer);
    }
    animate(game);
    if(game.effect?.end>game.time)L.circle([...hubs[game.effect.city]].reverse(),{radius:350000,color:'#ff7760'}).addTo(layer);
  }};
}
function dashboard(game){
  const metrics=[['Budget',dollars(game.cash)],['Lives',game.lives+'/5'],['Score',points(game)],['Q'+Math.min(4,1+Math.floor(game.time/60)),(240-game.time)+'s']];
  field('metrics').replaceChildren(...metrics.map(([label,value])=>{
    const tile=document.createElement('div'),caption=document.createElement('small'),number=document.createElement('strong');
    caption.textContent=label;number.textContent=value;tile.append(caption,number);return tile;
  }));
  const queue=field('orders');
  for(const card of [...queue.children])if(!game.orders.some(o=>String(o.id)===card.dataset.order))card.remove();
  for(const order of game.orders){
    let card=queue.querySelector('[data-order="'+order.id+'"]');
    if(!card){
      card=document.createElement('button');card.className='shipment';card.dataset.order=order.id;
      const heading=document.createElement('strong'),detail=document.createElement('span'),bar=document.createElement('progress');
      heading.textContent=order.from+' → '+order.to;bar.max=order.deadline-game.time+1;
      card.append(heading,detail,bar);queue.append(card);
      card.onclick=()=>{field('origin').value=order.from;field('dest').value=order.to;quote();network.focus(order.to);field('build').focus()};
    }
    card.children[1].textContent=(order.leg?'In transit':'Plan route')+' · '+dollars(order.pay)+' · '+(order.deadline-game.time)+'s';
    card.children[2].value=order.deadline-game.time;
  }
}
