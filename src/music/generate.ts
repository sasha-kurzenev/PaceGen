import { type MusicEvent, type MusicFragment, compareMusicEvents } from './events.ts';
import { melodicRockProfile } from './profiles.ts';
import { MUSIC_ALGORITHM_VERSION } from './rng.ts';
import { chordForBar, sectionForBar } from './harmony.ts';
import { leadForBar } from './melody.ts';
import { arrangeBar } from './arrangement.ts';
import { humanizeEvent } from './humanize.ts';

export function generateRockFragment(seed: number, bpm: number = melodicRockProfile.bpm.default): MusicFragment {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('Seed must be a uint32');
  if (!Number.isInteger(bpm) || bpm < melodicRockProfile.bpm.minimum || bpm > melodicRockProfile.bpm.maximum) {
    throw new RangeError('BPM outside melodic-rock profile');
  }
  const events: MusicEvent[] = [];
  for (let bar = 0; bar < melodicRockProfile.barCount; bar++) {
    const section = sectionForBar(bar);
    const chord = chordForBar(seed, bar);
    events.push(...arrangeBar(seed, bar, chord, section, leadForBar(seed, bar, chord, section)));
  }
  return {
    algorithmVersion: MUSIC_ALGORITHM_VERSION,
    seed, genre: melodicRockProfile.id, key: melodicRockProfile.key, bpm,
    meter: melodicRockProfile.meter,
    barCount: melodicRockProfile.barCount,
    events: events.map(event => humanizeEvent(seed, event)).sort(compareMusicEvents),
  };
}
