// One owner for animation scheduling. Pause/resume never creates a second chain.
export function createRenderLoop(render,{request=requestAnimationFrame,cancel=cancelAnimationFrame,now=()=>performance.now()}={}) {
  let handle=null,previous=0,disposed=false;
  function frame(time){handle=null;if(disposed)return;const dt=Math.min(Math.max(0,(time-previous)/1000),.05);previous=time;render(time,dt);if(!disposed&&handle===null)handle=request(frame);}
  return {start(){if(disposed||handle!==null)return;previous=now();handle=request(frame);},stop(){if(handle!==null)cancel(handle);handle=null;},dispose(){disposed=true;this.stop();},get scheduled(){return handle!==null;}};
}
export function createAudioController({makeAudio=url=>new Audio(url),makeContext=()=>new (window.AudioContext||window.webkitAudioContext)()}={}) {
  let context=null,ambience=null,shots=[],unlocked=false,enabled=true,index=0;
  async function activate(sound=true){enabled=sound;if(!sound){ambience?.pause();return false;}try{if(!context)context=makeContext();await context.resume();if(!ambience){ambience=makeAudio('./audio/ambience.mp3');ambience.loop=true;ambience.volume=.13;shots=Array.from({length:5},()=>{const a=makeAudio('./audio/shot.mp3');a.volume=.24;return a;});}unlocked=true;await ambience.play();return true;}catch{return false;}}
  function cue(type='action'){if(!unlocked||!enabled||context?.state!=='running')return;const o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.value=type==='damage'?120:660;g.gain.setValueAtTime(.035,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.12);o.connect(g);g.connect(context.destination);o.start();o.stop(context.currentTime+.12);}
  return {activate,cue,shot(){if(!unlocked||!enabled)return;const a=shots[index++%shots.length];a.currentTime=0;a.play().catch(()=>{});},suspend(){ambience?.pause();context?.suspend().catch(()=>{});},dispose(){ambience?.pause();for(const a of shots){a.pause();a.removeAttribute('src');a.load();}if(ambience){ambience.removeAttribute('src');ambience.load();}context?.close().catch(()=>{});unlocked=false;}};
}
// Keep local persistence synchronous (pagehide-safe); serialize/coalesce cloud writes.
export function createSaveQueue({writeLocal,writeCloud,status}) {
  let pending=null,busy=false,generation=0;
  async function flush(){if(busy||!pending||!writeCloud)return;busy=true;while(pending){const next=pending;pending=null;let ok=false;try{ok=await writeCloud(next.data);}catch{}if(next.generation===generation)status(ok?'Saved to cloud':'Saved locally · cloud unavailable');}busy=false;}
  return {save(data){const id=++generation;status('Saving…');try{writeLocal(data);}catch{status('Save failed · local storage unavailable');return false;}status('Saved locally');if(writeCloud){pending={data,generation:id};void flush();}return true;}};
}
