import { createClient } from '@supabase/supabase-js';
export const backend=createClient('https://wlrdtgttnidaqviujsyz.supabase.co','sb_publishable_quLfjK1EgrPmRGFCoavQow_G_nQ721t',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:25}}});
let identity=null;
let localKey='game-data:offline-player:after-the-flood:default';
let storageStatus=()=>{};
export async function initStorage(status){
 storageStatus=status;
 if(!window.SeeleRuntime?.getContext){status('Local save · cloud bridge unavailable');return;}
 try{const ctx=await window.SeeleRuntime.getContext({requireAuthenticated:false});if(!ctx.platformUserId||!ctx.storageGameId)throw new Error('Missing platform context');identity=ctx;localKey=`game-data:${ctx.platformUserId}:${ctx.storageGameId}:default`;status('Cloud save connected');}
 catch{status('Local save · cloud identity unavailable');}
}
export async function loadSave(){
 let cached=null;
 try{cached=JSON.parse(localStorage.getItem(localKey)||'null');}catch{storageStatus('Local save could not be read');}
 if(identity){try{const {data,error}=await backend.from('game_user_data').select('game_data,schema_version,updated_at').eq('platform_user_id',identity.platformUserId).eq('game_id',identity.storageGameId).eq('data_key','default').maybeSingle();if(error)throw error;if(data&&data.schema_version===1&&(!cached||new Date(data.updated_at).getTime()>(cached.savedAt||0)))return data.game_data;}catch{storageStatus('Cloud unavailable · using local save');}}
 return cached?.schema_version===1?cached.game_data:null;
}
export async function saveProgress(data){
 try{localStorage.setItem(localKey,JSON.stringify({schema_version:1,savedAt:Date.now(),game_data:data}));}catch{storageStatus('Local save unavailable · storage is full');return false;}
 if(!identity){storageStatus('Progress saved locally');return true;}
 try{const {error}=await backend.from('game_user_data').upsert({platform_user_id:identity.platformUserId,game_id:identity.storageGameId,data_key:'default',game_data:data,schema_version:1},{onConflict:'platform_user_id,game_id,data_key'});if(error)throw error;storageStatus('Progress saved to cloud');return true;}catch{storageStatus('Saved locally · cloud retry pending');return false;}
}
export class CooperativeRoom{
 constructor(handlers){this.handlers=handlers;this.id=crypto.randomUUID();this.joinedAt=Date.now();this.hostId=this.id;this.players={};this.connected=false;this.roomCode='';this.channel=null;this.lastWorld=0;}
 get isHost(){return !this.connected||this.hostId===this.id;}
 async join(code){
  await this.leave();this.roomCode=code.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);if(this.roomCode.length<4)throw new Error('Use a room code with at least 4 letters or numbers.');
  this.joinedAt=Date.now();const channel=backend.channel(`game:after-the-flood-${this.roomCode}`,{config:{broadcast:{self:false},presence:{key:this.id}}});this.channel=channel;
  channel.on('presence',{event:'sync'},()=>{
   const state=channel.presenceState(),people=Object.values(state).flat();
   people.sort((a,b)=>a.joinedAt-b.joinedAt||a.id.localeCompare(b.id));this.hostId=people[0]?.id||this.id;
   const present=new Set(people.map(p=>p.id));for(const id of Object.keys(this.players))if(!present.has(id)){delete this.players[id];this.handlers.leave?.(id);}
   for(const person of people)if(person.id!==this.id)this.players[person.id]={...person,...this.players[person.id]};
   this.handlers.presence?.(people,this.isHost);if(this.connected&&!this.isHost)this.send('requestSnapshot',{});
  });
  channel.on('broadcast',{event:'packet'},({payload:p})=>{if(!p||p.sender===this.id)return; if(p.type==='transform'){this.players[p.sender]={...p.data,id:p.sender,received:performance.now()};this.handlers.transform?.(p.sender,p.data);return;} if(p.type==='requestSnapshot'&&this.isHost){this.handlers.snapshotRequest?.();return;} this.handlers.event?.(p.type,p.data,p.sender);});
  return new Promise((resolve,reject)=>{let settled=false;const timeout=setTimeout(()=>{if(!settled){settled=true;this.connected=false;this.handlers.status?.('Connection timed out — solo is still available.');this.leave();reject(new Error('Unable to reach the co-op service.'));}},12000);
   channel.subscribe(async status=>{
    if(status==='SUBSCRIBED'){this.connected=true;await channel.track({id:this.id,joinedAt:this.joinedAt,name:`Survivor ${this.id.slice(0,3).toUpperCase()}`});this.send('requestSnapshot',{});this.handlers.status?.(`Connected to ${this.roomCode}`);if(!settled){settled=true;clearTimeout(timeout);resolve();}}
    else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){this.connected=false;this.handlers.status?.('Connection interrupted — reconnecting…');if(!settled){settled=true;clearTimeout(timeout);reject(new Error('Co-op service could not connect.'));}}
   });
  });
 }
 send(type,data){if(this.connected&&this.channel)this.channel.send({type:'broadcast',event:'packet',payload:{type,data,sender:this.id,at:Date.now()}}).then(result=>{if(result!=='ok')this.handlers.status?.('Co-op connection recovering…');});}
 async leave(){if(this.channel){const c=this.channel;this.channel=null;this.connected=false;await backend.removeChannel(c);}for(const id of Object.keys(this.players))this.handlers.leave?.(id);this.players={};this.hostId=this.id;this.connected=false;this.handlers.presence?.([],true);}
}
