import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { generateRockFragment } from '../../src/music/generate.ts';

const seed = Number(process.argv[2] ?? 20261105);
const bpm = Number(process.argv[3] ?? 120);
const output = resolve(process.argv[4] ?? '.expo/rock-demo/fragment.json');
const fragment = generateRockFragment(seed, bpm);
const json = `${JSON.stringify(fragment, null, 2)}\n`;
await mkdir(dirname(output), { recursive: true });
await writeFile(output, json);
console.log(JSON.stringify({ output, seed, bpm, bars: fragment.barCount, events: fragment.events.length,
  eventSha256: createHash('sha256').update(JSON.stringify(fragment.events)).digest('hex') }));
