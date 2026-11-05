import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CadenceDetector } from '../src/cadence.ts';

test('stationary sensor and small noise do not produce cadence', () => {
  const detector = new CadenceDetector();
  for (let t = 10000; t < 20000; t += 20) assert.equal(detector.sample(0, 0, 1 + 0.02 * Math.sin(t), t), null);
});
for (const bpm of [100, 140, 160, 180, 200]) {
  test(`detects ${bpm} steps/min on different phone orientations`, () => {
    for (const axis of [0, 1, 2]) {
      const detector = new CadenceDetector();
      let estimate = null;
      for (let t = 0; t < 12000; t += 20) {
        const coordinates = [0, 0, 0];
        coordinates[axis] = 1 + 0.55 * Math.sin(2 * Math.PI * t / (60000 / bpm));
        estimate = detector.sample(...coordinates, t + 10000) ?? estimate;
      }
      assert.ok(Math.abs(estimate - bpm) <= 3, `received ${estimate}`);
    }
  });
}
test('pause clears old intervals before measuring a new cadence', () => {
  const detector = new CadenceDetector();
  for (let t = 0; t < 6000; t += 20) detector.sample(0, 0, 1 + 0.55 * Math.sin(2 * Math.PI * t / 375), t + 10000);
  for (let t = 16000; t < 20000; t += 20) assert.equal(detector.sample(0, 0, 1, t), null);
  let estimate = null;
  for (let t = 0; t < 6000; t += 20) estimate = detector.sample(0, 0, 1 + 0.55 * Math.sin(2 * Math.PI * t / 500), t + 20000) ?? estimate;
  assert.ok(Math.abs(estimate - 120) <= 3);
});
