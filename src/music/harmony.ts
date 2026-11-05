import { createMusicRng, deriveMusicSeed } from './rng.ts';
import { melodicRockProfile, type RockChord, type RockSection } from './profiles.ts';

export function sectionForBar(bar: number): RockSection {
  if (!Number.isInteger(bar) || bar < 0 || bar >= melodicRockProfile.barCount) throw new RangeError('Invalid bar');
  if (bar < 4) return 'intro';
  if (bar < 12) return 'theme';
  if (bar < 20) return 'development';
  if (bar < 24) return 'bridge';
  if (bar < 28) return 'climax';
  return 'outro';
}

export function chordForBar(seed: number, bar: number): RockChord {
  const section = sectionForBar(bar);
  if (section === 'bridge') return melodicRockProfile.bridge[bar - 20];
  const selector = createMusicRng(deriveMusicSeed(seed, 'harmony'));
  const progression = melodicRockProfile.progressions[selector.nextInt(melodicRockProfile.progressions.length)];
  return progression[bar % 4];
}
