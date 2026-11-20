const field=id=>document.getElementById(id);
const dollars=n=>'$'+Math.round(n).toLocaleString('en-US');
const nations=['Turkey','Egypt','Netherlands','United Kingdom','Germany','Portugal','United Arab Emirates','India','Nigeria','South Africa','Malaysia','China','Japan','Australia','United States of America','United States of America','Panama','Brazil','Mexico','Russia'];
// Singapore is below Natural Earth's 1:110m resolution. Render a local hub footprint.
const countryOf=Object.fromEntries(Object.keys(hubs).map((city,i)=>[city,city==='Singapore'?'Singapore':nations[i]]));
const inland=new Set(['Frankfurt','Moscow','Mexico City','São Paulo']);
function glyph(kind){
  const paths={Air:'M12 1l2 8 8 6v2l-9-3v6l3 2v1l-4-1-4 1v-1l3-2v-6l-9 3v-2l8-6z',Freight:'M12 1l6 8v10l-6 4-6-4V9zm-3 9v7h6v-7z',port:'M11 8a4 4 0 1 1 2 0v4h5v2h-5v5q5-1 7-6l-2 1 4-6 1 7-2-1q-2 7-9 9-7-2-9-9l-2 1 1-7 4 6-2-1q2 5 7 6v-5H6v-2h5zm1-5a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 12 3z'};
  return '<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="'+paths[kind]+'"/></svg>';
}
function dialog(title,text,buttons){
  field('title').textContent=title;field('story').textContent=text;
  field('actions').replaceChildren(...buttons.map(([label,click])=>button(label,click)));
  if(!field('brief').open)field('brief').showModal();
}
function button(text,click){const b=document.createElement('button');b.textContent=text;b.onclick=click;return b}
function mapView(select,hover,openEvent){
  const map=L.map('map',{minZoom:1,maxZoom:7,zoomControl:false,maxBounds:[[-85,-180],[85,180]],maxBoundsViscosity:1}).setView([34,29],3);

  L.control.zoom({position:'bottomleft'}).addTo(map);
  // A solid vector underlay remains visible through any missing imagery tiles.
  map.createPane('landBase').style.zIndex=190;
  L.geoJSON(countries,{attribution:'Natural Earth',pane:'landBase',interactive:false,style:{stroke:false,fillColor:'#314c51',fillOpacity:1}}).addTo(map);
  const imagery=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{bounds:[[-85.0511,-180],[85.0511,180]],noWrap:true,attribution:'Imagery © Esri and contributors · Boundaries: Natural Earth'});
  function updateImagery(){if(map.getZoom()<=2)imagery.remove();else if(!map.hasLayer(imagery))imagery.addTo(map)}
  updateImagery();map.on('zoomend',updateImagery);
  const renderer=L.svg(),regions=new Map(),nodes=new Map();
  const borders=L.geoJSON(countries,{renderer,interactive:false,style:{color:'#ddd',weight:.6,opacity:.32,fillOpacity:0},onEachFeature:(f,l)=>regions.set(f.properties.name,l)}).addTo(map);
  regions.set('Singapore',L.circle([...hubs.Singapore].reverse(),{radius:14000,renderer,interactive:false,fillOpacity:0,opacity:0}).addTo(borders));
  const icon=(html,size,anchor)=>L.divIcon({className:'',html,iconSize:[size,size],iconAnchor:anchor||[size/2,size/2]});
  const pos=city=>[...hubs[city]].reverse();
  const routes=L.layerGroup().addTo(map),preview=L.layerGroup().addTo(map),pins=L.layerGroup().addTo(map),vehicles=L.layerGroup().addTo(map);
  function line(edge,group,ghost=false){
    edge.via.slice(1).forEach((city,i)=>L.geoJSON(turf.greatCircle(hubs[edge.via[i]],hubs[city]),{interactive:false,style:{className:'corridor',color:ghost?'#fff':edge.mode==='Air'?'#67edff':'#ffac55',weight:ghost?1.5:2.4,dashArray:ghost?'4 5':edge.mode==='Air'?'7 5':null}}).addTo(group));
  }
  for(const city of Object.keys(hubs)){
    const marker=L.marker(pos(city),{icon:icon('<span class="hub">'+glyph(inland.has(city)?'Air':'port')+'</span>',23),title:city}).addTo(map).bindTooltip(city);
    marker.on('click',()=>select(city)).on('mouseover',()=>hover(city));nodes.set(city,marker);
  }
  let frame=0;
  return {focus:city=>map.flyTo(pos(city),4),preview:edge=>{preview.clearLayers();if(edge)line(edge,preview,true)},money(event){
    const marker=L.marker(pos(event.city),{interactive:false,icon:icon('<b class="cashfx '+(event.amount<0?'loss':'')+'">'+(event.amount>0?'+':'')+dollars(event.amount)+'</b>',25),zIndexOffset:1200}).addTo(map);
    setTimeout(()=>marker.remove(),1200);
  },draw(g,crisis){
    const states=new Map();
    for(const city of Object.keys(hubs)){
      const active=g.active.has(city),queue=g.orders.filter(o=>o.at===city&&!o.leg).length;
      const alert=crisis?.city===city||(g.effect?.end>g.time&&g.effect.city===city);
      const state=alert?4:active&&queue>=2?3:active&&tier(g)>=3?2:active?1:0;
      states.set(countryOf[city],Math.max(state,states.get(countryOf[city])||0));
      nodes.get(city).setTooltipContent(t(city)+' · '+hubInfo[city].countryCode+' · '+(active?tr('Active','Etkin'):dollars(openingFee(city))));
      nodes.get(city).getElement()?.firstChild.classList.toggle('on',active);
    }
    for(const [name,region] of regions){
      const state=states.get(name)||0;
      if(region.state===state)continue;
      region.state=state;region.setStyle({color:['#ddd','#68fbd3','#ffda78','#f59e0b','#ff5656'][state],weight:state?2.2:.6,opacity:state?1:.32,fillColor:['transparent','#10b981','#e6bd54','#f59e0b','#ef4444'][state],fillOpacity:state?.42:0});
      const path=region.getElement?.();if(path){path.classList.toggle('region',state>0);path.classList.toggle('pulse',state===2);path.classList.toggle('alert',state===4)}
    }
    routes.clearLayers();g.routes.forEach(edge=>line(edge,routes));
    pins.clearLayers();
    function pin(city,text,alert,action){L.marker(pos(city),{title:text,zIndexOffset:800,icon:icon('<b class="pin '+(alert?'alert':'')+'">'+(alert?'!':'★')+'</b>',24,[0,38])}).bindTooltip(t(text)).on('click',action).addTo(pins)}
    if(g.offer)pin(g.offer.city,'Trade tender',false,()=>openEvent(g.offer));
    if(crisis)pin(crisis.city,crisis.title,true,()=>openEvent(crisis));
    g.orders.filter(o=>o.priority).forEach(o=>pin(o.to,'Priority contract',false,()=>openEvent(o)));
    cancelAnimationFrame(frame);vehicles.clearLayers();
    const tracks=g.orders.filter(o=>o.leg).map(o=>{
      const edge=o.leg.edge,via=edge.a===o.at?edge.via:[...edge.via].reverse();
      const line=turf.lineString(via.map(city=>hubs[city]));
      const marker=L.marker(pos(o.at),{interactive:false,zIndexOffset:900,icon:icon('<span class="craft">'+glyph(edge.mode)+'</span>',24)}).addTo(vehicles);
      return {o,edge,line,marker};
    });
    function move(){
      for(const {o,edge,line,marker} of tracks){
        const d=edge.km*Math.min(.99999,Math.max(0,o.progress-(1-fraction)/(edge.duration*slowdown(g,edge))));
        const here=turf.along(line,d),ahead=turf.along(line,Math.min(edge.km,d+1));
        marker.setLatLng([...here.geometry.coordinates].reverse());marker.getElement().firstChild.style.transform='rotate('+turf.bearing(here,ahead)+'deg)';
      }
      if(tracks.length&&playing)frame=requestAnimationFrame(move);
    }
    move();
  }};
}
function hudView(){
  const cells=new Map();
  for(const key of ['Company','Budget','Flow / 15s','Fleet','Staff','Score']){
    const box=document.createElement('div'),label=document.createElement('small'),value=document.createElement('strong');
    label.textContent=key;box.append(label,value);field('metrics').append(box);cells.set(key,{box,value});
  }
  return (g,reset=false)=>{
    function metric(key,num,format,deltaLabel){
      const cell=cells.get(key);cell.box.firstChild.textContent=t(key);if(!reset&&num===cell.target)return;
      const prev=cell.target;cell.target=num;cancelAnimationFrame(cell.frame);
      const start=performance.now(),base=reset?num:(cell.current??num);
      function tween(now){const f=Math.min(1,(now-start)/260);cell.current=base+(num-base)*f;cell.value.textContent=format(Math.round(cell.current));if(f<1)cell.frame=requestAnimationFrame(tween)}
      tween(start);
      if(!reset&&prev!=null&&prev!==num){
        const tag=document.createElement('b');tag.className='delta '+(num<prev?'loss':'');tag.textContent=(num>prev?'+':'')+(num-prev)+(deltaLabel||'');cell.box.append(tag);setTimeout(()=>tag.remove(),1200);
        cell.box.animate([{boxShadow:'0 0 9px '+(num<prev?'#e25c53':'#61e29f')},{boxShadow:'none'}],600);
      }
    }
    metric('Company',tier(g),n=>'◈ Lv.'+n+' '+t(['','Local Carrier','Regional Network','Continental Fleet','Global Giant'][n]));
    metric('Budget',g.cash,dollars);metric('Score',points(g),String);
    metric('Flow / 15s',g.flow,n=>(n<0?'▼ −':'▲ +')+dollars(Math.abs(n)));cells.get('Flow / 15s').value.style.color=g.flow<0?'#ff998a':'#94ffbe';
    const busy=mode=>g.orders.filter(o=>o.leg?.edge.mode===mode).length;
    metric('Fleet',capacity(g,'Air')+capacity(g,'Freight'),()=> '⚓ '+busy('Freight')+'/'+capacity(g,'Freight')+'  ✈ '+busy('Air')+'/'+capacity(g,'Air'),' vehicle');
    cells.get('Fleet').value.textContent='⚓ '+busy('Freight')+'/'+capacity(g,'Freight')+'  ✈ '+busy('Air')+'/'+capacity(g,'Air');
    metric('Staff',capacity(g,'staff'),n=>n+' · '+g.routes.length+'/'+(n*2),tr(' crew',' kişi'));
    cells.get('Staff').value.textContent=g.staff+' · '+g.routes.length+'/'+(2*g.staff);
    const share=Math.round(g.active.size/Object.keys(hubs).length*100);
    field('market').value=share;field('share').textContent=share+'%';field('risk').value=Math.min(100,(5-g.lives)*16+(incident||g.effect?.end>g.time?20:0));
    field('lives').textContent='♥'.repeat(g.lives);
  };
}
function analyticsView(){
  let chart;
  return g=>{
    if(field('ops').hidden)return;
    if(!window.Chart){field('chart').replaceWith(Object.assign(document.createElement('p'),{id:'chart',textContent:'Net flow: '+dollars(g.flow)+' / 10s'}));return}
    chart??=new Chart(field('chart'),{type:'line',data:{labels:[],datasets:[{label:'Income',data:[],borderColor:'#76e9c6',pointRadius:0},{label:'Expense',data:[],borderColor:'#fb9286',pointRadius:0}]},options:{animation:false,plugins:{legend:{display:true}}}});
    chart.data.labels=g.series.map(x=>x[0]);chart.data.datasets[0].data=g.series.map(x=>x[1]);chart.data.datasets[1].data=g.series.map(x=>x[2]);chart.data.datasets[0].label=tr('Income','Gelir');chart.data.datasets[1].label=tr('Expense','Gider');chart.update('none');
  };
}

