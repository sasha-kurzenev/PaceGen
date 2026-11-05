/** Musical time is stored as integer ticks, independent of BPM and sound source. */
export const TICKS_PER_BEAT = 480;

export type NoteArticulation = 'normal' | 'palmMute' | 'legato' | 'slide' | 'bend';

export type NoteEvent = {
  kind: 'note';
  startTick: number;
  durationTicks: number;
  pitchMidi: number;
  velocity: number;
  instrument: string;
  articulation: NoteArticulation;
  string?: number;
  fret?: number;
};

export type DrumEvent = {
  kind: 'drum';
  startTick: number;
  instrument: string;
  velocity: number;
};

export type MusicEvent = NoteEvent | DrumEvent;

export type MusicFragment = {
  algorithmVersion: number;
  seed: number;
  genre: string;
  key: string;
  bpm: number;
  meter: readonly [number, number];
  barCount: number;
  events: readonly MusicEvent[];
};

export function compareMusicEvents(left: MusicEvent, right: MusicEvent) {
  return left.startTick - right.startTick
    || (left.instrument < right.instrument ? -1 : left.instrument > right.instrument ? 1 : 0)
    || (left.kind === 'note' ? left.pitchMidi : -1) - (right.kind === 'note' ? right.pitchMidi : -1);
}
