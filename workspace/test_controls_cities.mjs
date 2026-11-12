import assert from 'node:assert/strict';
import {joystickVector,bindJoystick} from './src/joystick.js';
import {cityContracts,restoreContracts,contractAction,tickContract} from './src/city-contracts.js';
import {restoreFlood} from './src/flood-systems.js';
assert.deepEqual(joystickVector(0,0),{x:0,y:0});assert.deepEqual(joystickVector(3,2),{x:0,y:0});assert.equal(joystickVector(200,0).x,1);assert.ok(joystickVector(24,0).x<.5);assert.ok(Math.abs(Math.hypot(...Object.values(joystickVector(90,90)))-1)<1e-10);
const handlers={},knob={style:{}},element={querySelector:()=>knob,getBoundingClientRect:()=>({left:0,top:0,width:112,height:112}),setPointerCapture(){}};let vector;
const stick=bindJoystick(element,{listen:(_,type,cb)=>handlers[type]=cb,onChange:v=>vector=v});
handlers.pointerdown({pointerId:1,clientX:104,clientY:56,preventDefault(){}});assert.equal(vector.x,1);handlers.pointermove({pointerId:2,clientX:0,clientY:0});assert.equal(vector.x,1);handlers.pointercancel({pointerId:1});assert.deepEqual(vector,{x:0,y:0});stick.reset();
for(let district=0;district<4;district++){const f=restoreFlood();assert.equal(f.contracts[district].stage,0);assert.equal(cityContracts[district].jobs.length,3);contractAction(f,district);assert.equal(f.contracts[district].stage,1);f.inventory.copper=0;assert.match(contractAction(f,district),/Requires/);f.inventory.copper=2;contractAction(f,district);assert.equal(f.contracts[district].stage,2);contractAction(f,district);assert.equal(f.contracts[district].remaining,30);tickContract(f,district,5,0);assert.equal(f.contracts[district].remaining,25);tickContract(f,district,1,8);assert.equal(f.contracts[district].remaining,30);assert.match(tickContract(f,district,30,0),/complete/);assert.equal(f.contracts[district].stage,3);const inventory={...f.inventory};contractAction(f,district);assert.deepEqual(f.inventory,inventory);assert.equal(restoreFlood(JSON.parse(JSON.stringify(f))).contracts[district].stage,3);}
assert.equal(restoreContracts([{stage:Infinity}])[0].stage,0);
console.log('PASS: analog deadzone/clamp, independent pointer capture/cancel, 12 city jobs, repair cost guards, timed defense/reset, reward uniqueness, save migration.');
