import { drumSamples } from './drumSamples.js';
// Offline sample + synth engine. Timers fill a look-ahead queue; notes use the audio clock.
export const genreProfiles = {
 electronic: { name:'Электронная для бега', description:'Пульсирующий бас · мелодия · без слов', voices:[0,1,2,3], progression:[0,5,2,6], chordBars:2, bass:[0,3,6,8,11,14], bassType:'triangle', bassLength:0.14, bassGain:0.24, leadEvery:2, rest:0.16, degrees:[0,1,2,3,4,7], hats:2, chords:[0], chordLength:3.7, chordType:'sine', chordGain:0.035, echo:0.27 },
 house: { name:'Хаус', description:'Ровная бочка · упругий бас · аккордовые акценты', voices:[0,1,2], progression:[0,3,5,6], chordBars:2, bass:[0,3,6,10,14], bassType:'triangle', bassLength:0.2, bassGain:0.22, leadEvery:2, rest:0.4, degrees:[0,2,4,6], hats:2, chords:[2,6,10,14], chordLength:0.45, chordType:'triangle', chordGain:0.05, echo:0.12 },
 techno: { name:'Техно', description:'Плотная бочка · короткий бас · минимализм', voices:[2,3], progression:[0,0,0,3], chordBars:2, bass:[0,2,3,6,8,10,11,14], bassType:'sawtooth', bassLength:0.09, bassGain:0.13, leadEvery:2, rest:0.48, degrees:[0,0,2,4], hats:1, chords:[0], chordLength:0.65, chordType:'sawtooth', chordGain:0.02, echo:0.12 },
 trance: { name:'Транс', description:'Бегущие арпеджио · протяжённые аккорды', voices:[2,0,1], progression:[0,5,2,6], chordBars:2, bass:[2,6,10,14], bassType:'sawtooth', bassLength:0.16, bassGain:0.16, leadEvery:1, rest:0.03, degrees:[0,2,4,7,9], hats:2, chords:[0], chordLength:3.8, chordType:'triangle', chordGain:0.04, echo:0.35 },
 chiptune: { name:'Чиптюн', description:'Игровые тембры · быстрые переборы · ретро', voices:[3,0], progression:[0,2,5,6], chordBars:1, bass:[0,4,8,12], bassType:'triangle', bassLength:0.12, bassGain:0.22, leadEvery:1, rest:0.1, degrees:[0,2,4,7,9], hats:2, chords:[], chordLength:0.2, chordType:'square', chordGain:0.02, echo:0 },
 eurodance: { name:'Евродэнс', description:'Энергичный бас · яркая мелодия · дух 90-х', voices:[2,3,0], progression:[0,5,2,6], chordBars:1, bass:[2,6,10,14], bassType:'sawtooth', bassLength:0.21, bassGain:0.18, leadEvery:2, rest:0.08, degrees:[0,2,4,4,7,6], hats:2, chords:[0,6,8,14], chordLength:0.7, chordType:'sawtooth', chordGain:0.032, echo:0.3 },
};
export type GenreId = keyof typeof genreProfiles;
export const voiceNames = ['Мягкий синт', 'Чистый тон', 'Яркий синт', 'Ретро-синт'];
export type MusicSnapshot = { version: 1; genre: GenreId; bpm: number; volume: number; voiceIndex: number; melody: (number | null)[]; startBar: number; arrangementSeed?: number; arrangementBar?: number };
export type SavedPreset = { id: string; snapshot: MusicSnapshot };
export function isMusicSnapshot(value: unknown): value is MusicSnapshot {
 if (!value || typeof value !== 'object') return false;
 const p = value as MusicSnapshot;
 return p.version === 1 && Object.prototype.hasOwnProperty.call(genreProfiles, p.genre)
  && Number.isInteger(p.bpm) && p.bpm >= 80 && p.bpm <= 200
  && Number.isFinite(p.volume) && p.volume >= 0 && p.volume <= 1
  && Number.isInteger(p.voiceIndex) && (genreProfiles[p.genre].voices as number[]).includes(p.voiceIndex)
  && Number.isInteger(p.startBar) && p.startBar >= 0 && p.startBar < 8
  && (p.arrangementSeed === undefined || (Number.isInteger(p.arrangementSeed) && p.arrangementSeed >= 0 && p.arrangementSeed <= 0xffffffff))
  && (p.arrangementBar === undefined || (Number.isInteger(p.arrangementBar) && p.arrangementBar >= 0 && p.arrangementBar < 0x7fffffff))
  && Array.isArray(p.melody) && p.melody.length === 32
  && p.melody.every(n => n === null || (Number.isInteger(n) && n >= 0 && n <= 11));
}
export function parsePresets(raw: string | null): SavedPreset[] {
 if (raw === null) return [];
 const data: unknown = JSON.parse(raw);
 if (!Array.isArray(data)) throw new Error('Invalid preset list');
 const ids = new Set<string>();
 return data.filter((p): p is SavedPreset => {
  if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) || !isMusicSnapshot(p.snapshot)) return false;
  ids.add(p.id); return true;
 }).slice(0, 10);
}
export const audioHtml = `<!doctype html><html><body><script>
const profiles=${JSON.stringify(genreProfiles)};
const sampleData=${JSON.stringify(drumSamples)};
const sampleBuffers={};
let samplesPromise;
let genre='electronic', pendingGenre=null;
let ctx, master, timer, running=false, step=0, next=0, bpm=160, target=160, volume=0.55;
let drumBus,bassBus,musicBus,duckBus,reverb,reverbSend,reverbWet,impulse;
let arrangementSeed=(Math.random()*0xffffffff)>>>0,arrangementBar=0,lastSection='full';
let revision=0;
const active=new Set();
const send=(type,message)=>window.ReactNativeWebView.postMessage(JSON.stringify({type,message}));
let melody=[], melodyNumber=0, melodyTempo=160, settingsReceived=false;
let changePending=false, nextVariation=128;
let presetLocked=false, startBar=0;
const voices=[
 {name:'Мягкий синт',type:'triangle',length:0.17,gain:0.085,cutoff:4200},
 {name:'Чистый тон',type:'sine',length:0.28,gain:0.11,cutoff:7000},
 {name:'Яркий синт',type:'sawtooth',length:0.16,gain:0.055,cutoff:8500},
 {name:'Ретро-синт',type:'square',length:0.12,gain:0.045,cutoff:6500}
];
let voiceIndex=0, voiceChangePending=false;
const scale=[0,2,3,5,7,8,10]; // A natural minor; chords use degrees of this scale.
function makeMelody(){
 const profile=profiles[genre];
 const pick=values=>values[Math.floor(Math.random()*values.length)];
 const motif=Array.from({length:8},(_,i)=>i===0?pick([0,2,4]):pick(profile.degrees));
 if(genre==='techno')for(let i=2;i<8;i++)motif[i]=motif[i%2];
 if(genre==='trance'||genre==='chiptune'){
  const inversion=pick([0,2]);
  for(let i=0;i<8;i++)motif[i]=[0,2,4,7,4,2,7,4][i]+inversion;
 }
 const candidate=[];
 for(let bar=0;bar<4;bar++)for(let i=0;i<8;i++){
  // Keep a recognizable motif, then answer it with small variations and rests.
  const degree=bar%2===0?motif[i]:(i===7?0:Math.random()<0.4?pick([0,2,4,7]):motif[i]);
  candidate.push(i%4!==0&&Math.random()<profile.rest?null:degree);
 }
 // Even a repeated random draw must produce a different audible opening.
 if(candidate.every((n,i)=>n===melody[i]))candidate[0]=candidate[0]===0?4:0;
 return candidate;
}
function changeMelody(){
 presetLocked=false;
 if(pendingGenre!==null){genre=pendingGenre;pendingGenre=null;voiceChangePending=true;}
 const allowed=profiles[genre].voices;
 if(voiceChangePending){
  const choices=allowed.filter(index=>index!==voiceIndex);
  voiceIndex=choices[Math.floor(Math.random()*choices.length)];
  voiceChangePending=false;
 }
 melody=makeMelody();melodyNumber++;melodyTempo=target;changePending=false;
 nextVariation=step+128; // A fresh phrase every eight bars.
 send('melody',melodyNumber);
 send('instrument',voices[voiceIndex].name);
 send('genre',genre);
}
function requestMelody(changeVoice=false){
 voiceChangePending=voiceChangePending||changeVoice;
 if(!running){changeMelody();return;}
 if(!changePending){changePending=true;send('melodyPending');}
}
changeMelody();
function sectionAt(bar){
 // Four bars per 80-bar block = 5% at a steady BPM, never in the opening 16 bars.
 // The seed controls placement/type; neither Next nor automatic phrases reset it.
 const block=Math.floor(bar/80),position=bar%80;
 const hash=(Math.imul((arrangementSeed^block)>>>0,1664525)+1013904223)>>>0;
 const start=[32,48,64][hash%3];
 return position>=start&&position<start+4?['noDrums','noBass','rhythmOnly'][(Math.floor(hash/3)+block)%3]:'full';
}
function setSection(section,t){
 for(const [bus,muted] of [[drumBus,section==='noDrums'],[bassBus,section==='noBass'],[musicBus,section==='rhythmOnly']]){
  bus.gain.setTargetAtTime(muted?0:1,t,0.008);
 }
 if(section!==lastSection){lastSection=section;send('section',section);}
}
async function init(){
 if(!ctx){
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  master=ctx.createGain();master.gain.value=volume*0.65;
  const compressor=ctx.createDynamicsCompressor();
  compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=3;
  compressor.attack.value=0.008;compressor.release.value=0.16;
  const warmth=ctx.createBiquadFilter();warmth.type='lowshelf';warmth.frequency.value=100;warmth.gain.value=2;
  const air=ctx.createBiquadFilter();air.type='highshelf';air.frequency.value=6500;air.gain.value=2.5;
  master.connect(warmth);warmth.connect(air);air.connect(compressor);compressor.connect(ctx.destination);
  drumBus=ctx.createGain();bassBus=ctx.createGain();musicBus=ctx.createGain();duckBus=ctx.createGain();
  drumBus.connect(master);bassBus.connect(master);duckBus.connect(musicBus);musicBus.connect(master);
  reverbSend=ctx.createGain();reverbSend.gain.value=0.15;
  reverb=ctx.createConvolver();reverbWet=ctx.createGain();reverbWet.gain.value=0.32;
  reverbSend.connect(reverb);reverb.connect(reverbWet);reverbWet.connect(musicBus);
  impulse=ctx.createBuffer(2,Math.floor(ctx.sampleRate*0.65),ctx.sampleRate);
  let seed=1234567;
  for(let channel=0;channel<2;channel++){
   const data=impulse.getChannelData(channel);
   for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/0xffffffff*2-1)*Math.pow(1-i/data.length,3);}
  }
 }
 if(!samplesPromise)samplesPromise=Promise.all(Object.entries(sampleData).map(async([name,base64])=>{
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  sampleBuffers[name]=await ctx.decodeAudioData(bytes.buffer);
 })).catch(error=>{samplesPromise=null;throw error;});
 await samplesPromise;
}
function hit(name,t,gain,rate=1,pan=0){
 const source=ctx.createBufferSource(),env=ctx.createGain(),panner=ctx.createStereoPanner();
 source.buffer=sampleBuffers[name];source.playbackRate.value=rate;
 const duration=source.buffer.duration/rate;
 env.gain.setValueAtTime(gain,t);env.gain.setValueAtTime(gain,t+Math.max(0,duration-0.012));env.gain.linearRampToValueAtTime(0,t+duration);
 panner.pan.value=pan;source.connect(env);env.connect(panner);panner.connect(drumBus);active.add(source);
 source.onended=()=>{active.delete(source);source.disconnect();env.disconnect();panner.disconnect();};
 source.start(t);source.stop(t+duration+0.01);
}
function note(freq,t,length,gain,type='sine',endFreq,cutoff,options={}){
 const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);
 if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,t+length);
 const attack=Math.min(options.attack||0.008,length*0.2),release=options.release||0.06;
 env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(gain,t+attack);
 env.gain.exponentialRampToValueAtTime(Math.max(0.0002,gain*0.45),t+length);
 env.gain.exponentialRampToValueAtTime(0.0001,t+length+release);
 let filter;
 if(cutoff){filter=ctx.createBiquadFilter();filter.type='lowpass';filter.Q.value=0.65;
  filter.frequency.setValueAtTime(cutoff,t);filter.frequency.exponentialRampToValueAtTime(Math.max(250,cutoff*(options.sweep||0.55)),t+length);
  osc.connect(filter);filter.connect(env);}
 else osc.connect(env);
 const panner=ctx.createStereoPanner();panner.pan.value=options.pan||0;env.connect(panner);
 panner.connect(options.bass?bassBus:duckBus);if(!options.bass&&options.wet!==false)panner.connect(reverbSend);
 active.add(osc);
 osc.onended=()=>{active.delete(osc);osc.disconnect();if(filter)filter.disconnect();env.disconnect();panner.disconnect();};osc.start(t);osc.stop(t+length+release+0.01);
}
function lead(freq,t,voice,echo=false){
 const chip=genre==='chiptune',wide=!chip&&(voice.type==='sawtooth'||voice.type==='square');
 const length=chip?voice.length:Math.min(60/bpm*0.7,voice.length*1.65);
 const gain=voice.gain*(echo?0.18:1)*(wide?0.58:0.85);
 note(freq,t,length,gain,voice.type,undefined,voice.cutoff,{pan:wide?-0.32:0,release:chip?0.025:0.12,wet:!chip,sweep:0.78});
 if(wide)note(freq*Math.pow(2,7/1200),t,length,gain*0.8,voice.type,undefined,voice.cutoff,{pan:0.32,release:0.12,sweep:0.78});
 if(!chip&&voice.type==='sine')note(freq*2,t,length*0.6,gain*0.17,'sine',undefined,5000,{release:0.1,pan:0.15});
}
function schedule(){
 if(!running)return;
 if(next<ctx.currentTime)next=ctx.currentTime+0.025;
 while(next<ctx.currentTime+0.12){
  const t=next,s=step%16,bar=Math.floor(step/16)+startBar;
  const section=sectionAt(Math.floor(step/16)+arrangementBar);
  if(s===0)setSection(section,t);
  if(s===0&&(changePending||(!presetLocked&&step>=nextVariation)))changeMelody();
  const profile=profiles[genre];
  const chord=profile.progression[Math.floor(bar/profile.chordBars)%4];
  const scaleNote=degree=>45+scale[degree%7]+12*Math.floor(degree/7);
  const root=scaleNote(chord);
  const hz=n=>440*Math.pow(2,(n-69)/12);
  if(section!=='noDrums'){
   if(s%4===0){
    hit(genre==='house'?'kickHouse':genre==='techno'?'kickTechno':'kickDance',t,0.88);
    duckBus.gain.setValueAtTime(0.72,t);duckBus.gain.linearRampToValueAtTime(1,t+60/bpm*0.45);
   }
   if(s===4||s===12){
    hit('snare',t,genre==='eurodance'?0.32:0.28);
    if(genre!=='chiptune')hit('clap',t+0.008,genre==='eurodance'?0.38:0.26,1,0.08);
   }
   if(s%profile.hats===0)hit(s%4===2&&genre!=='chiptune'?'openHat':genre==='house'?'softHat':'closedHat',t,s%4===2?0.24:0.15,1,s%4===2?0.15:-0.12);
   if((genre==='house'||genre==='eurodance')&&s%4===3)hit('shaker',t,0.14,1,0.28);
  }
  if(section!=='noBass'&&profile.bass.includes(s)){
   const freq=hz(root-(genre==='electronic'?0:12));
   note(freq,t,profile.bassLength,profile.bassGain*0.8,profile.bassType,undefined,1100,{bass:true,release:0.04});
   // Dedicated mono fundamental: keep every chord's sub in a useful 40–80 Hz octave.
   let subFreq=freq;while(subFreq>80)subFreq/=2;while(subFreq<40)subFreq*=2;
   note(subFreq,t,Math.max(0.16,profile.bassLength),0.18,'sine',undefined,undefined,{bass:true,release:0.06});
  }
  if(section!=='rhythmOnly'&&s%profile.leadEvery===0){
   const degree=melody[(bar%4)*8+Math.floor(s/profile.leadEvery)%8];
   if(degree!==null){
    const pitch=scaleNote(chord+degree)+12;
    const voice=voices[voiceIndex];
    lead(hz(pitch),t,voice);
    if(profile.echo>0)lead(hz(pitch),t+60/bpm*0.75,voice,true);
   }
  }
  if(section!=='rhythmOnly'&&profile.chords.includes(s))[0,2,4].forEach((n,i)=>note(hz(scaleNote(chord+n)+12),t,60/bpm*profile.chordLength,profile.chordGain*0.85,profile.chordType,undefined,2400,{pan:(i-1)*0.25,attack:profile.chordLength>2?0.08:0.006,release:0.16}));
  bpm+=Math.max(-0.5,Math.min(0.5,target-bpm));next+=60/bpm/4;step++;
 }
}
function stop(){
 running=false;clearInterval(timer);active.forEach(s=>{try{s.stop();}catch{}});active.clear();
 if(ctx){
  reverb.buffer=null;
  for(const bus of [drumBus,bassBus,musicBus,duckBus]){bus.gain.cancelScheduledValues(ctx.currentTime);bus.gain.value=1;}
  ctx.suspend();
 }
 send('stopped');
 if(changePending)changeMelody();
}
window.control=async function(command){
 try{
  if(command.type==='settings'){
   target=Math.max(80,Math.min(200,command.bpm));volume=Math.max(0,Math.min(1,command.volume));
   if(!settingsReceived){melodyTempo=target;settingsReceived=true;}
   else if(Math.abs(target-melodyTempo)>10)requestMelody();
   if(master)master.gain.setTargetAtTime(volume*0.65,ctx.currentTime,0.04);
  }
  if(command.type==='melody')requestMelody(true);
  if(command.type==='snapshot')send('snapshot',{
   version:1,genre,bpm:target,volume,voiceIndex,melody:melody.slice(),
   startBar:(Math.floor(Math.max(0,step-1)/16)+startBar)%8,
   arrangementSeed,arrangementBar:Math.floor(Math.max(0,step-1)/16)+arrangementBar
  });
  if(command.type==='loadPreset'){
   const p=command.snapshot;
   if(!p||p.version!==1||!Object.prototype.hasOwnProperty.call(profiles,p.genre)
    ||!Number.isInteger(p.bpm)||p.bpm<80||p.bpm>200
    ||!Number.isFinite(p.volume)||p.volume<0||p.volume>1
    ||!profiles[p.genre].voices.includes(p.voiceIndex)
    ||!Number.isInteger(p.startBar)||p.startBar<0||p.startBar>=8
    ||(p.arrangementSeed!==undefined&&(!Number.isInteger(p.arrangementSeed)||p.arrangementSeed<0||p.arrangementSeed>0xffffffff))
    ||(p.arrangementBar!==undefined&&(!Number.isInteger(p.arrangementBar)||p.arrangementBar<0||p.arrangementBar>=0x7fffffff))
    ||!Array.isArray(p.melody)||p.melody.length!==32
    ||!p.melody.every(n=>n===null||(Number.isInteger(n)&&n>=0&&n<=11)))throw new Error('Invalid preset');
   revision++;changePending=false;pendingGenre=null;voiceChangePending=false;stop();
   genre=p.genre;target=p.bpm;bpm=p.bpm;volume=p.volume;melodyTempo=p.bpm;settingsReceived=true;
   voiceIndex=p.voiceIndex;melody=p.melody.slice();startBar=p.startBar;presetLocked=true;melodyNumber++;
   arrangementSeed=p.arrangementSeed??1234567;arrangementBar=p.arrangementBar??0;
   if(master)master.gain.setTargetAtTime(volume*0.65,ctx.currentTime,0.04);
   send('melody',melodyNumber);send('instrument',voices[voiceIndex].name);send('genre',genre);
   send('presetLoaded',command.id);
   await window.control({type:'start'});
  }
  if(command.type==='genre'&&Object.prototype.hasOwnProperty.call(profiles,command.genre)){
   if(command.genre!==genre||pendingGenre!==null){pendingGenre=command.genre;requestMelody(true);}
  }
  if(command.type==='stop'){revision++;stop();}
  if(command.type==='start'){
   const token=++revision;await init();if(token!==revision)return;
   reverb.buffer=impulse;await ctx.resume();if(token!==revision)return;
   if(ctx.state!=='running')throw new Error('Audio context did not start');
   if(!running){bpm=target;step=0;nextVariation=128;next=ctx.currentTime+0.05;running=true;schedule();timer=setInterval(schedule,25);}
   send('playing');
  }
 }catch(error){stop();send('error',String(error));}
};
send('ready');
</script></body></html>`;
