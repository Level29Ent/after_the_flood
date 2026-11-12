import * as T from 'three';
import {resources,recipes,boats,craftFlood,buildBoat,actionFlood,loot,recruit,tickFlood,weight,logEvent} from './flood-systems.js';
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={camp:'High-ground relief camp',dock:'Mooring pier / wandering trader',roof:'Hotel / office tower stairwell',tunnel:'Storm drain / flooded transit',store:'Flooded storefront',attic:'Sealed attic · toxic mold',crate:'Drifting supply crate',car:'Abandoned car · crowbar salvage',wreck:'Debris fortifications · axe salvage',debris:'Drifting wreckage · hook / net salvage',survivor:'Rooftop distress signal',looter:'Looters guarding a supply cache',zoo:'Flooded zoo / aquarium perimeter',chemical:'Industrial chemical runoff',wire:'Downed live power line',brush:'Cottonmouths / mosquito swarm',drop:'Relay supply drop'};
export function createExpedition({scene,getState,getDistrict,getActor,getStamina,setStamina,hurt,move,openModal,closeModal,toast,save,isActive,canUse}) {
  let root=null,water=null,boatMesh=null,rain=null,points=[],layer='street',point=null,lastEvent=-10,hitCooldown=0,feedbackUntil=0,collisionAt=-10,floor=1,roofOrigin=null,traderMesh=null;
  const owned=new Set(),geometries=new Set();
  const s=()=>getState().flood;
  function material(color,extra={}){const m=new T.MeshStandardMaterial({color,roughness:.75,...extra});owned.add(m);return m;}
  function box(parent,x,y,z,w,h,d,mat){const geo=new T.BoxGeometry(w,h,d);geometries.add(geo);const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function dispose(){if(root)scene.remove(root);for(const g of geometries)g.dispose();for(const m of owned)m.dispose();geometries.clear();owned.clear();root=null;}
  function rebuild(){dispose();layer='street';floor=1;roofOrigin=null;point=null;root=new T.Group();scene.add(root);const wood=material('#77694b'),gold=material('#e0ae58'),green=material('#527368'),danger=material('#bd6249'),glow=material('#62e1c0',{emissive:'#348b81',emissiveIntensity:1});
    water=box(root,0,.1,0,getDistrict()===3?70:26,.04,101,material('#315c58',{transparent:true,opacity:.42,metalness:.6,roughness:.16}));
    points=[['camp',0,43],['dock',4,36],['roof',-5,27],['tunnel',5,27],['store',-5,12],['attic',5,4],['crate',-4,-5],['car',5,18],['wreck',-5,-13],['debris',4,-22],['survivor',-5,-32],['looter',5,-35],['zoo',-5,-41],['chemical',4,-9],['wire',-4,-18],['brush',5,-27],['drop',0,-44]].map(([type,x,z])=>({type,x:getDistrict()===3?x*.35:x,z,id:`${getDistrict()}:${type}`}));
    for(const p of points){const hazard=['chemical','wire','brush','zoo','looter'].includes(p.type);p.mesh=box(root,p.x,.35,p.z,.65,.7,.65,hazard?danger:gold);if(['brush','zoo'].includes(p.type)){const creature=box(root,p.x,.22,p.z,1.6,.3,.5,green);box(creature,.8,0,0,.5,.2,.4,green);p.creature=creature;}if(p.type==='camp'){box(root,0,2,43,7,.2,6,wood);for(const x of [-3,3])box(root,x,1,43,.18,2,5,wood);}if(p.type==='dock'){box(root,p.x,.45,p.z,3,.2,5,wood);box(root,p.x+1,1.2,p.z,.2,2, .2,gold);}if(p.type==='roof'){for(let n=0;n<8;n++)box(root,p.x, n*.3,p.z-n*.4,1.3,.2,.7,wood);for(const y of [6,12,18]){box(root,p.x,y,p.z-2,6,.25,6,green);box(root,p.x-2.8,y-3,p.z-4.8,.2,6,.2,wood);box(root,p.x+2.8,y-3,p.z-4.8,.2,6,.2,wood);}}if(p.type==='tunnel'){box(root,p.x,.08,p.z,2,.1,3,material('#182927'));for(const x of [-1,1])box(root,p.x+x,-1,p.z,.15,2,3,wood);}}
    // Compact lower-level bypass with fully submerged choke points and beacon navigation.
    box(root,0,-2.2,-3,6,.2,82,material('#233535'));box(root,-3,-.9,-3,.2,2.6,82,wood);box(root,3,-.9,-3,.2,2.6,82,wood);
    for(let z=-40;z<36;z+=12)box(root,0,-1,z,.12,.3,.12,glow);
    boatMesh=new T.Group();box(boatMesh,0,0,0,1.7,.45,3.6,green);box(boatMesh,0,.35,.3,1.3,.15,1.4,wood);root.add(boatMesh);boatMesh.visible=false;traderMesh=new T.Group();box(traderMesh,0,0,0,1.5,.4,3,gold);box(traderMesh,0,.4,0,1,.5,1.5,wood);root.add(traderMesh);
    const geo=new T.BufferGeometry(),positions=new Float32Array(360);for(let n=0;n<positions.length;n+=3){positions[n]=(Math.random()-.5)*30;positions[n+1]=Math.random()*12;positions[n+2]=Math.random()*100-45;}geo.setAttribute('position',new T.BufferAttribute(positions,3));geometries.add(geo);const mat=new T.PointsMaterial({color:'#c7e7dd',size:.06,transparent:true,opacity:.7});owned.add(mat);rain=new T.Points(geo,mat);root.add(rain);
  }
  function context(){const p=getActor()?.group.position;const near=type=>p&&points.some(q=>q.type===type&&Math.hypot(p.x-q.x,p.z-q.z)<5);return {camp:near('camp')||layer==='roof'||(s().vessel==='raft'&&s().fleet.raft?.modules>=2),dock:near('dock'),roof:layer==='roof',trader:near('dock')&&s().clock%180<90,district:getDistrict(),tunnel:layer==='tunnel'};}
  function feedback(message){toast(message);save();feedbackUntil=s().clock+1;}
  function distance(p){const a=getActor()?.group.position;return a?Math.hypot(a.x-p.x,a.z-p.z):Infinity;}
  function nearest(){return points.filter(p=>distance(p)<3).sort((a,b)=>distance(a)-distance(b))[0];}
  function button(label,action,disabled=false){return `<button class="secondary" data-flood="${action}" ${disabled?'disabled':''}>${label}</button>`;}
  const cost=c=>Object.entries(c).map(([k,v])=>`${v} ${k}`).join(' · ');
  function show(tab='field'){
    if(!getState().flood)return;if(!canUse()){toast('Expanded survival systems are solo-only; leave co-op to use the field console.');return;}
    const f=s(),ctx=context();point=nearest();let body='';
    if(tab==='field')body=`<p class="panel-intro">Approach marked sites and press E. Camp and docks are south; high-value salvage lies north. The simulation pauses while this console is open.</p><div class="flood-actions">${point?button(names[point.type],`site:${point.type}`):'<p>No site in reach. Move toward amber markers.</p>'}${layer!=='street'?button('Return to street / surface','surface'):''}${layer==='roof'?button(`Climb next floor (${floor}/3)`,'climb'):''}${button('Drink clean water','drink')}${button('Collect floodwater','collect')}${button('Drink stagnant water (unsafe)','stagnant')}${button('Filter + boil water','purify')}${button('Treat illness','heal')}${button('Share rations / dry at camp','rest')}</div><h3>Waterborne illness & exposure</h3><p>Hydration ${Math.ceil(f.hydration)} · illness ${Math.ceil(f.illness)} · wetness ${Math.ceil(f.wetness)}% · ${f.temperature.toFixed(1)}°C · oxygen ${Math.ceil(f.oxygen)}%</p><p>Storm: ${['Gulf haze','Torrential rain','Hurricane storm surge'][f.weather]} · flood ${f.level.toFixed(2)}m · next phase ${Math.ceil((f.clock%240<100?100:f.clock%240<170?170:240)-f.clock%240)}s. Flashlight: T. Mask protects mold zones. Poncho limits exposure.</p><h3>Field log</h3>${f.log.map(t=>`<p>◇ ${escape(t)}</p>`).join('')}`;
    if(tab==='craft')body=`<p>Build camp stations on high ground. Tools and protective gear can be crafted anywhere.</p>${Object.entries(recipes).map(([id,r])=>`<div class="entry"><div><h3>${r.name} ${r.kind?`· ${f.stations[id]}/5`:f.gear[id]?'· equipped':''}</h3><p>${cost(r.cost)}</p></div>${button('Construct',`craft:${id}`,r.kind?f.stations[id]>=5:f.gear[id])}</div>`).join('')}`;
    if(tab==='camp')body=`<h3>Morale ${Math.ceil(f.morale)} / 100 · power ${Math.ceil(f.power)} / 100</h3><p>Every active minute: collectors gather rain; solar and fueled generators charge power; powered pumps filter water; refrigeration protects rations. Each three survivors consume one ration. Low morale can cause abandonment.</p>${button('Share rations / warm up','rest')}${button('Fire flare / defend camp (90s)','flare')}<p>${f.extraction?`Extraction ETA ${Math.ceil(f.extraction)}s · enemies converge on your position.`:f.rescued?'Extraction successful. Exploration continues.':'Coast Guard awaiting a signal.'}</p><h3>Camp roles</h3><p>Medic → medical tent; Mechanic → generator (double hull repairs); Botanist → hydroponics; Scout → any station. Station work grants XP; every 100 XP raises production.</p>${f.survivors.map((p,n)=>`<div class="entry"><div><h3>${p.role} · level ${1+Math.floor(p.xp/100)}</h3><p>${p.station||'Unassigned'} · ${p.xp} XP</p></div><select aria-label="Assign ${p.role} ${n+1}" data-role="${n}"><option value="">Unassigned</option>${Object.entries(recipes).filter(([id,r])=>r.kind&&f.stations[id]).map(([id,r])=>`<option value="${id}" ${p.station===id?'selected':''}>${r.name}</option>`).join('')}</select></div>`).join('')||'<p>Rescue rooftop survivors to grow your settlement.</p>'}`;
    if(tab==='boats')body=`<p>Build, board and moor at the southern pier (4, 36). WASD steers; storms push vessels downstream. Grappling anchors hold position. Bayou / French Quarter travel unlocks after restoring a landmark relay. Rafts paddle without fuel.</p>${Object.entries(boats).map(([id,b])=>`<div class="entry"><div><h3>${b.name}</h3><p>${f.fleet[id]?`Hull ${Math.ceil(f.fleet[id].hull)}% · fuel ${f.fleet[id].fuel.toFixed(1)} · modules ${f.fleet[id].modules}`:cost(b.cost)}</p></div>${button(f.vessel===id?'Moor / disembark':f.fleet[id]?'Board':'Construct',`${f.fleet[id]?'board':'boat'}:${id}`)}</div>`).join('')}<div class="flood-actions">${button('Refuel (1 fuel → 5 tank)','refuel')}${button('Repair hull (2 metal)','repair')}${button(f.anchored?'Raise anchor':'Set anchor','anchor')}${button('Raft chest / campfire / seats (3 wood, 2 rope)','module')}${button('Barter: water + medicine + fuel → parts / rations / net','barter')}${button('Safe route → French Quarter','route:0')}${button('Safe route → Bayou','route:3')}</div><p>Trader ${ctx.trader?'docked now':'away (returns every 3 minutes)'}.</p>`;
    if(tab==='radio')body=`<h3>Hand-crank radio · ${Math.ceil(f.radio)}% charge · ${f.frequency} MHz</h3><div class="flood-actions">${button('Crank +25 charge','crank')}${button('Tune next channel (10 charge)','tune')}${button(`Repair landmark relay · stage ${f.relayStage}/2`,'relay')}</div><p>88 MHz military · 101 weather · 121 hidden distress.</p><p>Restored landmark relays ${f.relays.length}/2 · each has an antenna stage and a power stage. Climb the hotel / tower stairwell at (-5, 27). Restored relays reveal high-tier drops and safe boat routes.</p>${f.distress?'<p>Distress mission: reach the north rooftop at (-5, -32). Rescue its stranded specialist for medical supplies and camp recruitment.</p>':''}`;
    if(tab==='pack')body=`<p>Weight ${weight(f).toFixed(1)} / ${capacity()} kg. Overloaded movement is slower. Raft chests expand capacity.</p><div class="resource-grid">${resources.map(k=>`<div><strong>${Math.floor(f.inventory[k])}</strong><span>${k.replace(/([A-Z])/g,' $1')}</span></div>`).join('')}</div>`;
    openModal(`<span class="panel-kicker">GULF COAST SURVIVAL · ${layer.toUpperCase()} · SINGLE PLAYER</span><h2>Waterline field console</h2><div class="tabs flood-tabs">${['field','craft','camp','boats','radio','pack'].map(t=>`<button data-flood-tab="${t}" class="${tab===t?'active':''}">${t}</button>`).join('')}</div>${body}<div class="panel-footer">${button('Save now','save')}${button('Return to expedition','close')}<small>G console · E nearby site · T flashlight</small></div>`);
  }
  function capacity(){return 45+(s().vessel==='raft'&&s().fleet.raft?.modules?30:0);}
  function site(type){const f=s(),p=nearest();if(!p||p.type!==type)return 'Move closer to that site.';const ctx=context(),day=getState().day;
    if(['wire','chemical','brush'].includes(type))return 'Hazard: keep your distance. Protective gear reduces exposure.';
    if(type==='camp'){layer='camp';return 'High-ground camp reached. Construct stations in Craft; assign survivors in Camp.';}
    if(type==='dock'){show('boats');return null;}
    if(type==='roof'){if(!f.gear.flashlight)return 'Craft a waterproof flashlight for the dark stairwells.';if(getStamina()<30)return 'Need 30 stamina to climb.';setStamina(getStamina()-30);layer='roof';floor=1;roofOrigin={x:p.x,z:p.z};loot(f,p.id+'floor1','attic',day);return 'Climbed to floor 1: rare attic salvage recovered. Climb higher for reconnaissance and relay repairs.';}
    if(type==='tunnel'){if(!f.gear.flashlight)return 'Craft a waterproof flashlight before entering the storm drains.';layer='tunnel';return 'Entered the submerged transit bypass. Watch oxygen; Surface in the console to escape.';}
    if(type==='survivor')return recruit(f,p.id,day);
    if(type==='car'&&!f.gear.crowbar)return 'Craft a crowbar to salvage rubber, copper and sheet metal.';
    if(type==='wreck'&&!f.gear.axe&&!f.gear.hammer)return 'Craft an axe or sledgehammer to deconstruct wreckage.';
    if(type==='debris'&&!f.gear.hook&&!f.gear.net)return 'A grappling hook or boat net is required.';
    if(type==='drop'&&!f.relays.includes(getDistrict()))return 'Restore the landmark relay to reveal this supply drop.';
    if(type==='looter'){if(!f.gear.weapon)return 'Territorial looters: craft a makeshift spear before contesting their cache.';hurt(12);return loot(f,p.id,'drop',day);}
    if(type==='zoo'){hurt(f.gear.weapon?8:25);return loot(f,p.id,'zoo',day);}
    return loot(f,p.id,type,day);
  }
  function act(id){if(!canUse())return;const f=s(),[kind,arg]=id.split(':'),ctx=context();let result;
    if(kind==='craft')result=craftFlood(f,arg,ctx.camp);
    else if(kind==='boat')result=buildBoat(f,arg,ctx.dock);
    else if(kind==='board'){if(!ctx.dock)result='Reach the mooring pier first.';else {f.vessel=f.vessel===arg?null:arg;f.anchored=false;result=f.vessel?'Boarded. WASD steers; fuel and hull are shown in Boats.':'Vessel moored safely.';}}
    else if(kind==='site'){result=site(arg);if(!result)return;}
    else if(kind==='surface'){layer='street';roofOrigin=null;result='Returned to street level.';}
    else if(kind==='climb'){if(layer!=='roof'||floor>=3)result='No higher safe floor.';else if(getStamina()<30)result='Need 30 stamina for the next flight.';else{setStamina(getStamina()-30);floor++;if(floor===3)hurt(8);result=loot(f,`${getDistrict()}:floor${floor}`,'drop',getState().day);}}
    else if(kind==='save'){if(save())toast('Progress secured locally.');return;}
    else if(kind==='close'){closeModal();return;}
    else if(kind==='route'){if(!ctx.dock||!f.vessel||!f.relays.length){result='Moor a vessel and restore a landmark relay first.';}else {return {travel:+arg};}}
    else result=actionFlood(f,id,ctx);
    feedback(result);show(kind==='craft'?'craft':['boat','board'].includes(kind)?'boats':'field');
  }
  function update(dt,flashlight){if(!s()||!getActor())return;const f=s(),a=getActor().group,p=a.position,ctx=context();if(!canUse()){water.visible=false;boatMesh.visible=false;rain.visible=false;return;}
    water.visible=layer!=='tunnel';water.position.y=f.level;if(layer==='camp'&&!ctx.camp)layer='street';if(layer==='roof'&&roofOrigin){p.x=T.MathUtils.clamp(p.x,roofOrigin.x-2.5,roofOrigin.x+2.5);p.z=T.MathUtils.clamp(p.z,roofOrigin.z-4.5,roofOrigin.z+.5);}
    if(isActive()){
      const depth=layer==='tunnel'?Math.abs(p.z+5)<9?2:1.2:layer==='street'?f.level:0;
      const before=f.log[0];const result=tickFlood(f,dt,{...ctx,depth,day:getState().day,indoor:layer==='roof'&&!flashlight,exposed:layer==='street',moving:Math.abs(a.userData.speed||0)>.1,swimming:depth>1.3&&!f.vessel});
      // Fractional environmental damage must not be lost to the combat invulnerability gate.
      getState().hp=Math.max(0,getState().hp-result.damage);setStamina(Math.max(0,getStamina()-result.staminaDrain));
      if(f.vessel&&!f.anchored){move(a,dt*result.current*.35,dt*result.current);}
      else if(layer==='street'&&depth>1&&!f.vessel)move(a,dt*result.current*.2,dt*result.current*.45);
      hitCooldown-=dt;
      const hazard=points.find(q=>['chemical','wire','brush'].includes(q.type)&&distance(q)<2);
      if(hazard&&hitCooldown<=0){hurt(hazard.type==='wire'?12:f.gear.poncho?2:5);if(hazard.type==='brush')f.illness=Math.min(100,f.illness+2);hitCooldown=3;toast(names[hazard.type]);}
      if(f.extraction&&Math.floor(f.extraction)%15===0&&f.clock-lastEvent>5){lastEvent=f.clock;hurt(Math.max(1,8-f.stations.barricade*2));toast('Extraction defense: hostile scavengers at the perimeter!');}
      if(layer==='roof'&&getStamina()<5&&hitCooldown<=0){hurt(8);hitCooldown=5;toast('Unstable upper floors: rest before climbing further.');}
      if(f.log[0]!==before)toast(f.log[0]);
      if(getState().hp<=0)hurt(1);
    }
    const height=layer==='roof'?floor*6+.2:layer==='camp'?2.15:layer==='tunnel'?-2:ctx.camp?2.15:f.vessel?f.level+.5:Math.max(0,f.level-.9);
    p.y=height;boatMesh.visible=!!f.vessel;boatMesh.position.set(p.x,f.level+.1,p.z);boatMesh.rotation.y=a.rotation.y;
    if(f.vessel){const b=f.fleet[f.vessel];boatMesh.scale.set(f.vessel==='patrol'?1.3:1,1,f.vessel==='raft'?1.2:1);if((b.hull<=0||!b.fuel&&f.vessel!=='raft')&&f.clock-lastEvent>8){lastEvent=f.clock;toast('Vessel disabled: return to a pier to repair or refuel.');}}
    traderMesh.position.set(4,f.level+.3,f.clock%180<90?33:33-(f.clock%180-90)*.7);traderMesh.visible=true;rain.visible=f.weather>0;if(isActive())for(const q of points){if(['crate','debris'].includes(q.type)&&f.weather===2){q.z+=dt*.3;if(q.z>30)q.z=-40;q.mesh.position.set(q.x,f.level+.3,q.z);}if(q.creature){q.creature.position.x=q.x+Math.sin(f.clock*.7)*1.2;q.creature.position.z=q.z+Math.cos(f.clock*.7)*1.2;q.creature.rotation.y=f.clock*.7;}}const pos=rain.geometry.attributes.position;for(let n=0;n<pos.count;n++){pos.setY(n,pos.getY(n)-dt*(f.weather===2?22:13));if(pos.getY(n)<0)pos.setY(n,12);}pos.needsUpdate=true;
    water.material.color.set(getState().time>=20?'#24716e':'#315c58');water.material.emissive.set(getState().time>=20?'#0b3936':'#000000');
    const nearestPoint=nearest();$('#flood-near').textContent=nearestPoint?`E · ${names[nearestPoint.type]}`:'G · Waterline field console';
    $('#flood-vitals').textContent=`WATER ${Math.ceil(f.hydration)} · O₂ ${Math.ceil(f.oxygen)} · ${f.temperature.toFixed(1)}°C · ${weight(f).toFixed(0)}/${capacity()} kg`;
    $('#flood-weather').textContent=`${['GULF HAZE','TORRENTIAL RAIN','STORM SURGE'][f.weather]} · ${f.level.toFixed(1)}m${f.vessel?` · ${boats[f.vessel].name} · ${Math.ceil(f.fleet[f.vessel].hull)}% hull`:''}`;
    document.body.classList.toggle('flood-feedback',feedbackUntil>f.clock);return {fog:f.weather===2?.036:f.weather===1?.022:getState().time>=20?.026:.0095};
  }
  const $=selector=>document.querySelector(selector);
  return {rebuild,dispose,show,act,update,nearest,layer:()=>layer,context,capacity,speed:()=>{const f=s();if(!f)return 1;if(f.vessel){const b=f.fleet[f.vessel];return f.anchored||b.hull<=0?0:boats[f.vessel].speed/(3.8*(b.fuel||f.vessel==='raft'?1:4));}return weight(f)>capacity()?.65:1;},collision:()=>{const f=s();if(f?.vessel&&f.clock-collisionAt>1){f.fleet[f.vessel].hull=Math.max(0,f.fleet[f.vessel].hull-2);collisionAt=f.clock;toast('Debris collision · hull damaged');}},interact:()=>{const p=nearest();if(p){show();return true;}return false;}};
}
