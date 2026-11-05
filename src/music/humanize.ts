import { type MusicEvent } from './events.ts';
import { createMusicRng, deriveMusicSeed } from './rng.ts';
import { TICKS_PER_BEAT } from './events.ts';

export function humanizeEvent(seed: number, event: MusicEvent): MusicEvent {
  const identity = `${event.instrument}:${event.startTick}:${event.kind === 'note' ? event.pitchMidi : 0}`;
  const rng = createMusicRng(deriveMusicSeed(seed, `humanize:${identity}`));
  const maximum = event.instrument === 'leadGuitar' ? 8 : event.instrument === 'rhythmGuitar' ? 2 : 4;
  const offset = rng.nextInt(maximum * 2 + 1) - maximum;
  const velocity = Math.max(1, Math.min(127, event.velocity + rng.nextInt(11) - 5));
  const barStart = Math.floor(event.startTick / (TICKS_PER_BEAT * 4)) * TICKS_PER_BEAT * 4;
  return { ...event, startTick: Math.max(barStart, event.startTick + offset), velocity };
}
