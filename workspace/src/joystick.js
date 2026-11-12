export function joystickVector(dx,dy,radius=48,deadzone=.12){const length=Math.hypot(dx,dy),raw=Math.min(1,length/radius);if(raw<=deadzone)return {x:0,y:0};const strength=(raw-deadzone)/(1-deadzone);return {x:dx/length*strength,y:dy/length*strength};}
export function bindJoystick(element,{listen,onChange,enabled=()=>true}){let pointer=null,center=null;const knob=element.querySelector('.joystick-knob');
 const reset=()=>{pointer=null;center=null;knob.style.transform='translate(0px,0px)';onChange({x:0,y:0});};
 const update=e=>{if(e.pointerId!==pointer)return;const vector=joystickVector(e.clientX-center.x,e.clientY-center.y);knob.style.transform=`translate(${vector.x*40}px,${vector.y*40}px)`;onChange(vector);};
 listen(element,'pointerdown',e=>{if(pointer!==null||!enabled())return;e.preventDefault();pointer=e.pointerId;const bounds=element.getBoundingClientRect();center={x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2};element.setPointerCapture(pointer);update(e);});
 listen(element,'pointermove',update);for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(element,type,e=>{if(e.pointerId===pointer)reset();});return {reset};
}
