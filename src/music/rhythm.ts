import { createMusicRng, deriveMusicSeed } from './rng.ts';
import { type RockSection } from './profiles.ts';
import { TICKS_PER_BEAT } from './events.ts';

export const BAR_TICKS = TICKS_PER_BEAT * 4;

export function guitarAttacks(section: RockSection, seed: number, bar: number) {
  const rng = createMusicRng(deriveMusicSeed(seed, `rhythm-guitar:${bar}`));
  if (section === 'intro' || section === 'outro' || section === 'bridge') {
    return [0, 2 * TICKS_PER_BEAT];
  }
  const attacks = Array.from({ length: 8 }, (_, index) => index * TICKS_PER_BEAT / 2);
  if (section === 'development') return attacks.filter((_, index) => index % 2 === 0 || rng.nextInt(5) !== 0);
  if (section === 'theme') return attacks.filter((_, index) => index % 2 === 0 || rng.nextInt(7) !== 0);
  return attacks;
}

export function leadAttacks(section: RockSection, seed: number, bar: number) {
  if (section === 'intro' || (section === 'outro' && bar >= 30)) return [];
  const rng = createMusicRng(deriveMusicSeed(seed, `lead-rhythm:${bar % 4}`));
  const eighths = Array.from({ length: 8 }, (_, index) => index * TICKS_PER_BEAT / 2);
  if (section === 'bridge' || section === 'outro') return eighths.filter((_, index) => index % 2 === 0);
  return eighths.filter((_, index) => index % 4 === 0 || rng.nextInt(6) !== 0);
}
