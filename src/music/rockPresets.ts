import { MUSIC_ALGORITHM_VERSION } from './rng.ts';
import { melodicRockProfile } from './profiles.ts';

export type RockPreset = {
  id: string;
  algorithmVersion: number;
  seed: number;
  bpm: number;
  volume: number;
};

export function isRockPreset(value: unknown): value is RockPreset {
  if (!value || typeof value !== 'object') return false;
  const preset = value as RockPreset;
  return typeof preset.id === 'string' && preset.id.length > 0
    && preset.algorithmVersion === MUSIC_ALGORITHM_VERSION
    && Number.isInteger(preset.seed) && preset.seed >= 0 && preset.seed <= 0xffffffff
    && Number.isInteger(preset.bpm) && preset.bpm >= melodicRockProfile.bpm.minimum
    && preset.bpm <= melodicRockProfile.bpm.maximum
    && Number.isFinite(preset.volume) && preset.volume >= 0 && preset.volume <= 1;
}

export function parseRockPresets(raw: string | null): RockPreset[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error('Invalid rock preset list');
  const ids = new Set<string>();
  return value.filter((item): item is RockPreset => {
    if (!isRockPreset(item) || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  }).slice(0, 10);
}
