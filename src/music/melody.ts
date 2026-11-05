import { createMusicRng, deriveMusicSeed } from './rng.ts';
import { type RockChord, type RockSection, melodicRockProfile } from './profiles.ts';
import { type NoteEvent, TICKS_PER_BEAT } from './events.ts';
import { leadAttacks, BAR_TICKS } from './rhythm.ts';

const SCALE = [64, 65, 67, 69, 71, 72, 74, 76, 77, 79]; // E4–G5 in A natural minor.

export function makeMotif(seed: number) {
  const rng = createMusicRng(deriveMusicSeed(seed, 'lead-motif'));
  let degree = 3 + rng.nextInt(3);
  let previousMove = 1;
  const degrees: number[] = [];
  for (let index = 0; index < 8; index++) {
    if (index > 0) {
      const choices = previousMove > 0 ? [-2, -1, -1, 0, 1, 1, 2] : [-2, -1, 0, 1, 1, 2, 2];
      const move = choices[rng.nextInt(choices.length)];
      degree = Math.max(1, Math.min(SCALE.length - 2, degree + move));
      if (move !== 0) previousMove = move;
    }
    degrees.push(degree);
  }
  return degrees;
}

function nearestChordTone(pitch: number, chord: RockChord) {
  const tones: readonly number[] = melodicRockProfile.chords[chord].tones;
  return tones.reduce((best, tone) => Math.abs(tone - pitch) < Math.abs(best - pitch) ? tone : best, tones[0]);
}

export function leadForBar(seed: number, bar: number, chord: RockChord, section: RockSection): NoteEvent[] {
  const motif = makeMotif(seed);
  const variation = createMusicRng(deriveMusicSeed(seed, `lead-variation:${bar}`));
  return leadAttacks(section, seed, bar).map(tick => {
    const index = tick / (TICKS_PER_BEAT / 2);
    let degree = motif[index];
    if (section === 'development' && index % 4 !== 0 && variation.nextInt(4) === 0) {
      degree = Math.max(0, Math.min(SCALE.length - 1, degree + (variation.nextInt(2) ? 1 : -1)));
    }
    if (section === 'climax' && index === 7) degree = Math.min(SCALE.length - 1, degree + 1);
    const pitchMidi = index % 4 === 0 ? nearestChordTone(SCALE[degree], chord) : SCALE[degree];
    return {
      kind: 'note', startTick: bar * BAR_TICKS + tick,
      durationTicks: tick === 7 * TICKS_PER_BEAT / 2 ? 500 : 300,
      pitchMidi, velocity: section === 'climax' ? 98 : 82,
      instrument: 'leadGuitar', articulation: 'normal', string: 1, fret: pitchMidi - 64,
    };
  });
}
