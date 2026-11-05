import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { Buffer } from 'node:buffer';
import { audioHtml, genreProfiles, isMusicSnapshot, parsePresets } from '../src/audioEngine.ts';

function setup() {
  const messages = [], sources = [], timers = new Set();
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param(), pan: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), playbackRate: param() });
  const source = () => {
    const item = { ...node(), start(t) { assert.ok(t >= 0); this.started = true; }, stop() { this.stopped = true; } };
    sources.push(item); return item;
  };
  let context;
  class AudioContext {
    currentTime = 0; sampleRate = 8000; state = 'suspended'; destination = {};
    constructor() { context = this; }
    createGain = node; createDynamicsCompressor = node; createBiquadFilter = node;
    createStereoPanner = node; createConvolver = node;
    createOscillator = source; createBufferSource = source;
    createBuffer(_, length) { return { getChannelData: () => new Float32Array(length) }; }
    async decodeAudioData(buffer) { assert.ok(buffer.byteLength > 44); return { duration: 0.5 }; }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
  }
  const sandbox = { atob: value => Buffer.from(value, 'base64').toString('binary'), window: { AudioContext, ReactNativeWebView: { postMessage: value => messages.push(JSON.parse(value)) } }, setInterval: callback => { timers.add(callback); return callback; }, clearInterval: callback => timers.delete(callback) };
  vm.createContext(sandbox);
  vm.runInContext(audioHtml.match(/<script>([\s\S]*)<\/script>/)[1], sandbox);
  return { messages, sources, timers, sandbox, control: sandbox.window.control,
    read: expression => vm.runInContext(expression, sandbox),
    advance: seconds => { for (let t = 0; t < seconds; t += 0.025) { context.currentTime += 0.025; [...timers].forEach(tick => tick()); } },
    get context() { return context; } };
}

test('audio schedules notes, changes tempo, stops and restarts without duplicate timers', async () => {
  const harness = setup();
  const { messages, sources, timers, sandbox } = harness;
  const control = sandbox.window.control;
  assert.ok(messages.some(message => message.type === 'ready'));
  await control({ type: 'settings', bpm: 160, volume: 0.5 });
  await control({ type: 'start' });
  const context = harness.context;
  assert.equal(messages.at(-1).type, 'playing');
  assert.ok(sources.length > 0);
  await control({ type: 'start' });
  assert.equal(timers.size, 1);
  await control({ type: 'settings', bpm: 200, volume: 0 });
  for (let i = 0; i < 100; i++) { context.currentTime += 0.025; [...timers].forEach(tick => tick()); }
  await control({ type: 'stop' });
  assert.equal(timers.size, 0);
  assert.equal(context.state, 'suspended');
  assert.ok(sources.every(s => s.stopped));
  await control({ type: 'start' });
  assert.equal(timers.size, 1);
  await control({ type: 'stop' });
  assert.equal(messages.filter(m => m.type === 'error').length, 0);
});

test('manual change waits for a bar, preserves tempo and does not restart the beat', async () => {
  const h = setup();
  await h.control({ type: 'settings', bpm: 160, volume: 0.5 });
  await h.control({ type: 'start' });
  h.advance(0.3);
  const before = h.read('JSON.stringify(melody)'), stepBefore = h.read('step');
  await h.control({ type: 'melody' });
  await h.control({ type: 'melody' });
  assert.equal(h.read('voiceIndex'), 0);
  assert.equal(h.read('melodyNumber'), 1);
  assert.equal(h.read('step'), stepBefore);
  h.advance(1.6);
  assert.equal(h.read('melodyNumber'), 2);
  assert.notEqual(h.read('voiceIndex'), 0);
  assert.notEqual(h.read('JSON.stringify(melody)'), before);
  assert.equal(h.read('target'), 160);
  assert.equal(h.read('bpm'), 160);
  assert.ok(h.read('step') > stepBefore);
  assert.equal(h.timers.size, 1);
});

test('tempo threshold is strictly over ten, cumulative, bidirectional and rebased after a change', async () => {
  const h = setup();
  const settings = bpm => h.control({ type: 'settings', bpm, volume: 0.5 });
  await settings(140);
  for (let bpm = 141; bpm <= 150; bpm++) await settings(bpm);
  assert.equal(h.read('melodyNumber'), 1);
  await settings(151);
  assert.equal(h.read('melodyNumber'), 2);
  await settings(141);
  assert.equal(h.read('melodyNumber'), 2);
  await settings(140);
  assert.equal(h.read('melodyNumber'), 3);
  await h.control({ type: 'melody' });
  await settings(150);
  assert.equal(h.read('melodyNumber'), 4);
  await settings(151);
  assert.equal(h.read('melodyNumber'), 5);
  await h.control({ type: 'settings', bpm: 151, volume: 0.9 });
  assert.equal(h.read('melodyNumber'), 5);
});

test('rapid tempo updates coalesce at next bar and use the latest tempo as baseline', async () => {
  const h = setup();
  await h.control({ type: 'settings', bpm: 160, volume: 0.5 });
  await h.control({ type: 'start' });
  for (const bpm of [171, 180, 190]) await h.control({ type: 'settings', bpm, volume: 0.5 });
  h.advance(2);
  assert.equal(h.read('melodyNumber'), 2);
  assert.equal(h.read('melodyTempo'), 190);
  assert.equal(h.read('target'), 190);
});

test('new phrases appear after eight bars, even with an unchanging tempo', async () => {
  const h = setup();
  await h.control({ type: 'start' });
  h.advance(11);
  assert.equal(h.read('melodyNumber'), 1);
  h.advance(1.5);
  assert.equal(h.read('melodyNumber'), 2);
  h.advance(12);
  assert.equal(h.read('melodyNumber'), 3);
  assert.equal(h.read('voiceIndex'), 0);
});

test('Next always changes the instrument; tempo changes preserve it', async () => {
  const h = setup();
  await h.control({ type: 'settings', bpm: 160, volume: 0.5 });
  for (let i = 0; i < 20; i++) {
    const previous = h.read('voiceIndex');
    await h.control({ type: 'melody' });
    assert.notEqual(h.read('voiceIndex'), previous);
    assert.equal(h.messages.findLast(m => m.type === 'instrument').message, h.read('voices[voiceIndex].name'));
  }
  const selected = h.read('voiceIndex');
  await h.control({ type: 'settings', bpm: 180, volume: 0.5 });
  assert.equal(h.read('voiceIndex'), selected);
  // Exercise every waveform through the scheduler, including the filtered voices.
  for (let index = 0; index < 4; index++) {
    vm.runInContext(`voiceIndex=${index}`, h.sandbox);
    await h.control({ type: 'start' });
    assert.ok(h.sources.some(source => source.type === h.read('voices[voiceIndex].type')));
    await h.control({ type: 'stop' });
  }
  assert.equal(h.messages.filter(m => m.type === 'error').length, 0);
});

test('a repeated random draw still yields a different phrase and notes stay in scale degrees', async () => {
  const h = setup();
  vm.runInContext('Math.random=()=>0.5', h.sandbox);
  await h.control({ type: 'melody' });
  const before = h.read('JSON.stringify(melody)');
  await h.control({ type: 'melody' });
  assert.notEqual(h.read('JSON.stringify(melody)'), before);
  assert.equal(h.read('melody.every(n=>n===null||[0,1,2,3,4,7].includes(n))'), true);
});

for (const genre of Object.keys(genreProfiles)) {
  test(`${genre}: renders several bars and Next stays inside its instrument set`, async () => {
    const h = setup();
    await h.control({ type: 'settings', bpm: 145, volume: 0.5 });
    await h.control({ type: 'genre', genre });
    assert.equal(h.read('genre'), genre);
    await h.control({ type: 'start' });
    h.advance(7);
    const previous = h.read('voiceIndex');
    await h.control({ type: 'melody' });
    h.advance(2);
    const current = h.read('voiceIndex');
    assert.notEqual(current, previous);
    assert.ok(genreProfiles[genre].voices.includes(current));
    assert.equal(h.read('target'), 145);
    assert.equal(h.read('genre'), genre);
    assert.equal(h.timers.size, 1);
    assert.ok(h.sources.length > 80);
    assert.equal(h.messages.filter(m => m.type === 'error').length, 0);
  });
}

test('live genre changes coalesce at a bar without resetting tempo or transport', async () => {
  const h = setup();
  await h.control({ type: 'settings', bpm: 150, volume: 0.5 });
  await h.control({ type: 'start' });
  h.advance(0.4);
  const step = h.read('step');
  await h.control({ type: 'genre', genre: 'techno' });
  await h.control({ type: 'genre', genre: 'eurodance' });
  assert.equal(h.read('genre'), 'electronic');
  assert.equal(h.read('step'), step);
  h.advance(1.5);
  assert.equal(h.read('genre'), 'eurodance');
  assert.equal(h.read('melodyNumber'), 2);
  assert.equal(h.read('bpm'), 150);
  assert.ok(h.read('step') > step);
  await h.control({ type: 'genre', genre: '__proto__' });
  await h.control({ type: 'genre', genre: 'missing' });
  assert.equal(h.read('pendingGenre'), null);
  assert.equal(h.read('genre'), 'eurodance');
});

test('genre arrangements produce distinct note/rhythm signatures', async () => {
  const signatures = new Set();
  for (const genre of Object.keys(genreProfiles)) {
    const h = setup();
    vm.runInContext('Math.random=()=>0.5', h.sandbox);
    await h.control({ type: 'genre', genre });
    vm.runInContext(`
      globalThis.events=[];
      note=(freq,t,length,gain,type)=>events.push([Math.round(freq),+t.toFixed(3),+length.toFixed(3),type]);
      hit=(name,t,gain)=>events.push([name,+t.toFixed(3),gain]);
    `, h.sandbox);
    await h.control({ type: 'start' });
    h.advance(6);
    const signature=h.read('JSON.stringify(events)');
    assert.ok(!signatures.has(signature), `${genre} duplicates another arrangement`);
    signatures.add(signature);
  }
});

test('saved snapshot restores the same notes, voice, tempo and harmony after a new launch', async () => {
  const original = setup();
  await original.control({ type: 'genre', genre: 'eurodance' });
  await original.control({ type: 'settings', bpm: 137, volume: 0.42 });
  await original.control({ type: 'start' });
  original.advance(4.5);
  await original.control({ type: 'snapshot' });
  const snapshot = original.messages.findLast(m => m.type === 'snapshot').message;
  assert.ok(isMusicSnapshot(snapshot));
  const persisted = parsePresets(JSON.stringify([{ id: 'saved', snapshot }]))[0];
  const restored = setup();
  await restored.control({ type: 'loadPreset', ...persisted });
  assert.equal(restored.read('JSON.stringify(melody)'), JSON.stringify(snapshot.melody));
  assert.equal(restored.read('genre'), 'eurodance');
  assert.equal(restored.read('target'), 137);
  assert.equal(restored.read('volume'), 0.42);
  assert.equal(restored.read('voiceIndex'), snapshot.voiceIndex);
  assert.equal(restored.read('startBar'), snapshot.startBar);
  assert.equal(restored.read('running'), true);
  const number = restored.read('melodyNumber');
  restored.advance(30);
  assert.equal(restored.read('melodyNumber'), number, 'preset must not mutate automatically');
  await restored.control({ type: 'stop' });
  await restored.control({ type: 'start' });
  assert.equal(restored.read('presetLocked'), true);
  await restored.control({ type: 'melody' });
  restored.advance(2);
  assert.equal(restored.read('presetLocked'), false);
  assert.equal(restored.messages.filter(m => m.type === 'error').length, 0);
});

test('reloading a preset gives the same musical events and clears queued genre changes', async () => {
  const h = setup();
  await h.control({ type: 'snapshot' });
  const snapshot = h.messages.findLast(m => m.type === 'snapshot').message;
  vm.runInContext(`
    globalThis.events=[];
    note=(freq,t,length,gain,type)=>events.push([freq,length,gain,type]);
    hit=(name,t,gain)=>events.push([name,gain]);
  `, h.sandbox);
  await h.control({ type: 'loadPreset', id: 'one', snapshot });
  const first = h.read('JSON.stringify(events)');
  await h.control({ type: 'genre', genre: 'techno' });
  vm.runInContext('events=[]', h.sandbox);
  await h.control({ type: 'loadPreset', id: 'one', snapshot });
  assert.equal(h.read('JSON.stringify(events)'), first);
  assert.equal(h.read('pendingGenre'), null);
  assert.equal(h.read('changePending'), false);
  assert.equal(h.timers.size, 1);
});

test('preset storage accepts ten entries, filters invalid and duplicate records', async () => {
  const h = setup();
  await h.control({ type: 'snapshot' });
  const snapshot = h.messages.findLast(m => m.type === 'snapshot').message;
  const entries = Array.from({ length: 12 }, (_, i) => ({ id: String(i), snapshot }));
  assert.equal(parsePresets(JSON.stringify(entries)).length, 10);
  assert.equal(parsePresets(null).length, 0);
  assert.throws(() => parsePresets('{'));
  assert.throws(() => parsePresets('{}'));
  assert.equal(parsePresets(JSON.stringify([entries[0], entries[0], { id: 'broken', snapshot: { ...snapshot, melody: [] } }])).length, 1);
  for (const invalid of [{ ...snapshot, genre: '__proto__' }, { ...snapshot, bpm: 0 }, { ...snapshot, startBar: -1 }, { ...snapshot, voiceIndex: 99 }, { ...snapshot, version: 2 }]) {
    assert.equal(isMusicSnapshot(invalid), false);
    await h.control({ type: 'loadPreset', snapshot: invalid });
    assert.equal(h.messages.at(-1).type, 'error');
  }
});

test('arrangement breaks take exactly five percent of bars with full openings and varied types', () => {
  const h = setup();
  for (const seed of [0, 1, 1234567, 4294967295]) {
    vm.runInContext(`arrangementSeed=${seed}`, h.sandbox);
    const sections = h.read('Array.from({length:4000},(_,bar)=>sectionAt(bar))');
    assert.equal(sections.filter(s => s !== 'full').length, 200);
    assert.ok(sections.slice(0, 16).every(s => s === 'full'));
    for (const mode of ['noDrums', 'noBass', 'rhythmOnly']) assert.ok(sections.includes(mode));
    for (let i = 0; i < sections.length; i++) {
      if (sections[i] !== 'full' && sections[i - 1] === 'full') {
        for (let offset = 1; offset < 4; offset++) assert.equal(sections[i + offset], sections[i]);
        assert.equal(sections[i + 4], 'full');
      }
    }
  }
});

test('each break suppresses only its requested layers and samples are decoded once', async () => {
  const h = setup();
  await h.control({ type: 'start' });
  assert.equal(h.read('Object.keys(sampleBuffers).length'), 9);
  const bank = h.read('sampleBuffers.kickDance');
  await h.control({ type: 'stop' });
  vm.runInContext(`globalThis.layers=[];
    hit=()=>layers.push('drums');
    note=(f,t,l,g,type,end,cutoff,options={})=>layers.push(options.bass?'bass':'music');`, h.sandbox);
  for (const section of ['noDrums', 'noBass', 'rhythmOnly', 'full']) {
    const bar = h.read(`Array.from({length:4000},(_,i)=>i).find(i=>sectionAt(i)==='${section}')`);
    assert.notEqual(bar, undefined, `missing ${section} section`);
    vm.runInContext(`arrangementBar=${bar};layers=[]`, h.sandbox);
    await h.control({ type: 'start' });
    h.advance(0.8);
    const layers = h.read('layers');
    assert.equal(layers.includes('drums'), section !== 'noDrums');
    assert.equal(layers.includes('bass'), section !== 'noBass');
    assert.equal(layers.includes('music'), section !== 'rhythmOnly');
    await h.control({ type: 'stop' });
    assert.equal(h.read('sampleBuffers.kickDance'), bank);
    assert.equal(h.read('reverb.buffer'), null);
  }
});

test('presets preserve arrangement seed/position; old presets still load', async () => {
  const h = setup();
  vm.runInContext('arrangementSeed=42;arrangementBar=77', h.sandbox);
  await h.control({ type: 'snapshot' });
  const saved = h.messages.findLast(m => m.type === 'snapshot').message;
  assert.ok(isMusicSnapshot(saved));
  assert.equal(saved.arrangementSeed, 42);
  assert.equal(saved.arrangementBar, 77);
  const restored = setup();
  await restored.control({ type: 'loadPreset', snapshot: saved });
  assert.equal(restored.read('sectionAt(arrangementBar)'), h.read('sectionAt(arrangementBar)'));
  delete saved.arrangementSeed; delete saved.arrangementBar;
  assert.ok(isMusicSnapshot(saved));
  await restored.control({ type: 'loadPreset', snapshot: saved });
  assert.equal(restored.read('arrangementBar'), 0);
  assert.equal(restored.messages.filter(m => m.type === 'error').length, 0);
});

test('stop while samples are initializing cannot start playback later', async () => {
  const h = setup();
  const starting = h.control({ type: 'start' });
  await h.control({ type: 'stop' });
  await starting;
  assert.equal(h.read('running'), false);
  assert.equal(h.timers.size, 0);
});
