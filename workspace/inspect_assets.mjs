import fs from 'node:fs';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { TextureLoader, Texture, Box3, Vector3 } from 'three';
globalThis.window = { URL: globalThis.URL };
TextureLoader.prototype.load = function () { return new Texture(); };
const report = {};
for (const name of ['survivor','infected','idle','run','zombie_walk']) {
  const b = fs.readFileSync(`public/models/${name}.fbx`);
  const obj = new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  obj.updateMatrixWorld(true);
  const bones=[], meshes=[];
  obj.traverse(n=>{ if(n.isBone) bones.push({name:n.name,parent:n.parent?.name,position:n.position.toArray()}); if(n.isSkinnedMesh){ const w=n.geometry.attributes.skinWeight; let invalid=0; for(let i=0;i<w.count;i++){const sum=w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i); if(!Number.isFinite(sum)||Math.abs(sum-1)>.05)invalid++;} meshes.push({name:n.name,vertices:n.geometry.attributes.position.count,bones:n.skeleton.bones.length,invalidWeights:invalid,materials:(Array.isArray(n.material)?n.material:[n.material]).map(m=>({name:m.name,map:!!m.map}))}); }});
  report[name]={bytes:b.length,size:new Box3().setFromObject(obj).getSize(new Vector3()).toArray(),boneCount:bones.length,keyHierarchy:bones.filter(b=>/Hips|Spine|LeftUpLeg|LeftLeg|LeftFoot|LeftShoulder|LeftArm|LeftForeArm|LeftHand$/.test(b.name)),meshes,animations:obj.animations.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.length,firstTracks:a.tracks.slice(0,5).map(t=>t.name)}))};
}
fs.writeFileSync('asset-inspection.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k,v])=>[k,{bytes:v.bytes,size:v.size,boneCount:v.boneCount,meshes:v.meshes,animations:v.animations}])) ,null,2));
