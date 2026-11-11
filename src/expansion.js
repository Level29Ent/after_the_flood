import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const siteNames = [
 ['French Market Pharmacy','Riverfront Jazz House','Lafitte Relief Clinic','Canal Street Depot'],
 ['Mission Control Annex','Buffalo Bayou Pump Station','Downtown Rescue Clinic','Freight Recovery Depot'],
 ['Sunset Film Archive','Pacific Surf Supply','Hollywood Field Clinic','Observatory Research Annex'],
 ['Cypress Fishing Lodge','Blackwater Boathouse','Marsh Research Station','Old Parish Trading Post']
];
export const crossings=[28,-14];
const boxGeo=new T.BoxGeometry(1,1,1);
function piece(parent,mat,x,y,z,w,h,d,bevel=0){let geometry=bevel?new RoundedBoxGeometry(w,h,d,2,bevel):boxGeo;if(mat.map&&!bevel){geometry=boxGeo.clone();const uv=geometry.getAttribute('uv'),u=[d,d,w,w,w,w],v=[h,h,d,d,h,h];for(let i=0;i<uv.count;i++){const face=Math.floor(i/4);uv.setXY(i,uv.getX(i)*Math.max(1,u[face]/3),uv.getY(i)*Math.max(1,v[face]/3));}}const mesh=new T.Mesh(geometry,mat);if(!bevel)mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function text(parent,label,x,y,z,w,h,m){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*h/w);const ctx=canvas.getContext('2d');ctx.fillStyle='#20382e';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#d7b777';ctx.lineWidth=8;ctx.strokeRect(12,12,canvas.width-24,canvas.height-24);ctx.fillStyle='#eee2bf';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${Math.round(canvas.height*.43)}px Georgia`;ctx.fillText(label,512,canvas.height/2,970);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const material=new T.MeshStandardMaterial({map,roughness:.8});const mesh=new T.Mesh(new T.PlaneGeometry(w,h),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function furnish(g,m,kind,solid){
 const desk=(x,z,w=3)=>{solid(m.wood,x,.58,z,w,1.16,.85,.05);piece(g,m.dark,x,1.2,z,w+.16,.1,1,.035);for(let a=-w/2+.2;a<w/2;a+=.65){piece(g,m.gold,x+a,.6,z+.44,.08,.04,.035);piece(g,m.dark,x+a,.92,z+.44,.5,.03,.02);}};
 const rack=(x,z)=>{solid(m.metal,x,1.35,z,2.3,2.7,.65);for(let y=.3;y<2.6;y+=.65){piece(g,m.wood,x,y,z+.02,2.2,.07,.7);for(let i=0;i<4;i++){piece(g,[m.white,m.rust,m.green,m.red][i],x-.8+i*.5,y+.2,z,.28,.3+((i+kind)%3)*.08,.3,.02);}}};
 rack(-4.6,-3.9);rack(-1.7,-3.9);desk(3,-2.7,3.3);
 if(kind===0){for(const x of [-3.8,-1.8]){solid(m.metal,x,.47,.2,1.3,.94,2.6,.05);piece(g,m.white,x,.98,.2,1.22,.2,2.4,.07);piece(g,m.white,x,1.12,-.65,1.1,.2,.55,.08);}text(g,'RELIEF + MEDICAL',0,3.2,-5.72,5,.6,m);}
 if(kind===1){desk(-3,.7,2.5);for(let i=0;i<3;i++){const mat=m.blue;piece(g,m.dark,-3.7+i*.7,1.68,.65,.65,.7,.15,.035);piece(g,mat,-3.7+i*.7,1.68,.75,.52,.52,.03);piece(g,m.metal,-3.7+i*.7,1.25,.6,.08,.35,.08);}text(g,'TRANSMISSION / OPERATIONS',0,3.2,-5.72,6,.6,m);}
 if(kind===2){desk(-3,1,3);for(let i=0;i<5;i++){piece(g,m.gold,-4+i*.45,1.34,1,.16,.18,.16,.02);}const drum=new T.Mesh(new T.CylinderGeometry(.7,.7,.7,32),m.rust);drum.position.set(3,.6,1);g.add(drum);solid(m.wood,3,.5,1,1.5,1,1.5);text(g,'SAFE WATER / LOCAL SUPPLIES',0,3.2,-5.72,6,.6,m);}
 if(kind===3){for(const x of [-3,3])for(let j=0;j<2;j++){solid(m.wood,x,.5+j*.9,.7,1.5,.9,1.3,.04);piece(g,m.gold,x,.5+j*.9,1.37,1.2,.12,.03);}text(g,'SALVAGE / AUTHORIZED RECOVERY',0,3.2,-5.72,7,.6,m);}
 for(const x of [-4.8,4.8]){piece(g,m.dark,x,.2,3.6,.7,.4,.7,.06);const pot=new T.Mesh(new T.CylinderGeometry(.27,.2,.5,24),m.rust);pot.position.set(x,.55,3.6);g.add(pot);for(let j=0;j<7;j++){const leaf=new T.Mesh(new T.SphereGeometry(1,16,10),m.leaf);leaf.position.set(x+Math.sin(j)*.21,1+Math.cos(j)*.08,3.6+Math.cos(j)*.21);leaf.scale.set(.045,.48,.13);leaf.rotation.set(Math.sin(j)*.5,j,Math.cos(j)*.55);leaf.castShadow=true;g.add(leaf);}}
}

export function prepareExpansion(index,m){
 const root=new T.Group(),colliders=[],sites=[],roofs=[],lights=[],paths=[];const floor=index===3?.26:0;
 const addWorld=(mat,x,y,z,w,h,d,bevel=0)=>piece(root,mat,x,y,z,w,h,d,bevel);
 for(const z of crossings){
  if(index===3){for(let x=-35;x<=35;x+=1.05){addWorld(m.wood,x,.12,z,1,.26,4);if(Math.round(x)%4===0)for(const s of [-1,1])addWorld(m.trunk,x,-.2,z+s*1.9,.18,1.5,.18);}paths.push({x:0,z,w:70,d:4});}
  else {addWorld(m.road,0,-.015,z,104,.04,10);for(const s of [-1,1]){addWorld(m.stone,0,.06,z+s*5.6,104,.12,1.2);for(let x=-48;x<=48;x+=7)if(Math.abs(x)>10)addWorld(m.yellow,x,.012,z,.12,.02,2.5);}}
 }
 for(let i=0;i<4;i++){
  const side=i%2?1:-1,x=side*(index===3?28:40),z=crossings[Math.floor(i/2)],angle=side>0?-Math.PI/2:Math.PI/2;
  const g=new T.Group();g.position.set(x,floor,z);g.rotation.y=angle;root.add(g);const worldPos=(lx,lz)=>({x:x+Math.cos(angle)*lx+Math.sin(angle)*lz,z:z-Math.sin(angle)*lx+Math.cos(angle)*lz});
  const solid=(mat,lx,y,lz,w,h,d,bevel=0)=>{piece(g,mat,lx,y,lz,w,h,d,bevel);const p=worldPos(lx,lz);colliders.push({x:p.x,z:p.z,w:d,d:w,h:floor+y+h/2,minY:Math.max(floor,y-h/2+floor)});};
  const wall=index===3?m.wood:[m.brick,m.green,m.pink,m.wall][i];
  piece(g,index===3?m.wood:m.stone,0,-.06,0,12.4,.12,12.4);
  // Open 2.8m entrance, 3.4m clear height. No solid facade hidden behind the doorway.
  solid(wall,0,2.5,-6,12.4,5,.32,.03);solid(wall,-6,2.5,0,.32,5,12,.03);solid(wall,6,2.5,0,.32,5,12,.03);
  solid(wall,-3.8,2.5,6,4.8,5,.32,.03);solid(wall,3.8,2.5,6,4.8,5,.32,.03);solid(wall,0,4.25,6,2.8,1.5,.32,.03);
  for(const a of [-1.5,1.5])piece(g,m.stone,a,1.75,6.2,.16,3.5,.25,.03);piece(g,m.stone,0,3.5,6.2,3.2,.18,.3,.03);
  for(const a of [-3.8,3.8]){piece(g,m.dark,a,2.3,6.2,3.5,2,.12);piece(g,m.glass,a,2.3,6.28,3.2,1.75,.05);for(let j=-1;j<=1;j++)piece(g,m.wood,a+j,2.3,6.32,.055,1.85,.08);piece(g,m.stone,a,1.3,6.3,3.7,.16,.4);}
  const roof=new T.Group();g.add(roof);piece(roof,m.dark,0,5.1,0,12.8,.23,12.8,.06);for(const a of [-6.25,6.25]){piece(roof,m.stone,a,5.4,0,.22,.6,12.7);piece(roof,m.stone,0,5.4,a,12.7,.6,.22);}roof.traverse(o=>{if(o.isMesh)o.userData.dynamic=true;});roofs.push(roof);
  for(let y=.5;y<5;y+=1.05)piece(g,m.stone,0,y,6.19,12.5,.06,.04);
  piece(g,m.metal,0,3.85,7.05,11,.13,2.2);text(g,siteNames[index][i].toUpperCase(),0,4.35,6.25,11,.63,m);text(g,'OPEN / SCAVENGE INSIDE',0,3.15,6.28,2.7,.33,m);
  if(index===3){piece(g,m.wood,0,-.08,0,16,.16,16);for(const a of [-7.5,7.5])for(const b of [-7.5,7.5])piece(g,m.trunk,a,-.5,b,.22,1.4,.22);paths.push({x,z,w:16,d:16});}
  else {piece(g,m.stone,0,-.04,7.5,16,.08,3);}
  furnish(g,m,(i+index)%4,solid);
  for(const a of [-3.8,3.8]){piece(g,m.lamp,a,4.7,0,1.5,.07,.35);const light=new T.PointLight(0xffd59a,13,11,2);light.position.set(a,3.7,0);g.add(light);lights.push(light);}
  piece(g,m.dark,0,.012,4.5,2.7,.025,2);for(const a of [-1,1])piece(g,m.gold,a,.03,4.5,.05,.02,2);
  const cache=worldPos(3.8,-4.2);sites.push({id:`site${i}`,name:siteNames[index][i],x,z,w:12,d:12,roof,cache,entrance:worldPos(0,7.2)});
 }
 return {root,colliders,sites,roofs,lights,paths,floor};
}
export function withinExpansion(index,x,z,r=.42){
 if(z<-48+r||z>54-r)return false;
 if(index!==3)return Math.abs(x)<13-r||crossings.some(c=>Math.abs(z-c)<9-r&&Math.abs(x)<49-r);
 return Math.abs(x)<3-r||crossings.some(c=>Math.abs(z-c)<2-r&&Math.abs(x)<28)||crossings.some(c=>Math.abs(z-c)<8-r&&Math.abs(Math.abs(x)-28)<8-r);
}
