import assert from 'node:assert/strict';
import * as T from 'three';
import {createExpedition} from './src/flood-expedition.js';
import {restoreFlood,recipes} from './src/flood-systems.js';
const ctx=new Proxy({},{get:()=>()=>{}});
const nodes=new Map();
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx}),querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:''});return nodes.get(selector);},body:{classList:{toggle(){}}}};
for(let district=0;district<4;district++){
  const scene=new T.Scene(),actor={group:new T.Group()};actor.group.position.set(0,0,43);
  const state={flood:restoreFlood(),day:1,hp:100,time:17};let stamina=100;
  const expedition=createExpedition({scene,getState:()=>state,getDistrict:()=>district,getActor:()=>actor,getStamina:()=>stamina,setStamina:v=>stamina=v,hurt:()=>{},move:()=>{},openModal:()=>{},closeModal:()=>{},toast:()=>{},save:()=>true,isActive:()=>false,canUse:()=>true});
  expedition.rebuild();expedition.update(0,true);
  const tower=scene.getObjectByName('completed-exploration-tower');assert.ok(tower,'tower has a finished model');assert.deepEqual(tower.userData.floorHeights,[6.2,12.2,18.2]);
  assert.equal(tower.children.filter(c=>c.name==='connected-staircase').length,3);
  assert.ok(scene.getObjectByName('high-ground-camp'));assert.ok(scene.getObjectByName('finished-transit-interior'));
  assert.equal(scene.getObjectByName('finished-transit-interior').visible,false);
  for(const [id,recipe] of Object.entries(recipes))if(recipe.kind)state.flood.stations[id]=1;
  expedition.update(0,true);
  for(const [id,recipe] of Object.entries(recipes))if(recipe.kind){const station=scene.getObjectByName('constructed-camp-stations').getObjectByName(`station-${id}`);assert.ok(station?.children.length>1,`${id} must be visible after construction`);}
  assert.equal(expedition.elevation(),2.15);actor.group.position.set(8,0,43);assert.equal(expedition.elevation(),district===3?.26:0,'no hovering beyond the deck');
  for(const id of ['skiff','airboat','patrol','raft']){state.flood.fleet[id]={hull:100,fuel:10,modules:3};state.flood.vessel=id;expedition.update(0,true);const model=scene.getObjectByName('active-vessel').getObjectByName(`vessel-${id}`);assert.ok(model?.children.length>2,`${id} has its own completed vessel model`);}
  state.flood.vessel=null;state.flood.gear.flashlight=true;
  const x=district===3?1.75:5;actor.group.position.set(x,0,27);expedition.act('site:tunnel');expedition.update(0,true);
  assert.equal(expedition.layer(),'tunnel');assert.equal(actor.group.position.y,-2);assert.equal(scene.getObjectByName('surface-environment').visible,false);assert.equal(scene.getObjectByName('finished-transit-interior').visible,true);
  expedition.act('surface');expedition.update(0,true);assert.equal(expedition.layer(),'street');assert.equal(scene.getObjectByName('surface-environment').visible,true);assert.equal(scene.getObjectByName('finished-transit-interior').visible,false);
  actor.group.position.set(district===3?-1.75:-5,0,27);expedition.act('site:roof');assert.equal(expedition.elevation(),6.2);expedition.act('climb');assert.equal(expedition.elevation(),12.2);expedition.act('climb');assert.equal(expedition.elevation(),18.2);
  scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isMesh){assert.ok(o.matrixWorld.elements.every(Number.isFinite));assert.ok(o.geometry.attributes.position.count>0);}});
  expedition.resetLayer();assert.equal(expedition.layer(),'street');expedition.dispose();assert.equal(scene.children.length,0,'all expedition models removed on teardown');
  console.log(`PASS district ${district}: complete tower/stairs, visible camp construction, vessel variants, tunnel layer and elevation, surface return, finite geometry, teardown`);
}
