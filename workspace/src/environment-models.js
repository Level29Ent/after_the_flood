import * as T from 'three';

// All meshes are owned by the caller's geometry/material lifecycle.
export function createEnvironmentModels({box,material,geometry}) {
  const m={wood:material('#77664d'),metal:material('#425752',{metalness:.65}),stone:material('#8e9686'),dark:material('#202d2d'),glass:material('#476c70',{metalness:.4,roughness:.2}),tarp:material('#718878',{side:T.DoubleSide}),gold:material('#e0ae58'),red:material('#a65343'),white:material('#d0cfb8'),leaf:material('#6e8856'),blue:material('#315d78'),lamp:material('#f3d09a',{emissive:'#f6b96f',emissiveIntensity:1.1})};
  function group(parent,name,x=0,y=0,z=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
  function cylinder(parent,x,y,z,r,h,mat=m.metal,segments=12){const geo=new T.CylinderGeometry(r,r,h,segments);geometry(geo);const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function rail(parent,x,z,w,y=1){box(parent,x,y,z,w,.08,.08,m.metal);for(let xx=x-w/2;xx<=x+w/2;xx+=.65)box(parent,xx,y/2,z,.055,y,.055,m.metal);}
  function label(parent,text,x,y,z,w=2.5){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#243c34';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#d5b778';ctx.strokeRect(5,5,502,86);ctx.fillStyle='#e9dfc3';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,60,490);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const mat=material('#ffffff',{map});const geo=new T.PlaneGeometry(w,w*96/512);geometry(geo);const o=new T.Mesh(geo,mat);o.position.set(x,y,z);parent.add(o);return o;}
  function crate(parent,x,y,z){const g=group(parent,'salvage-chest',x,y,z);box(g,0,.35,0,.85,.7,.65,m.wood);for(const xx of [-.3,.3])box(g,xx,.35,.34,.07,.7,.04,m.gold);box(g,0,.7,0,.9,.06,.7,m.metal);return g;}
  function stairs(parent,x,z,base=0){const g=group(parent,'connected-staircase',x,base,z);for(let flight=0;flight<2;flight++){const side=flight?1:-1;for(let n=0;n<12;n++){const y=flight*3+(n+1)*.25;box(g,side*.72,y-.125,(flight?-1:1)*(n*.25-1.4),1.3,.25,.3,m.stone);}box(g,0,3,1.5,2.8,.18,.8,m.stone);}return g;}
  function tower(parent,x,z,district){const g=group(parent,'completed-exploration-tower',x,0,z);const shell=group(g,'tower-cutaway-shell');
    // Rear and side walls, framed windows, a real foundation and parapet, not floating slabs.
    box(g,0,.12,-2,6.4,.24,6.4,m.stone);
    for(const side of [-1,1]){box(shell,side*3,9,-2,.22,18,6.2,district===1?m.metal:m.stone);box(shell,side*2.95,9,-2,.08,16,4,m.glass);}
    box(shell,0,9,-5,6.2,18,.25,m.stone);
    for(let level=1;level<=3;level++){const y=level*6;box(g,0,y,-2,6.2,.25,6.2,m.stone);box(g,0,y-.3,-5,6.3,.3,.4,m.metal);stairs(g,0,-2,y-6);rail(g,0,-4.7,5.5,y+1);for(const xx of [-2.8,2.8])box(g,xx,y-3,-4.8,.3,6,.3,m.metal);crate(g,-2,y+.13,-3.7);box(g,2,y+1,-4,.7,1.7,.4,m.metal);box(g,2,y+1,-3.77,.45,.25,.03,m.lamp);}
    for(let level=0;level<3;level++)for(const xx of [-1.8,0,1.8]){box(shell,xx,level*6+3,-4.84,1.2,2.5,.08,m.glass);box(shell,xx,level*6+1.7,-4.7,1.4,.12,.3,m.white);}
    box(g,0,19,-5.05,6.4,1.7,.25,m.stone);box(g,-3,19,-2,.25,1.7,6.2,m.stone);box(g,3,19,-2,.25,1.7,6.2,m.stone);
    cylinder(g,1.9,20,-3,.06,4,m.metal);box(g,1.9,21,-3,2,.05,.08,m.metal);box(g,1.9,20,-3,1.3,.05,.08,m.metal);box(g,0,18.3,-4,1.8,.2,1,m.blue);
    // Front is a deliberate camera cutaway above the open entrance.
    for(const xx of [-2.6,2.6])box(g,xx,3,.85,.7,6,.3,m.stone);label(g,district===1?'HOUSTON / RELAY TOWER':'HOTEL / ROOFTOP RELAY',0,4.8,1.03,5);label(g,'STAIRS / USE E',0,2.8,1.05,2.3);
    g.userData.floorHeights=[6.2,12.2,18.2];return {group:g,shell};
  }
  function camp(parent,x,z){const g=group(parent,'high-ground-camp',x,0,z);for(let xx=-5;xx<=5;xx+=.5)box(g,xx,2,0,.46,.22,9,m.wood);for(const xx of [-4.7,4.7])for(const zz of [-4,4])box(g,xx,.9,zz,.25,2.1,.25,m.wood);rail(g,0,-4.3,10,3.1);for(let n=0;n<8;n++)box(g,0,(n+1)*.25,5.9-n*.25,2,.25,.3,m.wood);label(g,'HIGH GROUND / RELIEF CAMP',0,3.8,-4.2,5);return g;}
  function station(parent,id,x,z,level){const g=group(parent,`station-${id}`,x,2.15,z);g.userData.level=level;
    if(id==='collector'){for(const xx of [-.7,.7])box(g,xx,1,0,.08,2,.08,m.wood);const tarp=box(g,0,1.9,0,1.6,.06,1.3,m.tarp);tarp.rotation.z=.17;cylinder(g,.5,.55,0,.35,1,m.blue);}
    if(id==='solar'){const panel=box(g,0,1.2,0,1.7,.1,1.3,m.blue);panel.rotation.x=.4;for(let n=-3;n<=3;n++)box(panel,n*.22,.06,0,.02,.02,1.2,m.white);box(g,0,.55,0,.12,1.1,.12,m.metal);}
    if(id==='medical'){for(const xx of [-.9,.9])box(g,xx,1,0,.08,2,.08,m.wood);const roof=box(g,0,2,0,2.3,.12,1.8,m.tarp);roof.rotation.z=.08;box(g,-.8,1,-.7,.08,1.8,1.4,m.tarp);box(g,0,.5,0,1.5,.2,.7,m.white);box(g,0,1.5,-.73,.6,.16,.04,m.red);box(g,0,1.5,-.72,.16,.6,.04,m.red);}
    if(id==='barricade'){for(let n=0;n<3;n++)box(g,0,.2+n*.3,0,2.1,.25,.45,m.wood);for(const xx of [-.8,.8])box(g,xx,.6,0,.12,1.3,.7,m.metal);}
    if(id==='generator'){box(g,0,.45,0,1,.7,.75,m.red);cylinder(g,.35,.6,0,.25,.6,m.metal);box(g,-.4,.9,0,.12,.7,.12,m.dark);}
    if(id==='bank'){for(const xx of [-.3,.3]){box(g,xx,.3,0,.5,.6,.6,m.dark);box(g,xx,.63,0,.08,.08,.08,m.red);}}
    if(id==='pump'){cylinder(g,0,.6,0,.3,1.2,m.white);box(g,.4,.4,0,.5,.3,.5,m.metal);box(g,0,1.3,0,.8,.08,.08,m.metal);}
    if(id==='fridge'){box(g,0,.9,0,.9,1.8,.75,m.white);box(g,.15,.9,.4,.05,.5,.05,m.dark);box(g,0,1.3,.39,.8,.04,.02,m.dark);}
    if(id==='crops'){box(g,0,.45,0,1.7,.9,1.2,m.wood);box(g,0,.92,0,1.5,.05,1,m.dark);for(const xx of [-.5,0,.5])for(const zz of [-.3,.3]){cylinder(g,xx,1.1,zz,.04,.4,m.leaf);const leaf=box(g,xx,1.25,zz,.35,.07,.22,m.leaf);leaf.rotation.z=.4;}}
    if(id==='fire'){for(const xx of [-.8,.8])box(g,xx,.9,0,.06,1.8,.06,m.wood);box(g,0,1.8,0,2,.08,1.5,m.tarp);for(const zz of [-.2,.2])box(g,0,.15,zz,.7,.15,.12,m.wood);cylinder(g,0,.4,0,.18,.5,m.lamp);}
    label(g,`${id.toUpperCase()} / ${level}`,0,1.65,.65,1.4);return g;
  }
  function boat(parent,id='skiff',modules=0){const g=group(parent,`vessel-${id}`);box(g,0,0,0,1.8,.25,3.8,m.wood);
    if(id==='raft'){for(const xx of [-.85,.85])for(const zz of [-1.2,0,1.2]){const barrel=cylinder(g,xx,-.2,zz,.33,.8,m.blue);barrel.rotation.x=Math.PI/2;}for(let n=0;n<9;n++)box(g,0,.18,-1.7+n*.4,1.9,.08,.28,m.wood);if(modules>=1)crate(g,0,.25,1);if(modules>=2){box(g,0,.3,0,.6,.15,.6,m.stone);cylinder(g,0,.55,0,.15,.4,m.lamp);}if(modules>=3)for(const xx of [-.6,.6])box(g,xx,.45,-1.2,.35,.55,.7,m.wood);}
    else{for(const xx of [-.9,.9])box(g,xx,.35,0,.12,.7,3.8,m.metal);box(g,0,.3,-1.9,1.8,.65,.1,m.metal);const bow=box(g,0,.3,1.8,1.8,.65,.15,m.metal);bow.rotation.x=-.2;for(const zz of [-.8,.8])box(g,0,.4,zz,1.65,.15,.4,m.wood);box(g,0,.5,-2.1,.5,.7,.4,m.dark);
      if(id==='airboat'){const cage=group(g,'fan-cage',0,1.2,-1.5);const geo=new T.TorusGeometry(.85,.04,6,24);geometry(geo);cage.add(new T.Mesh(geo,m.metal));for(const a of [0,Math.PI/2,Math.PI/4,-Math.PI/4]){const bar=box(cage,0,0,0,.06,1.7,.06,m.metal);bar.rotation.z=a;}box(cage,0,0,0,1.2,.1,.1,m.wood);}
      if(id==='patrol'){box(g,0,1,0,1.3,1.2,1.4,m.white);box(g,0,1.3,.73,1.2,.5,.06,m.glass);box(g,0,1.7,0,1.5,.12,1.5,m.metal);cylinder(g,0,2.2,-.3,.035,1.1,m.metal);box(g,0,1.85,0,.35,.12,.2,m.blue);}}
    return g;
  }
  function tunnel(parent){const g=group(parent,'finished-transit-interior');box(g,0,-2.2,-4,6,.3,84,m.stone);for(const xx of [-3,3])box(g,xx,-.25,-4,.3,4,84,m.stone);box(g,0,1.65,-4,6,.3,84,m.dark);for(const zz of [-46,38])box(g,0,-.3,zz,6,4,.3,m.stone);
    for(let z=-42;z<38;z+=6){for(const xx of [-2.7,2.7])box(g,xx,-.3,z,.2,3.7,.35,m.metal);box(g,0,1.45,z,5.5,.18,.3,m.metal);box(g,-2.65,.8,z,.3,.2,.6,m.lamp);cylinder(g,2.65,.7,z,.12,4,m.metal);}
    for(const xx of [-1.4,1.4])box(g,xx,-2,-4,.08,.1,80,m.metal);for(let z=-42;z<36;z+=1)box(g,0,-2.02,z,3,.08,.12,m.wood);
    const flood=box(g,0,-.8,-4,5.7,.04,83,material('#264e48',{transparent:true,opacity:.35,depthWrite:false}));flood.castShadow=false;label(g,'TRANSIT / SURFACE ACCESS',0,.1,-45.8,4);label(g,'SUBMERGED CHOKE / WATCH OXYGEN',0,.4,-14,4);const light=new T.HemisphereLight('#91b9a9','#132421',1.4);g.add(light);return g;
  }
  return {m,group,cylinder,label,rail,crate,tower,camp,station,boat,tunnel};
}
