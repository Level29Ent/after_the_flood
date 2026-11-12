import { restoreContracts } from './city-contracts.js';
// Serializable, deterministic personal survival simulation. No renderer or browser dependencies.
export const resources = ['wood','tarps','rope','barrels','rubber','copper','metal','fuel','battery','dirtyWater','cleanWater','charcoal','rations','medicine','parts'];
export const recipes = {
  collector:{name:'Rainwater collector',cost:{wood:4,tarps:2},kind:'station'},
  solar:{name:'Solar generator',cost:{copper:4,metal:4,parts:2},kind:'station'},
  medical:{name:'Medical tent',cost:{tarps:3,wood:3,medicine:1},kind:'station'},
  barricade:{name:'Debris barricade',cost:{wood:3,metal:2},kind:'station'},
  generator:{name:'Fuel generator',cost:{parts:3,copper:2,metal:4},kind:'station'},
  bank:{name:'Battery bank',cost:{battery:2,copper:2},kind:'station'},
  pump:{name:'Filtration pump',cost:{parts:2,copper:2,charcoal:2},kind:'station'},
  fridge:{name:'Refrigerator',cost:{parts:2,metal:3,copper:2},kind:'station'},
  crops:{name:'Rooftop hydroponics',cost:{wood:4,dirtyWater:2},kind:'station'},
  fire:{name:'Sheltered campfire',cost:{wood:3,tarps:1},kind:'station'},
  filter:{name:'Charcoal filter',cost:{charcoal:2,tarps:1}},
  mask:{name:'Cloth respirator',cost:{tarps:2,charcoal:1}},
  poncho:{name:'Waterproof poncho',cost:{tarps:3,rubber:2}},
  weapon:{name:'Makeshift spear',cost:{wood:2,metal:2}},
  flare:{name:'Emergency flare gun',cost:{metal:3,fuel:1}},
  hook:{name:'Grappling hook / anchor',cost:{rope:3,metal:2}},
  net:{name:'Boat salvage net',cost:{rope:3,tarps:2}},
  glowstick:{name:'Beacon glowsticks',cost:{rubber:1,copper:1}},
  flashlight:{name:'Waterproof flashlight',cost:{battery:1,rubber:2,copper:1}},
  crowbar:{name:'Salvage crowbar',cost:{metal:3}},
  axe:{name:'Salvage axe',cost:{metal:2,wood:2}},
  hammer:{name:'Sledgehammer',cost:{metal:4,wood:2}}
};
export const boats = {
  skiff:{name:'Flat-bottom skiff',cost:{wood:5,metal:3,fuel:2},speed:7,burn:.035},
  airboat:{name:'Swamp airboat',cost:{parts:5,metal:6,fuel:3},speed:10,burn:.065},
  patrol:{name:'Salvaged patrol boat',cost:{parts:7,metal:8,fuel:4},speed:8,burn:.05},
  raft:{name:'Barrel pontoon raft',cost:{barrels:4,wood:6,rope:3},speed:3,burn:0}
};
export const roles = ['Medic','Mechanic','Botanist','Scout'];
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const number=(n,f=0,max=100000)=>Number.isFinite(n)?clamp(n,0,max):f;
export function restoreFlood(saved={}) {
  const s=saved&&typeof saved==='object'?saved:{};
  return {version:1,contracts:restoreContracts(s.contracts),inventory:Object.fromEntries(resources.map(k=>[k,number(s.inventory?.[k],({wood:8,tarps:5,rope:4,barrels:4,metal:6,fuel:6,battery:2,cleanWater:4,rations:4,charcoal:3})[k]||0)])),
    gear:Object.fromEntries(Object.keys(recipes).filter(k=>!recipes[k].kind).map(k=>[k,s.gear?.[k]===true])),
    stations:Object.fromEntries(Object.keys(recipes).filter(k=>recipes[k].kind).map(k=>[k,number(s.stations?.[k],0,5)])),
    fleet:Object.fromEntries(Object.keys(boats).map(k=>[k,s.fleet?.[k]?{hull:number(s.fleet[k].hull,100,100),fuel:number(s.fleet[k].fuel,10,30),modules:number(s.fleet[k].modules,0,3)}:null])),
    vessel:boats[s.vessel]&&s.fleet?.[s.vessel]?s.vessel:null,anchored:s.anchored===true,
    hydration:number(s.hydration,100,100),illness:number(s.illness,0,100),wetness:number(s.wetness,0,100),temperature:Number.isFinite(s.temperature)?clamp(s.temperature,32,38):37,oxygen:number(s.oxygen,100,100),morale:number(s.morale,75,100),power:number(s.power,0,100),
    clock:number(s.clock),production:number(s.production),weather:0,level:.15,
    survivors:Array.isArray(s.survivors)?s.survivors.slice(0,12).map((p,i)=>({id:number(p.id,i),role:roles.includes(p.role)?p.role:'Scout',station:recipes[p.station]?.kind?p.station:null,xp:number(p.xp)})):[],
    claims:Array.isArray(s.claims)?s.claims.filter(x=>typeof x==='string').slice(-500):[],radio:number(s.radio,0,100),frequency:[88,101,121].includes(s.frequency)?s.frequency:88,distress:s.distress===true,
    relays:Array.isArray(s.relays)?s.relays.filter(x=>Number.isInteger(x)&&x>=0&&x<4):[],relayStage:number(s.relayStage,0,2),extraction:number(s.extraction,0,90),rescued:s.rescued===true,log:Array.isArray(s.log)?s.log.filter(x=>typeof x==='string').slice(0,6):[]};
}
export function logEvent(s,text){s.log.unshift(text);s.log=s.log.slice(0,6);return text;}
export function afford(s,cost){return Object.entries(cost).every(([k,v])=>(s.inventory[k]||0)>=v);}
function spend(s,cost){if(!afford(s,cost))return false;for(const [k,v] of Object.entries(cost))s.inventory[k]-=v;return true;}
export function weight(s){return resources.reduce((n,k)=>n+s.inventory[k]*(k==='metal'?1.5:.5),0);}
export function craftFlood(s,id,atCamp){const r=recipes[id];if(!r)return 'Unknown recipe.';if(r.kind&&!atCamp)return 'Build on a rooftop or high-ground camp.';if(r.kind?s.stations[id]>=5:s.gear[id])return 'Already built / maximum level.';if(!spend(s,r.cost))return 'Missing materials. Scavenge or deconstruct wreckage.';if(r.kind)s.stations[id]++;else s.gear[id]=true;return logEvent(s,`${r.name} constructed.`);}
export function buildBoat(s,id,atDock){if(!atDock)return 'Reach a marked mooring pier first.';if(!boats[id])return 'Unknown vessel.';if(s.fleet[id])return 'Vessel already moored.';if(!spend(s,boats[id].cost))return 'Missing boat materials.';s.fleet[id]={hull:100,fuel:id==='raft'?0:10,modules:0};return logEvent(s,`${boats[id].name} ready at the dock.`);}
export function claimed(s,id,day){const key=`${day}:${id}`;if(s.claims.includes(key))return true;s.claims.push(key);s.claims=s.claims.slice(-500);return false;}
export function loot(s,id,kind,day){if(claimed(s,id,day))return 'Already salvaged today.';const table={store:{tarps:2,rations:2,medicine:1},attic:{wood:3,battery:1,rope:2},crate:{fuel:2,barrels:2,charcoal:2},car:{rubber:3,copper:3,metal:3},wreck:{wood:4,metal:3,parts:2},debris:{parts:3,metal:2,rope:1},zoo:{medicine:3,parts:2},drop:{fuel:3,medicine:2,parts:3}};for(const [k,v] of Object.entries(table[kind]||table.crate))s.inventory[k]+=Math.max(1,Math.ceil(v/(1+Math.max(0,day-1)*.06)));return logEvent(s,`Recovered ${kind} supplies${kind==='debris'?' and a journal: “The beacon still burns above Canal Street.”':''}.`);}
export function recruit(s,id,day){if(s.survivors.length>=12)return 'Camp capacity reached (12).';if(claimed(s,id,day))return 'This rooftop is clear.';const role=roles[Math.floor(Math.random()*roles.length)];s.survivors.push({id:s.clock+s.survivors.length,role,station:null,xp:0});s.inventory.medicine++;s.morale=clamp(s.morale+8);return logEvent(s,`${role} rescued. Assign a camp station to develop their skills.`);}
export function actionFlood(s,id,ctx={}) {
  const i=s.inventory,b=s.fleet[s.vessel];
  if(id==='drink'){if(i.cleanWater<1)return 'No clean water.';i.cleanWater--;s.hydration=clamp(s.hydration+35);return logEvent(s,'Clean water · hydration restored.');}
  if(id==='stagnant'){s.hydration=clamp(s.hydration+15);s.illness=clamp(s.illness+30);return logEvent(s,'Contaminated floodwater: illness and stamina loss.');}
  if(id==='collect'){i.dirtyWater++;return logEvent(s,'Floodwater collected. Filter AND boil before drinking.');}
  if(id==='purify'){if(!s.gear.filter||i.dirtyWater<1||i.fuel<1)return 'Requires charcoal filter, floodwater and fuel to boil.';i.dirtyWater--;i.fuel--;i.cleanWater++;return logEvent(s,'Water filtered and boiled safely.');}
  if(id==='heal'){if(i.medicine<1)return 'No medicine.';i.medicine--;s.illness=clamp(s.illness-40);return logEvent(s,'Illness treated.');}
  if(id==='rest'){if(!ctx.camp)return 'Reach a rooftop or high ground.';if(i.rations<1)return 'No rations.';i.rations--;s.morale=clamp(s.morale+15);s.wetness=clamp(s.wetness-30);s.temperature=clamp(s.temperature+.5,32,37);return logEvent(s,'Shared a hot meal under shelter.');}
  if(id==='refuel'){if(!ctx.dock||!b||i.fuel<1)return 'Moor a vessel with fuel in your pack.';if(b.fuel>=30)return 'Fuel tank full.';i.fuel--;b.fuel=Math.min(30,b.fuel+5);return logEvent(s,'Vessel refueled.');}
  if(id==='repair'){if(!ctx.dock||!b||i.metal<2)return 'Moor a vessel and bring 2 sheet metal.';i.metal-=2;const mechanic=s.survivors.some(p=>p.role==='Mechanic'&&p.station==='generator');b.hull=clamp(b.hull+(mechanic?50:25));return logEvent(s,'Hull repaired.');}
  if(id==='anchor'){if(!s.vessel||!s.gear.hook)return 'Board a vessel and craft a grappling anchor.';s.anchored=!s.anchored;return logEvent(s,s.anchored?'Anchor set.':'Anchor raised.');}
  if(id==='module'){if(!ctx.dock||s.vessel!=='raft'||!b)return 'Moor and board your raft.';if(b.modules>=3)return 'Raft fully equipped.';if(!spend(s,{wood:3,rope:2}))return 'Requires 3 wood and 2 rope.';b.modules++;return logEvent(s,['','Storage chest installed (+30 carry capacity).','Sheltered campfire installed.','Survivor platform installed (4 seats).'][b.modules]);}
  if(id==='barter'){if(!ctx.trader)return 'Trader docks for the first 90 seconds of each 3-minute cycle.';if(!spend(s,{cleanWater:2,medicine:1,fuel:1}))return 'Trade costs 2 clean water, 1 medicine, 1 fuel.';i.parts+=3;i.rations+=3;s.gear.net=true;return logEvent(s,'Barter complete: parts, preserved rations and a boat-net blueprint.');}
  if(id==='crank'){s.radio=clamp(s.radio+25);return logEvent(s,'Emergency radio hand-cranked.');}
  if(id==='tune'){if(s.radio<10)return 'Crank the radio first.';s.radio-=10;s.frequency=({88:101,101:121,121:88})[s.frequency];if(s.frequency===121)s.distress=true;return logEvent(s,({88:'88 MHz · Military: repair landmark relays in stages to reopen evacuation routes.',101:'101 MHz · Weather: storm surges peak every four minutes. Head for higher ground.',121:'121 MHz · Distress: survivors trapped at the north rooftop. Optional rescue signal marked.'})[s.frequency]);}
  if(id==='relay'){if(!ctx.roof||![0,1].includes(ctx.district))return 'Climb a New Orleans hotel or Houston tower.';if(s.relays.includes(ctx.district))return 'This relay is restored.';if(!spend(s,{parts:2,copper:2}))return 'Each relay stage requires 2 parts and 2 copper.';s.relayStage++;if(s.relayStage>=2){s.relayStage=0;s.relays.push(ctx.district);return logEvent(s,'Landmark relay restored: reconnaissance, safe boat routes and high-tier drops unlocked.');}return logEvent(s,'Relay stage 1/2: antenna stabilized. Next: power and transmit.');}
  if(id==='flare'){if(s.extraction)return 'Extraction already underway.';if(!s.gear.flare&&!s.relays.includes(ctx.district))return 'Craft a flare gun or restore this district relay.';if(!spend(s,{fuel:1}))return 'A signal flare requires fuel.';s.extraction=90;return logEvent(s,'Coast Guard inbound. Defend your camp for 90 seconds!');}
  return 'Action unavailable.';
}
export function tickFlood(s,dt,ctx) {
  s.clock+=dt;const cycle=s.clock%240;s.weather=cycle<100?0:cycle<170?1:2;
  const target=s.weather===2?2.4:s.weather===1?1.1:.15;s.level+=(target-s.level)*Math.min(1,dt*.08);
  const submerged=ctx.tunnel&&ctx.depth>1.5;
  s.oxygen=clamp(s.oxygen+dt*(submerged?-6:14));
  s.hydration=clamp(s.hydration-dt*.045*(1+ctx.day*.08));
  if(ctx.exposed&&(ctx.depth>.4||s.weather)){s.wetness=clamp(s.wetness+dt*(s.gear.poncho?.15:.9));}else s.wetness=clamp(s.wetness-dt*(ctx.camp&&s.stations.fire?2:.3));
  s.temperature=clamp(s.temperature+dt*(s.wetness>65?-.008:.014),32,37);
  const mold=ctx.tunnel||ctx.indoor;let damage=0;
  if(mold&&!s.gear.mask){damage+=dt*.3;s.illness=clamp(s.illness+dt*.1);}
  if(s.hydration<=0||s.oxygen<=0||s.temperature<34)damage+=dt*2;
  if(ctx.depth>.3&&!s.gear.poncho)s.illness=clamp(s.illness+dt*.025);
  if(s.illness>20)damage+=dt*.08;
  s.morale=clamp(s.morale+dt*((s.weather?-.018:0)+(iFood(s)?-.035:.005)));
  if(s.vessel){const b=s.fleet[s.vessel];if(ctx.moving&&!s.anchored&&b){b.fuel=Math.max(0,b.fuel-dt*boats[s.vessel].burn);}}
  s.production+=dt;
  if(s.production>=60){s.production-=60;const i=s.inventory;
    if(s.weather)i.cleanWater+=s.stations.collector*2;
    s.power=clamp(s.power+s.stations.solar*(s.weather?2:12));
    if(s.stations.generator&&i.fuel>=1){i.fuel--;s.power=clamp(s.power+25);}
    if(s.stations.bank)s.power=clamp(s.power+s.stations.solar*3);
    const powered=s.power>=5;
    if(powered&&s.stations.pump&&i.dirtyWater>=1){i.dirtyWater--;i.cleanWater++;s.power-=5;}
    if(!powered||!s.stations.fridge)i.rations=Math.max(0,i.rations-1);
    else s.power=Math.max(0,s.power-3);
    for(const p of s.survivors){if(!p.station||!s.stations[p.station])continue;p.xp+=10;const bonus=1+Math.floor(p.xp/100);if(p.role==='Medic'&&p.station==='medical')i.medicine+=bonus;if(p.role==='Botanist'&&p.station==='crops')i.rations+=bonus;if(p.role==='Scout')i.parts++;}
    i.rations=Math.max(0,i.rations-Math.ceil(s.survivors.length/3));
    if(s.morale<20&&s.survivors.length){s.survivors.pop();logEvent(s,'A survivor abandoned camp after an argument over rations.');}
    else if(s.morale<40)logEvent(s,'Camp morale low: exhaustion and arguments. Share rations and seek shelter.');
  }
  if(s.extraction>0){s.extraction=Math.max(0,s.extraction-dt);if(!s.extraction){s.rescued=true;s.morale=100;logEvent(s,'Extraction reached the camp. Survivors evacuated; free exploration continues.');}}
  return {damage,staminaDrain:dt*((s.illness>20?2:0)+(s.temperature<35?3:0)+(ctx.swimming?4:0)),current:s.weather===2?1.7:.3};
}
function iFood(s){return s.inventory.rations<1;}
