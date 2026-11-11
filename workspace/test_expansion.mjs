import assert from 'node:assert/strict';
import * as T from 'three';
import {prepareExpansion,withinExpansion,siteNames} from './src/expansion.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const m=Object.fromEntries(['stone','wood','dark','metal','gold','white','rust','green','red','blue','leaf','brick','pink','wall','glass','lamp','trunk','road','yellow'].map(k=>[k,new T.MeshStandardMaterial()]));
for(let district=0;district<4;district++){
 const result=prepareExpansion(district,m);assert.equal(result.sites.length,4);assert.equal(siteNames[district].length,4);
 for(const site of result.sites){
  assert.ok(withinExpansion(district,site.x,site.z),'Room center is reachable');
  const sign=Math.sign(site.x);
  for(let t=0;t<=12;t+=.2){const x=site.x-sign*t,z=site.z;assert.ok(withinExpansion(district,x,z),'Continuous entrance approach');assert.ok(!result.colliders.some(c=>(c.minY||0)<1.8&&Math.abs(x-c.x)<c.w/2+.42&&Math.abs(z-c.z)<c.d/2+.42),'Doorway remains clear');}
  assert.ok(withinExpansion(district,site.cache.x,site.cache.z),'Interior cache inside walkable area');
 }
 assert.ok(result.colliders.every(c=>[c.x,c.z,c.w,c.d,c.h,c.minY].every(Number.isFinite)));console.log(`${district}: four furnished shells, clear entrances, finite colliders, connected paths`);
}
