import { drumSamples } from '../drumSamples.js';
import { rockSampleBank } from './rockSampleBank.ts';

// The app computes composition events in TypeScript; this WebView only renders audio.
// WAV data is embedded so a release build can play without any network connection.
export const rockAudioHtml = `<!doctype html><html><body><script>
const guitarData=${JSON.stringify(rockSampleBank)};
const drumData=${JSON.stringify({ kick: drumSamples.kickHouse, snare: drumSamples.snare,
  hat: drumSamples.closedHat, openHat: drumSamples.openHat })};
const send=(type,message)=>window.ReactNativeWebView.postMessage(JSON.stringify({type,message}));
let ctx,bank,master,rhythmBus,leadBus,bassBus,drumBus,timer;
let playing=false,current=null,upcoming=null,origin=0,index=0,announcedSeed=null;
let late=0,jitter=0,lastTick=0,ticks=0;
const active=new Set();

function drive(amount){
 const node=ctx.createWaveShaper(),curve=new Float32Array(2048);
 for(let i=0;i<curve.length;i++)curve[i]=Math.tanh(amount*(2*i/2047-1))/Math.tanh(amount);
 node.curve=curve;node.oversample='2x';return node;
}
function graph(){
 ctx=new (window.AudioContext||window.webkitAudioContext)();
 const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-14;compressor.ratio.value=3;
 master=ctx.createGain();master.gain.value=0.55;compressor.connect(master);master.connect(ctx.destination);
 rhythmBus=ctx.createGain();rhythmBus.gain.value=0.45;
 const rd=drive(3.2),rl=ctx.createBiquadFilter(),rh=ctx.createBiquadFilter();
 rl.type='lowpass';rl.frequency.value=5200;rh.type='highpass';rh.frequency.value=75;
 rhythmBus.connect(rd);rd.connect(rh);rh.connect(rl);rl.connect(compressor);
 leadBus=ctx.createGain();leadBus.gain.value=0.5;
 const ld=drive(1.8),ll=ctx.createBiquadFilter();ll.type='lowpass';ll.frequency.value=6500;
 leadBus.connect(ld);ld.connect(ll);ll.connect(compressor);
 const echo=ctx.createDelay(0.25),echoGain=ctx.createGain();echo.delayTime.value=0.21;echoGain.gain.value=0.12;
 ll.connect(echo);echo.connect(echoGain);echoGain.connect(compressor);
 bassBus=ctx.createGain();bassBus.gain.value=0.5;
 const bl=ctx.createBiquadFilter();bl.type='lowpass';bl.frequency.value=700;
 bassBus.connect(bl);bl.connect(compressor);
 drumBus=ctx.createGain();drumBus.gain.value=0.55;drumBus.connect(compressor);
}
async function prepare(){
 if(!ctx)graph();
 await ctx.resume();
 if(bank)return;
 const started=performance.now();
 async function decode(base64){
  const bytes=Uint8Array.from(atob(base64),char=>char.charCodeAt(0));
  return ctx.decodeAudioData(bytes.buffer);
 }
 const regions=await Promise.all(guitarData.map(async region=>({
  low:region.low,high:region.high,center:region.center,buffer:await decode(region.wav)
 })));
 const drums=Object.fromEntries(await Promise.all(Object.entries(drumData)
  .map(async([name,wav])=>[name,await decode(wav)])));
 bank={regions,drums};send('decoded',{samples:regions.length+Object.keys(drums).length,
  milliseconds:Math.round(performance.now()-started)});
}
function track(source){active.add(source);source.onended=()=>active.delete(source);}
function guitar(event,when,seconds){
 const region=bank.regions.find(item=>item.low<=event.pitchMidi&&event.pitchMidi<=item.high);
 if(!region)throw Error('No guitar sample for MIDI '+event.pitchMidi);
 const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
 source.buffer=region.buffer;source.playbackRate.value=2**((event.pitchMidi-region.center)/12);
 pan.pan.value=event.instrument==='leadGuitar'?0.06:event.string===6?-0.3:0.3;
 source.connect(gain);gain.connect(pan);pan.connect(event.instrument==='leadGuitar'?leadBus:rhythmBus);
 const available=region.buffer.duration/source.playbackRate.value-0.01;
 const length=Math.max(0.04,Math.min(seconds,available));
 gain.gain.setValueAtTime(0,when);
 gain.gain.linearRampToValueAtTime(event.velocity/127,when+0.004);
 gain.gain.setValueAtTime(event.velocity/127,when+Math.max(0.005,length-0.04));
 gain.gain.linearRampToValueAtTime(0,when+length);
 source.start(when);source.stop(when+length);track(source);
}
function bass(event,when,seconds){
 const source=ctx.createOscillator(),gain=ctx.createGain();source.type='triangle';
 source.frequency.value=440*2**((event.pitchMidi-69)/12);
 source.connect(gain);gain.connect(bassBus);
 gain.gain.setValueAtTime(0,when);
 gain.gain.linearRampToValueAtTime(event.velocity/127*0.75,when+0.008);
 gain.gain.setValueAtTime(event.velocity/127*0.75,when+Math.max(0.01,seconds-0.09));
 gain.gain.linearRampToValueAtTime(0,when+seconds);
 source.start(when);source.stop(when+seconds);track(source);
}
function drum(event,when){
 const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=bank.drums[event.instrument];
 gain.gain.value=event.velocity/127;source.connect(gain);gain.connect(drumBus);
 source.start(when);track(source);
}
function schedule(){
 if(!playing)return;
 const now=performance.now();jitter=Math.max(jitter,Math.max(0,now-lastTick-25));lastTick=now;
 const horizon=ctx.currentTime+0.16;
 while(true){
  const secondsPerTick=60/(current.bpm*480);
  while(index<current.events.length){
   const event=current.events[index],intended=origin+event.startTick*secondsPerTick;
   if(intended>horizon)break;
   const when=Math.max(ctx.currentTime+0.005,intended);
   if(intended<ctx.currentTime+0.01)late++;
   if(event.kind==='drum')drum(event,when);
   else if(event.instrument==='bass')bass(event,when,event.durationTicks*secondsPerTick);
   else guitar(event,when,event.durationTicks*secondsPerTick);
   index++;
  }
  const end=origin+current.barCount*1920*secondsPerTick;
  if(index<current.events.length||end>horizon)break;
  if(!upcoming){send('error','Следующий фрагмент не готов');stop();return;}
  origin=end;current=upcoming;upcoming=null;index=0;
 }
 if(++ticks%20===0){
  if(ctx.currentTime>=origin&&announcedSeed!==current.seed){
   announcedSeed=current.seed;send('nextStarted',current.seed);
  }
  send('metrics',{late,jitter:Math.round(jitter),
   bar:Math.max(1,Math.min(32,Math.floor((ctx.currentTime-origin)/(4*60/current.bpm))+1))});
 }
}
function stop(notify=true,suspend=true){
 playing=false;clearInterval(timer);timer=null;
 for(const source of active){try{source.stop();}catch{}}
 active.clear();
 if(ctx&&master){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(0,ctx.currentTime);}
 if(ctx&&suspend)ctx.suspend();
 if(notify)send('stopped');
}
window.control=async command=>{
 try{
  if(command.type==='stop'){stop();return;}
  if(command.type==='volume'){if(master)master.gain.setTargetAtTime(command.value*0.55,ctx.currentTime,0.04);return;}
  if(command.type==='setUpcoming'){upcoming=command.fragment;return;}
  if(command.type==='start'){
   stop(false,false);await prepare();
   current=command.fragment;upcoming=command.next;
   master.gain.value=command.volume*0.55;
   origin=ctx.currentTime+0.14;index=0;announcedSeed=current.seed;
   late=0;jitter=0;ticks=0;lastTick=performance.now();playing=true;
   timer=setInterval(schedule,25);schedule();send('playing',current.seed);
  }
 }catch(error){stop();send('error',String(error));}
};
send('ready');
</script></body></html>`;
