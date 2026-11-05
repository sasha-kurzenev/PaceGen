/** Musical data for the first original melodic-rock experiment. */
export const melodicRockProfile = {
  id: 'melodicRock',
  name: 'Мелодичный рок',
  bpm: { minimum: 100, maximum: 150, default: 120 },
  key: 'A minor',
  meter: [4, 4] as const,
  barCount: 32,
  chords: {
    A5: { rootMidi: 45, tones: [69, 72, 76], fingering: [{ string: 5, fret: 0, pitchMidi: 45 }, { string: 4, fret: 2, pitchMidi: 52 }] },
    F5: { rootMidi: 41, tones: [65, 69, 72, 77], fingering: [{ string: 6, fret: 1, pitchMidi: 41 }, { string: 5, fret: 3, pitchMidi: 48 }] },
    C5: { rootMidi: 48, tones: [67, 72, 76], fingering: [{ string: 5, fret: 3, pitchMidi: 48 }, { string: 4, fret: 5, pitchMidi: 55 }] },
    G5: { rootMidi: 43, tones: [67, 71, 74, 79], fingering: [{ string: 6, fret: 3, pitchMidi: 43 }, { string: 5, fret: 5, pitchMidi: 50 }] },
  },
  progressions: [
    ['A5', 'F5', 'C5', 'G5'],
    ['A5', 'G5', 'F5', 'C5'],
    ['A5', 'C5', 'G5', 'F5'],
  ],
  bridge: ['F5', 'G5', 'A5', 'A5'],
} as const;

export type RockChord = keyof typeof melodicRockProfile.chords;
export type RockSection = 'intro' | 'theme' | 'development' | 'bridge' | 'climax' | 'outro';
