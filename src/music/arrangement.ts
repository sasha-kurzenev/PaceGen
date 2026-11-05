import { type DrumEvent, type MusicEvent, type NoteEvent, TICKS_PER_BEAT } from './events.ts';
import { melodicRockProfile, type RockChord, type RockSection } from './profiles.ts';
import { BAR_TICKS, guitarAttacks } from './rhythm.ts';

export function rhythmGuitarForBar(seed: number, bar: number, chord: RockChord, section: RockSection): NoteEvent[] {
  const fingering = melodicRockProfile.chords[chord].fingering;
  const sparse = section === 'intro' || section === 'bridge' || section === 'outro';
  return guitarAttacks(section, seed, bar).flatMap((tick, attack) => {
    const articulation = sparse || attack % 4 === 0 ? 'normal' : 'palmMute';
    const durationTicks = sparse ? 650 : articulation === 'normal' ? 300 : 140;
    return fingering.map((finger, stringIndex) => ({
      kind: 'note' as const,
      startTick: bar * BAR_TICKS + tick + stringIndex * 8,
      durationTicks,
      pitchMidi: finger.pitchMidi,
      velocity: (section === 'climax' ? 102 : 88) - (articulation === 'palmMute' ? 20 : 0),
      instrument: 'rhythmGuitar', articulation,
      string: finger.string, fret: finger.fret,
    }));
  });
}

export function bassForBar(bar: number, chord: RockChord, section: RockSection): NoteEvent[] {
  if (section === 'intro' && bar < 2) return [];
  const root = melodicRockProfile.chords[chord].rootMidi - 12;
  const ticks = section === 'intro' || section === 'outro'
    ? [0, 2 * TICKS_PER_BEAT]
    : section === 'development' || section === 'climax'
      ? [0, TICKS_PER_BEAT, 2 * TICKS_PER_BEAT, 2.5 * TICKS_PER_BEAT, 3 * TICKS_PER_BEAT]
      : [0, TICKS_PER_BEAT, 2 * TICKS_PER_BEAT, 3 * TICKS_PER_BEAT];
  return ticks.map(tick => ({
    kind: 'note', startTick: bar * BAR_TICKS + tick,
    durationTicks: section === 'bridge' ? 420 : 340,
    pitchMidi: root, velocity: tick === 0 ? 94 : 82,
    instrument: 'bass', articulation: 'normal',
  }));
}

export function drumsForBar(bar: number, section: RockSection): DrumEvent[] {
  if (section === 'intro' && bar < 2) return [];
  const subdued = section === 'intro' || section === 'outro';
  const notes: DrumEvent[] = [];
  const add = (instrument: string, tick: number, velocity: number) => {
    notes.push({ kind: 'drum', startTick: bar * BAR_TICKS + tick, instrument, velocity });
  };
  for (let beat = 0; beat < 4; beat++) {
    const tick = beat * TICKS_PER_BEAT;
    if (beat === 0 || beat === 2 || section === 'climax' && beat === 3) add('kick', tick, beat === 0 ? 105 : 90);
    if (beat === 1 || beat === 3) add('snare', tick, subdued ? 64 : 98);
  }
  const hatStep = subdued ? TICKS_PER_BEAT : TICKS_PER_BEAT / 2;
  for (let tick = 0; tick < BAR_TICKS; tick += hatStep) {
    add(section === 'climax' && tick === BAR_TICKS - hatStep ? 'openHat' : 'hat', tick, tick % TICKS_PER_BEAT === 0 ? 76 : 56);
  }
  return notes;
}

export function arrangeBar(seed: number, bar: number, chord: RockChord, section: RockSection, lead: NoteEvent[]): MusicEvent[] {
  return [
    ...rhythmGuitarForBar(seed, bar, chord, section),
    ...bassForBar(bar, chord, section),
    ...drumsForBar(bar, section),
    ...lead,
  ];
}
