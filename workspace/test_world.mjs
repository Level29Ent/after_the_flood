import assert from 'node:assert/strict';
import {makeMaterials,buildDistrict} from './src/assets.js';
import {withinExpansion} from './src/expansion.js';
const ctx=new Proxy({},{get:()=>()=>{}});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const materials=makeMaterials();
for(let district=0;district<4;district++){
 const world=buildDistrict(district,materials);
 const blocked=(x,z)=>!withinExpansion(district,x,z,.42)||world.colliders.some(c=>(c.minY||0)<1.8+(district===3?.26:0)&&Math.abs(x-c.x)<c.w/2+.42&&Math.abs(z-c.z)<c.d/2+.42);
 const queue=[[0,38]],seen=new Set(['0,76']);let head=0;
 while(head<queue.length){const [x,z]=queue[head++];for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const xx=x+dx,zz=z+dz,key=`${xx*2},${zz*2}`;if(seen.has(key)||blocked(xx,zz))continue;seen.add(key);queue.push([xx,zz]);}}
 for(const site of world.sites){assert.ok(queue.some(([x,z])=>Math.hypot(x-site.x,z-site.z)<1),`${site.name} center unreachable`);assert.ok(queue.some(([x,z])=>Math.hypot(x-site.cache.x,z-site.cache.z)<1.6),`${site.name} cache unreachable`);assert.ok(site.roof.children.some(o=>o.isMesh),'Roof must survive static merge');}
 assert.equal(world.interact.filter(i=>i.type==='cache').length,10);console.log(`District ${district}: all four interiors/caches reachable in actual geometry; 10 caches; ${queue.length} walkable samples`);
 world.root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
}
