import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMusicRng, deriveMusicSeed, MUSIC_ALGORITHM_VERSION } from '../src/music/rng.ts';
import { compareMusicEvents, TICKS_PER_BEAT } from '../src/music/events.ts';

test('algorithm v1 reproduces its golden uint32 sequence', () => {
  assert.equal(MUSIC_ALGORITHM_VERSION, 1);
  const expected = [3809008728, 1133695204, 53579671, 2891528803, 139681546, 2203266335];
  const first = createMusicRng(0);
  assert.deepEqual(expected.map(() => first.nextUint32()), expected);
  const replay = createMusicRng(0);
  assert.deepEqual(expected.map(() => replay.nextUint32()), expected);
  const different = createMusicRng(1);
  assert.notDeepEqual(expected.map(() => different.nextUint32()), expected);
});

test('named parts get stable independent streams and bounded choices', () => {
  const guitar = deriveMusicSeed(123, 'guitar');
  const bass = deriveMusicSeed(123, 'bass');
  assert.equal(guitar, 813274864);
  assert.equal(bass, 3788684325);
  assert.notEqual(guitar, bass);
  const rng = createMusicRng(guitar);
  for (let index = 0; index < 2000; index++) {
    const choice = rng.nextInt(7);
    assert.ok(choice >= 0 && choice < 7);
  }
  for (const invalid of [-1, 2 ** 32, 1.5, NaN]) assert.throws(() => createMusicRng(invalid));
  for (const invalid of [0, -1, 1.5, 2 ** 32 + 1]) assert.throws(() => rng.nextInt(invalid));
});

test('music events sort by integer time and code-unit instrument name', () => {
  assert.equal(TICKS_PER_BEAT, 480);
  const events = [
    { kind: 'note', startTick: 480, durationTicks: 240, pitchMidi: 45, velocity: 80, instrument: 'guitar', articulation: 'normal' },
    { kind: 'drum', startTick: 0, velocity: 90, instrument: 'kick' },
    { kind: 'note', startTick: 0, durationTicks: 120, pitchMidi: 52, velocity: 70, instrument: 'guitar', articulation: 'palmMute' },
    { kind: 'note', startTick: 0, durationTicks: 120, pitchMidi: 45, velocity: 70, instrument: 'guitar', articulation: 'palmMute' },
  ];
  assert.deepEqual(events.sort(compareMusicEvents).map(event => `${event.startTick}:${event.instrument}:${event.pitchMidi ?? '-'}`),
    ['0:guitar:45', '0:guitar:52', '0:kick:-', '480:guitar:45']);
});
