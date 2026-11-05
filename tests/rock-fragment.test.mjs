import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateRockFragment } from '../src/music/generate.ts';
import { chordForBar, sectionForBar } from '../src/music/harmony.ts';
import { melodicRockProfile } from '../src/music/profiles.ts';
import { makeMotif } from '../src/music/melody.ts';
import { BAR_TICKS } from '../src/music/rhythm.ts';

const seed = 20261105;
const hash = events => createHash('sha256').update(JSON.stringify(events)).digest('hex');

test('rock fragment is deterministic, versioned, and spans 32 bars', () => {
  const first = generateRockFragment(seed, 120);
  assert.deepEqual(first, generateRockFragment(seed, 120));
  assert.equal(first.algorithmVersion, 1);
  assert.equal(first.barCount, 32);
  assert.equal(first.genre, 'melodicRock');
  assert.equal(hash(first.events), 'a8e467a86167ea29de5fd777052d68dcbf2dd7358e32ee3edfdff10e0c127c21');
  assert.notEqual(hash(first.events), hash(generateRockFragment(seed + 1, 120).events));
  assert.equal(first.events.length, 966);
  assert.ok(first.events.every(event => event.startTick >= 0 && event.startTick < 32 * BAR_TICKS));
  assert.ok(first.events.every(event => event.velocity >= 1 && event.velocity <= 127));
});

test('guitar voicings are playable and bass follows each chord root', () => {
  const fragment = generateRockFragment(seed);
  const tuning = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
  for (const event of fragment.events) {
    if (event.kind !== 'note') continue;
    assert.ok(event.durationTicks > 0);
    if (event.instrument === 'bass') {
      const bar = Math.floor(event.startTick / BAR_TICKS);
      assert.equal(event.pitchMidi, melodicRockProfile.chords[chordForBar(seed, bar)].rootMidi - 12);
    } else {
      assert.equal(event.pitchMidi, tuning[event.string] + event.fret);
      assert.ok(event.fret >= 0 && event.fret <= 15);
    }
  }
});

test('theme returns with variation across composition sections', () => {
  assert.equal(makeMotif(seed).length, 8);
  assert.equal(sectionForBar(0), 'intro');
  assert.equal(sectionForBar(4), 'theme');
  assert.equal(sectionForBar(12), 'development');
  assert.equal(sectionForBar(20), 'bridge');
  assert.equal(sectionForBar(24), 'climax');
  assert.equal(sectionForBar(28), 'outro');
  const events = generateRockFragment(seed).events;
  const leadCount = bar => events.filter(event => event.instrument === 'leadGuitar'
    && event.startTick >= bar * BAR_TICKS && event.startTick < (bar + 1) * BAR_TICKS).length;
  assert.equal(leadCount(0), 0);
  assert.ok(leadCount(4) > 0);
  assert.ok(leadCount(16) > 0);
  assert.ok(leadCount(24) > 0);
  assert.equal(leadCount(31), 0);
  assert.deepEqual([4, 8, 12, 16].map(bar => chordForBar(seed, bar)), Array(4).fill(chordForBar(seed, 4)));
});

test('seed and tempo inputs are bounded', () => {
  for (const invalidSeed of [-1, 1.5, 0x100000000, NaN]) assert.throws(() => generateRockFragment(invalidSeed));
  for (const invalidBpm of [99, 151, 120.5, NaN]) assert.throws(() => generateRockFragment(seed, invalidBpm));
  assert.equal(generateRockFragment(seed, 140).bpm, 140);
});
