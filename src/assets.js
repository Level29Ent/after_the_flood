import * as T from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { prepareExpansion,crossings } from './expansion.js';

export const districts = [
 {name:'New Orleans',area:'The French Quarter',tag:'Where the water remembers.',description:'Follow the old jazz route to the cathedral. Restore the evacuation radio before the Quarter goes dark.',landmark:'St. Louis Cathedral',color:0xbb9971,mission:'A voice in the Quarter',job:'Recover relief supplies',weather:'Humid · 28°C'},
 {name:'Houston',area:'Space City',tag:'Nothing left to launch.',description:'Reclaim the space center relay beneath a broken skyline. Salvage the emergency fuel cells.',landmark:'Space Center Houston',color:0x9aabb3,mission:'Failure to launch',job:'Recover fuel cells',weather:'Haze · 34°C'},
 {name:'Los Angeles',area:'The Last Boulevard',tag:'The end of the golden age.',description:'Cross a deserted boulevard toward the observatory. Give the west coast one last signal.',landmark:'Griffith Observatory',color:0xc9a57b,mission:'City of fallen angels',job:'Recover medical kits',weather:'Dry · 31°C'},
 {name:'The Bayou',area:'Blackwater Swamp',tag:'Keep to the boardwalk.',description:'Follow cypress shadows into the flooded marsh. Find the ranger outpost and retrieve its black box.',landmark:'Blackwater Outpost',color:0x718c76,mission:'What the river took',job:'Recover ranger supplies',weather:'Mist · 26°C'}
];
let seed=2718;
const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function tex(kind,color) {
 const c=document.createElement('canvas'); c.width=c.height=512; const x=c.getContext('2d'); x.fillStyle=color;x.fillRect(0,0,512,512);
 for(let i=0;i<21000;i++){const a=rand()*.13;x.fillStyle=rand()>.5?`rgba(255,248,219,${a})`:`rgba(8,13,10,${a})`;const s=rand()*3+1;x.fillRect(rand()*512,rand()*512,s,s);}
 if(kind==='brick'){for(let y=0;y<512;y+=32)for(let xx=-64;xx<512;xx+=96){const v=xx+(y%64?48:0);x.strokeStyle='#55564b';x.lineWidth=3;x.strokeRect(v,y,96,32);x.fillStyle=`rgba(20,16,8,${rand()*.25})`;x.fillRect(v+3,y+3,90,26);}}
 if(kind==='wood'){for(let i=0;i<120;i++){x.strokeStyle=`rgba(20,16,10,${rand()*.16})`;x.beginPath();const yy=rand()*512;x.moveTo(0,yy);x.bezierCurveTo(150,yy+rand()*8,350,yy-4,512,yy);x.stroke();}for(let y=0;y<512;y+=64){x.fillStyle='#282c24';x.fillRect(0,y,512,3);}}
 if(kind==='road'){x.strokeStyle='#303b34';for(let i=0;i<15;i++){let a=rand()*512,b=rand()*512;x.beginPath();x.moveTo(a,b);for(let j=0;j<6;j++){a+=rand()*70-35;b+=rand()*60;x.lineTo(a,b);}x.lineWidth=rand()*2+1;x.stroke();}}
 if(kind==='stucco'||kind==='rust'){for(let i=0;i<130;i++){x.fillStyle=kind==='rust'?`rgba(71,29,8,${rand()*.3})`:`rgba(25,43,31,${rand()*.15})`;x.fillRect(rand()*512,rand()*512,rand()*45,rand()*100);}}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;
}
function canopyMap(){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');for(let i=0;i<1800;i++){const xx=rand()*512,yy=rand()*512;const d=Math.hypot((xx-256)/256,(yy-256)/256);if(d>.96||rand()<d*.25)continue;x.fillStyle=['#75834d','#66783e','#87905a','#54683b'][i%4];x.beginPath();x.ellipse(xx,yy,3+rand()*9,2+rand()*4,rand()*3,0,Math.PI*2);x.fill();}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
export function makeMaterials() {
 const mat=(color,roughness=.8,metalness=0,map=null)=>new T.MeshStandardMaterial({color,roughness,metalness,map,bumpMap:map,bumpScale:map?.045:0});
 const road=tex('road','#50544b'),wall=tex('stucco','#aaa58c'),wood=tex('wood','#6b6852'),brick=tex('brick','#977a63'),rust=tex('rust','#777765');
 return {road:mat(0x979b92,.43,.1,road),stone:mat(0xc2bea6,.94,0,wall),wall:mat(0xb2b59a,.9,0,wall),pink:mat(0xad8c75,.92,0,wall),green:mat(0x88968a,.92,0,wall),brick:mat(0xb3a28d,.96,0,brick),wood:mat(0xaaa384,.92,0,wood),metal:mat(0x3c5149,.58,.72,rust),rust:mat(0x927253,.83,.55,rust),dark:mat(0x1e2925,.76,.2),glass:mat(0x30433c,.2,.5),gold:mat(0xc29957,.38,.65),white:mat(0xdbd3b9,.7),leaf:new T.MeshStandardMaterial({color:0x66794a,roughness:.96,side:T.DoubleSide}),canopy:new T.MeshStandardMaterial({map:canopyMap(),color:0xa5ad7b,roughness:.95,alphaTest:.5,side:T.DoubleSide}),trunk:mat(0x6d6c4c,.96,0,wood),water:mat(0x384e43,.15,.58),red:mat(0x924f38,.7,.2),yellow:mat(0xc8ae70,.85),lamp:new T.MeshStandardMaterial({color:0xf9d38b,emissive:0xffb852,emissiveIntensity:2}),blue:new T.MeshStandardMaterial({color:0x94b5ad,emissive:0x507c76,emissiveIntensity:.6})};
}
const boxG=new T.BoxGeometry(1,1,1),cylG=new T.CylinderGeometry(1,1,1,16),sphereG=new T.SphereGeometry(1,24,16);
function mesh(g,m,p,x=0,y=0,z=0,sx=1,sy=1,sz=1){if(m.map){g=g.clone();const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)*Math.max(1,sx/3),uv.getY(i)*Math.max(1,sy/3));}}const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
const box=(p,m,x,y,z,w,h,d)=>mesh(boxG,m,p,x,y,z,w,h,d);
const cyl=(p,m,x,y,z,r,h)=>mesh(cylG,m,p,x,y,z,r,h,r);
function line(p,m,a,b,r=.03){const aa=new T.Vector3(...a),bb=new T.Vector3(...b),v=bb.clone().sub(aa);const o=cyl(p,m,...aa.clone().add(bb).multiplyScalar(.5).toArray(),r,v.length());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
function rounded(p,m,x,y,z,w,h,d,r=.08){return mesh(new RoundedBoxGeometry(w,h,d,2,r),m,p,x,y,z);}
export function sign(p,text,x,y,z,w=4,h=.7,color='#d8cfae',bg='#293e35') {
 const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle=color;ctx.lineWidth=6;ctx.strokeRect(10,10,c.width-20,c.height-20);ctx.font=`600 ${Math.round(c.height*.48)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,c.width/2,c.height/2,c.width*.94);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:t,roughness:.9}),p,x,y,z);
}
function windowUnit(p,m,x,y,z,shutters=true){
 box(p,m.stone,x,y,z,1.55,2.3,.16);box(p,m.glass,x,y,z+.1,1.25,2,.08);
 for(let j=-1;j<=1;j++)box(p,m.wood,x+j*.42,y,z+.16,.045,2,.045);box(p,m.wood,x,y,z+.16,1.3,.045,.045);
 box(p,m.stone,x,y-1.16,z+.15,1.8,.18,.4);box(p,m.stone,x,y+1.16,z+.1,1.8,.15,.3);
 if(shutters)for(const s of [-1,1]){box(p,m.metal,x+s*1.03,y,z+.12,.58,2.2,.12);for(let yy=-.9;yy<1;yy+=.16)box(p,m.dark,x+s*1.03,y+yy,z+.21,.5,.04,.04);}
}
function building(p,m,x,z,width=10,depth=10,fl=2,col=0){
 const g=new T.Group();g.position.set(x,0,z);g.rotation.y=x<0?Math.PI/2:-Math.PI/2;p.add(g);const height=fl*3.65+1.3,front=depth/2;
 rounded(g,[m.wall,m.pink,m.green,m.brick][col%4],0,height/2,0,width,height,depth,.13);
 box(g,m.stone,0,.35,0,width+.25,.7,depth+.25);box(g,m.stone,0,height,0,width+.5,.3,depth+.5);box(g,m.dark,0,height+.2,0,width+.12,.12,depth+.12);box(g,m.stone,0,height+.5,front-.15,width+.25,.6,.3);
 for(let j=0;j<=fl;j++)box(g,m.stone,0,j*3.65+.8,front+.1,width+.3,.18,.28);
 for(let a=-1;a<=1;a++) {const xx=a*width*.29;
  for(let j=0;j<fl;j++)windowUnit(g,m,xx,2.2+j*3.65,front+.08,true);
 }
 for(let j=1;j<fl;j++){
 const y=j*3.65+.7;box(g,m.dark,0,y,front+.95,width+.3,.18,2.1);box(g,m.metal,0,y+1.15,front+1.9,width+.35,.07,.08);
 for(let a=-width/2;a<=width/2;a+=.42){line(g,m.metal,[a,y,front+1.9],[a,y+1.15,front+1.9],.028);const tor=mesh(new T.TorusGeometry(.13,.018,5,12),m.metal,g,a,y+.62,front+1.91);tor.scale.y=1.5;}
 for(const a of [-width/2,width/2]){line(g,m.metal,[a,0,front+1.85],[a,height-1,front+1.85],.065);box(g,m.metal,a,y+1.15,front+.95,.07,.07,1.95);}
 }
 const awning=box(g,m.wood,0,3.6,front+.9,width*.8,.12,1.9);awning.rotation.x=.14;
 sign(g,['MAISON ROUSSEAU','LAST LIGHT SUPPLY','BAYOU RECORDS','THE SAINT HOTEL','RIVER & RYE','EVACUATION OFFICE'][col%6],0,3.13,front+1.2,width*.76,.58);
 box(g,m.dark,0,1.1,front+.17,1.2,2.1,.1);box(g,m.gold,.4,1.1,front+.25,.05,.05,.05);
 for(const a of [-width/2+.15,width/2-.15])box(g,m.stone,a,height/2,front+.12,.28,height,.25);
 return {x,z,w:depth,d:width,h:height};
}
function lamp(p,m,x,z){cyl(p,m.dark,x,2.45,z,.09,4.9);cyl(p,m.dark,x,.2,z,.2,.4);line(p,m.dark,[x,4.9,z],[x+.65,5.1,z],.065);box(p,m.dark,x+.65,5,z,.5,.1,.5);box(p,m.lamp,x+.65,4.72,z,.28,.45,.28);mesh(new T.ConeGeometry(.4,.25,4),m.dark,p,x+.65,5.15,z);}
function car(p,m,x,z,rot=0){const g=new T.Group();g.position.set(x,.1,z);g.rotation.y=rot;p.add(g);rounded(g,m.rust,0,.6,0,1.95,.8,4.3,.17);rounded(g,m.dark,0,1.25,-.12,1.65,.8,2.1,.18);box(g,m.glass,0,1.3,1.02,1.5,.5,.07);box(g,m.glass,0,1.3,-1.2,1.5,.5,.07);for(const a of [-1,1]){box(g,m.glass,a*.84,1.33,-.1,.045,.5,1.8);for(const b of [-1.3,1.3]){const tire=cyl(g,m.dark,a*.98,.4,b,.39,.25);tire.rotation.z=Math.PI/2;const hub=cyl(g,m.metal,a*1.12,.4,b,.22,.02);hub.rotation.z=Math.PI/2;}box(g,m.lamp,a*.65,.65,2.18,.32,.2,.04);}box(g,m.metal,0,.4,2.2,1.8,.16,.13);return {x,z,w:2.2,d:4.6,h:1.8};}
function foliageCluster(p,m,x,y,z,w=4,h=3){const g=new T.Group();g.position.set(x,y,z);p.add(g);for(let i=0;i<5;i++){const leaf=mesh(new T.PlaneGeometry(w,h,2,2),m.canopy,g,(rand()-.5)*.6,(rand()-.5)*.7,(rand()-.5)*.6);leaf.rotation.y=i*Math.PI/5;leaf.rotation.z=(rand()-.5)*.3;}return g;}
function palm(p,m,x,z,scale=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);p.add(g);const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(.3,4,0),new T.Vector3(1,8,0)]);mesh(new T.TubeGeometry(curve,16,.22,10,false),m.trunk,g);for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const c=new T.CatmullRomCurve3([new T.Vector3(1,8,0),new T.Vector3(1+Math.cos(a)*2,8.5,Math.sin(a)*2),new T.Vector3(1+Math.cos(a)*4,6.8,Math.sin(a)*4)]);const leaf=mesh(new T.TubeGeometry(c,10,.13,5,false),m.leaf,g);leaf.scale.y=1;for(let j=0;j<6;j++){const q=c.getPoint(.3+j*.1);line(g,m.leaf,q.toArray(),[q.x+Math.cos(a+1)*1.1,q.y-.4,q.z+Math.sin(a+1)*1.1],.035);for(const side of [-1,1]){const tip=q.clone().add(new T.Vector3(Math.cos(a+side*1.2)*1.15,-.38,Math.sin(a+side*1.2)*1.15));const mid=q.clone().lerp(tip,.5).add(new T.Vector3(Math.cos(a)*.17,.08,Math.sin(a)*.17));const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([...q.toArray(),...mid.toArray(),...tip.toArray()],3));geo.setAttribute('uv',new T.Float32BufferAttribute([0,0,.5,1,1,0],2));geo.computeVertexNormals();mesh(geo,m.leaf,g);}}}}
function cypress(p,m,x,z,s=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);p.add(g);cyl(g,m.trunk,0,3.6,0,.42,7.2);for(let i=0;i<8;i++){const a=i*.785;line(g,m.trunk,[Math.cos(a)*1.2,0,Math.sin(a)*1.2],[0,1.8,0],.16);line(g,m.trunk,[0,4.8,0],[Math.cos(a)*2.1,7.3+rand(),Math.sin(a)*2.1],.13);const leaf=foliageCluster(g,m,Math.cos(a)*1.7,7.3+rand()*.8,Math.sin(a)*1.7,4.2,3.1);for(let j=0;j<3;j++)line(g,m.wood,[leaf.position.x+j*.22,7,leaf.position.z],[leaf.position.x+j*.22,5.4-rand(),leaf.position.z],.027);}}
function cathedral(p,m){const g=new T.Group();g.position.set(0,0,-61);p.add(g);rounded(g,m.white,0,6,0,19,12,12,.13);box(g,m.stone,0,.4,6.8,24,.8,4);box(g,m.stone,0,.15,8,26,.3,5);const roof=mesh(new T.CylinderGeometry(0,8,5,4),m.dark,g,0,14.5,0);roof.rotation.y=Math.PI/4;roof.scale.z=.8;
 for(const a of [-7,0,7]){const h=a===0?22:16;cyl(g,m.white,a,h/2,5,1.7,h);box(g,m.white,a,h/2,5,3,h,3);cyl(g,m.stone,a,h-.1,5,2,.3);mesh(new T.ConeGeometry(2.1,7,32),m.dark,g,a,h+3.4,5);line(g,m.gold,[a,h+6.8,5],[a,h+8.3,5],.05);line(g,m.gold,[a-.55,h+7.7,5],[a+.55,h+7.7,5],.04);windowUnit(g,m,a,7,6.62,false);}
 for(const a of [-4,0,4]){box(g,m.wood,a,2,6.15,2.1,4,.12);const arc=mesh(new T.TorusGeometry(1.2,.13,8,24,Math.PI),m.stone,g,a,3.5,6.2);box(g,m.stone,a-1.2,1.8,6.3,.2,3.5,.2);box(g,m.stone,a+1.2,1.8,6.3,.2,3.5,.2);}
 const clock=mesh(new T.CircleGeometry(.85,32),m.white,g,0,18,6.65);line(g,m.dark,[-.03,18,6.7],[.4,18.3,6.7],.035);line(g,m.dark,[-.03,18,6.7],[-.03,18.65,6.7],.03);sign(g,'ST. LOUIS · RELIEF STATION',0,10.8,6.3,9,.65);
}
function observatory(p,m){const g=new T.Group();g.position.set(0,0,-56);p.add(g);rounded(g,m.white,0,3,0,28,6,12,.2);box(g,m.stone,0,.2,7,31,.4,6);for(const a of [-10,0,10]){cyl(g,m.white,a,5,0,a===0?5:3,5);mesh(new T.SphereGeometry(a===0?5:3,32,20,0,Math.PI*2,0,Math.PI/2),m.metal,g,a,7.5,0);cyl(g,m.gold,a,7.6,0,a===0?5.1:3.1,.18);}for(let a=-12;a<=12;a+=3)windowUnit(g,m,a,2.9,6.12,false);sign(g,'GRIFFITH OBSERVATORY',0,5.6,6.2,12,.7);}
function rocket(p,m){const g=new T.Group();g.position.set(0,0,-72);p.add(g);cyl(g,m.white,0,12,0,1.4,24);cyl(g,m.dark,0,7,0,1.43,2);cyl(g,m.dark,0,19,0,1.42,.9);mesh(new T.ConeGeometry(1.4,5,32),m.white,g,0,26.5,0);for(const a of [-1,1]){const f=box(g,m.white,a*2,2,0,1.3,4,.25);f.rotation.z=-a*.25;}for(let j=0;j<3;j++)cyl(g,m.rust,(j-1)*.8,.5,0,.4,1);const s=sign(g,'UNITED STATES',0,13,1.43,1.3,8);sign(p,'SPACE CENTER HOUSTON',-22,2,-21,13,1.1);}
function mergeStatic(root){root.updateMatrixWorld(true);const groups=new Map(),remove=[];root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&!o.userData.dynamic){const key=o.material.uuid;if(!groups.has(key))groups.set(key,{material:o.material,geos:[]});const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);if(geo.index)groups.get(key).geos.push(geo.toNonIndexed());else groups.get(key).geos.push(geo);remove.push(o);}});for(const o of remove)o.removeFromParent();for(const {material,geos} of groups.values()){const g=mergeGeometries(geos);if(g){const mm=new T.Mesh(g,material);mm.castShadow=mm.receiveShadow=true;root.add(mm);}for(const gg of geos)gg.dispose();}}

export function buildDistrict(index,m) {
 seed=18371+index*171;const root=new T.Group(),colliders=[],waters=[];root.name=`district-${index}`;
 box(root,index===3?m.trunk:m.road,0,-.25,0,170,.5,190);
 if(index!==3){
  for(const s of [-1,1]){box(root,m.stone,s*11,.08,-4,5,.17,114);box(root,m.dark,s*8.4,.035,-4,.18,.07,114);}
  for(let z=-50;z<53;z+=8)for(const s of [-1,1])box(root,m.yellow,s*.15,.009,z,.1,.014,3.5);
  for(let z=-42;z<=46;z+=16)for(const s of [-1,1])lamp(root,m,s*8,z);
  if(index===0){for(let i=0;i<7;i++)for(const s of [-1,1]){if(crossings.some(z=>Math.abs(42-i*14-z)<13))continue;colliders.push(building(root,m,s*(18+(i%3)*.5),42-i*14,12.5,12,2+(i%3===0?1:0),i+(s>0?2:0)));}cathedral(root,m);colliders.push({x:0,z:-61,w:22,d:16,h:25});
   mesh(new T.SphereGeometry(22,40,20,0,Math.PI*2,0,Math.PI/2),m.metal,root,-65,8,-90,1,.5,1);cyl(root,m.stone,-65,3,-90,22,6);
  } else if(index===1){
   for(let i=0;i<6;i++)for(const s of [-1,1]){const x=s*(22+(i%2)*6),z=40-i*20,h=14+rand()*28,w=13;if(crossings.some(c=>Math.abs(z-c)<13))continue;rounded(root,m.dark,x,h/2,z,w,h,14,.22);box(root,m.glass,x,h/2,z+7.1,w-.6,h-.8,.09);for(let y=1;y<h;y+=1.8)box(root,m.metal,x,y,z+7.19,w,.09,.09);for(let a=-5;a<6;a+=1.8)box(root,m.metal,x+a,h/2,z+7.2,.09,h,.09);box(root,m.stone,x,1,z+7.5,w,2,1);box(root,m.glass,x-s*6.54,h/2,z,.06,h-.8,13.5);for(let y=1;y<h;y+=1.8)box(root,m.metal,x-s*6.6,y,z,.1,.09,14);for(let a=-6;a<=6;a+=1.8)box(root,m.metal,x-s*6.6,h/2,z+a,.1,h,.09);for(let a=-4;a<=4;a+=2.6){const lit=box(root,m.gold,x-s*6.66,3.2,z+a,.04,1.2,1.7);box(root,m.dark,x-s*6.7,2.5,z+a,.1,.14,1.9);}colliders.push({x,z,w,d:14,h});}rocket(root,m);colliders.push({x:0,z:-72,w:7,d:7,h:30});
   sign(root,'HOUSTON · EMERGENCY CORRIDOR',0,6,-52,13,1);line(root,m.metal,[-9,0,-52],[-9,7,-52],.1);line(root,m.metal,[9,0,-52],[9,7,-52],.1);line(root,m.metal,[-9,7,-52],[9,7,-52],.1);
  } else {for(let i=0;i<5;i++)for(const s of [-1,1]){if(!crossings.some(z=>Math.abs(40-i*20-z)<14))colliders.push(building(root,m,s*20,40-i*20,16,13,2,i+2));palm(root,m,s*10,40-i*20,1+rand()*.2);}observatory(root,m);colliders.push({x:0,z:-56,w:30,d:15,h:12});
   const hill=mesh(new T.SphereGeometry(1,40,20),m.trunk,root,0,0,-108,65,21,32);sign(root,'H O L L Y W O O D',0,19,-88,44,5,'#e9e7d6','#68705a');
  }
  for(let i=0;i<7;i++){const s=i%2?1:-1;colliders.push(car(root,m,s*(4+rand()*3),37-i*14,rand()*.45-.22));}
  for(let i=0;i<95;i++){const x=(rand()-.5)*24,z=rand()*112-52;if(Math.abs(x)<1.5)continue;const a=box(root,i%2?m.stone:m.brick,x,.08,z,.1+rand()*.35,.1+rand()*.17,.1+rand()*.3);a.rotation.y=rand()*3;}
  for(const s of [-1,1])for(let z=-40;z<50;z+=22){rounded(root,m.metal,s*7.7,.5,z,.7,1,.7,.08);box(root,m.dark,s*7.7,1.03,z,.75,.08,.75);}
  for(let i=0;i<9;i++){const x=(rand()-.5)*14,z=rand()*95-40;const p=mesh(new T.CircleGeometry(1,32),m.water,root,x,.018,z,rand()*2+1,rand()*3+1,1);p.rotation.x=-Math.PI/2;}
 } else {
  box(root,m.water,0,-.025,0,166,.05,185);waters.push(root.children[root.children.length-1]);
  for(let z=-64;z<=55;z+=1.1){box(root,m.wood,0,.12,z,6,.26,1.02);for(const s of [-1,1]){box(root,m.metal,s*2.9,.55,z,.06,.04,1.04);if(Math.round(z)%5===0)cyl(root,m.trunk,s*2.85,.15,z,.13,1.8);}}
  for(let i=0;i<60;i++){const x=(i%2?1:-1)*(7+rand()*55),z=rand()*160-85;if(crossings.some(c=>Math.abs(z-c)<10&&Math.abs(x)<38))continue;cypress(root,m,x,z,.8+rand()*.8);}
  for(let i=0;i<160;i++){const x=(rand()-.5)*145,z=rand()*150-80;if(Math.abs(x)<5)continue;for(let j=0;j<3;j++)line(root,m.leaf,[x+j*.12,0,z],[x+j*.15,.8+rand()*.7,z+.1],.025);}
  const h=new T.Group();h.position.set(0,.25,-51);root.add(h);box(h,m.wood,0,1.7,0,11,3.4,8);const roof=mesh(new T.CylinderGeometry(0,8,3,4),m.dark,h,0,4.6,0);roof.rotation.y=Math.PI/4;roof.scale.z=.75;for(const a of [-3,3])windowUnit(h,m,a,1.7,4.1,false);sign(h,'BLACKWATER RANGER OUTPOST',0,3.3,4.2,9,.6);box(h,m.dark,0,1,4.13,1.4,2,.08);colliders.push({x:0,z:-51,w:11,d:8,h:6});for(let z=-40;z<50;z+=19)lamp(root,m,-3.4,z);
 }
 // Relief station and a yellow evacuation line provide a readable start landmark.
 const station=new T.Group();const stationX=index===3?2:6;station.position.set(stationX,0,43);root.add(station);box(station,m.wood,0,.7,0,2.5,1.4,1);box(station,m.metal,0,1.45,0,2.7,.12,1.2);sign(station,'RELIEF / WORKBENCH',0,1.9,.52,3.2,.45);box(station,m.red,-.75,1.65,0,.4,.35,.3);box(station,m.metal,.6,1.65,0,.6,.35,.4);
 const expansion=prepareExpansion(index,m);root.add(expansion.root);colliders.push(...expansion.colliders);
 for(const z of crossings){sign(root,index===3?'LODGE ← / BOATHOUSE →':'LOCAL SUPPLIES ← / RELIEF →',0,5.4,z,8,.6);for(const x of [-10,10])if(index!==3)lamp(root,m,x,z+6);}
 mergeStatic(root);
 const interact=[];
 const createCache=(id,x,z,type='cache')=>{
  const g=new T.Group();g.position.set(x,.35,z);root.add(g);rounded(g,type==='radio'?m.metal:m.wood,0,.25,0,type==='radio'?1:.9,.65,.65,.06);for(const a of [-.32,.32])box(g,m.gold,a,.25,0,.08,.7,.68);if(type==='radio'){line(g,m.metal,[.2,.55,0],[.2,2.1,0],.025);box(g,m.blue,0,.33,.34,.5,.23,.03);}else {sign(g,'RELIEF',0,.3,.335,.6,.2);box(g,m.gold,0,.62,0,.15,.02,.15);} const marker=mesh(new T.OctahedronGeometry(.13,0),m.gold,g,0,1.5,0);marker.userData.dynamic=true;
  interact.push({id,type,group:g,marker,x,z,used:false});
 };
 createCache('radio',index===3?1:4,index===3?-44:-43,'radio');
 [[-3,28],[5,9],[-6,-13],[4,-29],[-5,44],[7,24]].forEach(([x,z],i)=>createCache(`cache${i}`,index===3?x*.32:x,z));
 expansion.sites.forEach(site=>createCache(`${site.id}-cache`,site.cache.x,site.cache.z));
 const beamMat=new T.MeshBasicMaterial({color:0xdcb769,transparent:true,opacity:.11,depthWrite:false,side:T.DoubleSide});const beam=mesh(new T.CylinderGeometry(.55,.55,18,24,1,true),beamMat,root,0,9,47);beam.castShadow=false;
 const ring=mesh(new T.TorusGeometry(2,.04,8,64),m.gold,root,0,.06,47);ring.rotation.x=Math.PI/2;
 interact.push({id:'extract',type:'extract',x:0,z:47,group:beam,marker:ring});interact.push({id:'bench',type:'bench',x:stationX,z:43,group:station});
 return {root,colliders,interact,waters,index,sites:expansion.sites,paths:expansion.paths};
}
export function rifle(m){const g=new T.Group();rounded(g,m.dark,0,0,0,.12,.17,.48,.025);box(g,m.wood,0,-.015,-.31,.11,.12,.25);box(g,m.metal,0,.01,.36,.045,.045,.38);box(g,m.dark,0,.1,-.02,.06,.05,.18);const mag=box(g,m.dark,0,-.17,.01,.09,.2,.1);mag.rotation.x=.15;box(g,m.dark,0,-.12,-.18,.06,.18,.09);for(let i=0;i<6;i++)box(g,m.metal,0,.08,.08+i*.025,.13,.025,.012);return g;}
export async function loadCharacters(onProgress=()=>{}) {
 const loader=new FBXLoader(); const files=['survivor','infected','idle','run','zombie_walk','shoot','attack'];const loaded={};let n=0;
 await Promise.all(files.map(async f=>{loaded[f]=await loader.loadAsync(`./models/${f}.fbx`);onProgress(++n/files.length);}));
 for(const name of ['survivor','infected']){
  loaded[name].traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;const conv=m=>{const material=new T.MeshStandardMaterial({map:m.map,color:m.color,roughness:.85,metalness:.04,side:T.FrontSide});if(material.map)material.map.colorSpace=T.SRGBColorSpace;return material;};o.material=Array.isArray(o.material)?o.material.map(conv):conv(o.material);}});
 }
 function make(name){
  const model=clone(loaded[name]),group=new T.Group();const bounds=new T.Box3().setFromObject(model),height=bounds.getSize(new T.Vector3()).y;const sc=1.83/height;model.scale.setScalar(sc);model.position.y=-bounds.min.y*sc;group.add(model);const mixer=new T.AnimationMixer(model);const actions={};const hip=model.getObjectByName('mixamorigHips');
  for(const f of (name==='survivor'?['idle','run','shoot']:['zombie_walk','attack'])){
   const clip=loaded[f].animations[0].clone();clip.name=f;const sourceHip=loaded[f].getObjectByName('mixamorigHips');const ratio=hip.position.y/sourceHip.position.y;
   clip.tracks=clip.tracks.filter(t=>model.getObjectByName(t.name.split('.')[0]));
   for(const track of clip.tracks){if(track.name.endsWith('.position'))for(let i=0;i<track.values.length;i+=3){track.values[i]=hip.position.x;track.values[i+1]*=ratio;track.values[i+2]=hip.position.z;}}
   actions[f]=mixer.clipAction(clip);
  }
  let current=null;const set=(key)=>{if(current===key)return;if(current)actions[current].fadeOut(.16);actions[key].reset().fadeIn(.16).play();current=key;};set(name==='survivor'?'idle':'zombie_walk');mixer.update(.01);
  return {group,model,mixer,actions,set,height,hip};
 }
 return {make,loaded};
}

export function atmosphere(scene,renderer){
 const skyGeo=new T.SphereGeometry(1,40,24);const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sunDir:{value:new T.Vector3(-.55,.22,-.8).normalize()},top:{value:new T.Color('#3b6365')},horizon:{value:new T.Color('#d4b58b')}},vertexShader:'varying vec3 vD; void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vD; uniform vec3 sunDir; uniform vec3 top; uniform vec3 horizon; void main(){vec3 d=normalize(vD);float h=pow(max(d.y,0.),.48);vec3 col=mix(horizon,top,h);float sun=max(dot(d,sunDir),0.);col+=vec3(1.,.53,.16)*pow(sun,80.)*.35;col+=vec3(1.,.82,.5)*smoothstep(.9994,.9998,sun)*2.;float cloud=sin(d.x*21.+sin(d.z*17.))*sin(d.z*28.+d.y*12.);col=mix(col,vec3(.72,.69,.55),smoothstep(.3,.9,cloud)*.17*(1.-h));gl_FragColor=vec4(col,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}',});
 // Keep shader directives on new lines for WebGL compilation.
 skyMat.fragmentShader=skyMat.fragmentShader.replace(';#include',';\n#include').replace('<colorspace_fragment>}','<colorspace_fragment>\n}');
 const sky=new T.Mesh(skyGeo,skyMat);sky.scale.setScalar(450);scene.add(sky);
 const envScene=new T.Scene();const envSky=new T.Mesh(skyGeo,skyMat);envSky.scale.setScalar(20);envScene.add(envSky);const pm=new T.PMREMGenerator(renderer);const env=pm.fromScene(envScene,.025,.1,100);scene.environment=env.texture;scene.environmentIntensity=.38;pm.dispose();
 const hemi=new T.HemisphereLight(0xd6ddd1,0x555a3a,1.55);scene.add(hemi);const sun=new T.DirectionalLight(0xffd8a3,3.2);sun.position.set(-35,45,-60);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-45,right:45,top:50,bottom:-50,near:1,far:160});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun);scene.add(sun.target);return {sun,hemi,sky,env};
}
