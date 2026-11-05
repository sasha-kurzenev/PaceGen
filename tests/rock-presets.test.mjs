import test from 'node:test';
import assert from 'node:assert/strict';
import { isRockPreset, parseRockPresets } from '../src/music/rockPresets.ts';

test('rock presets preserve seed, tempo and version without accepting malformed entries', () => {
  const good = { id: 'a', algorithmVersion: 1, seed: 20261105, bpm: 120, volume: 0.55 };
  assert.equal(isRockPreset(good), true);
  assert.deepEqual(parseRockPresets(JSON.stringify([good, { ...good }, { ...good, id: 'b', seed: -1 }])), [good]);
  assert.equal(isRockPreset({ ...good, algorithmVersion: 2 }), false);
  assert.equal(isRockPreset({ ...good, bpm: 151 }), false);
  assert.throws(() => parseRockPresets('{}'));
});
