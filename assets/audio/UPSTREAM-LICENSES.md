# house-core — license audit manifest

Every shipped sample in this pack is either **synthesized from scratch**
(seeded, deterministic DSP — we own it outright) or an **owned derivative of
verified public-domain source material** (see `sources/`) — raw finds never
ship as-is. The pack as a whole is dedicated to the public domain under
CC0-1.0. Each section below records one sample's origin (`Origin:`) and its
repeatable processing chain (`Processing:`); CI blocks merge unless every
sample in `manifest.json` has a complete section here and vice versa.

## samples/hats/closed-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×1) → bandpass 10000 Hz → decay τ=32 ms → highpass 8000 Hz; seeded sizzle 0.22; peak-normalized, 6 ms fade; rendered length 0.1 s. Repeatable via `npm run generate:kit`.

## samples/hats/closed-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×1.06) → bandpass 10600 Hz → decay τ=36 ms → highpass 8400 Hz; seeded sizzle 0.26; peak-normalized, 6 ms fade; rendered length 0.11 s. Repeatable via `npm run generate:kit`.

## samples/hats/closed-03.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×1.12) → bandpass 11200 Hz → decay τ=40 ms → highpass 8800 Hz; seeded sizzle 0.34; peak-normalized, 6 ms fade; rendered length 0.12 s. Repeatable via `npm run generate:kit`.

## samples/hats/closed-04.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×0.97) → bandpass 9800 Hz → decay τ=24 ms → highpass 8200 Hz; seeded sizzle 0.16; peak-normalized, 6 ms fade; rendered length 0.08 s. Repeatable via `npm run generate:kit`.

## samples/hats/closed-05.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×1.03) → bandpass 10200 Hz → decay τ=50 ms → highpass 7800 Hz; seeded sizzle 0.3; peak-normalized, 6 ms fade; rendered length 0.14 s. Repeatable via `npm run generate:kit`.

## samples/hats/closed-06.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×0.9) → bandpass 9200 Hz → decay τ=30 ms → highpass 7400 Hz; seeded sizzle 0.18; peak-normalized, 6 ms fade; rendered length 0.1 s. Repeatable via `npm run generate:kit`.

## samples/hats/closed-07.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×1) → bandpass 10000 Hz → decay τ=32 ms → highpass 8000 Hz; seeded sizzle 0.2; 6-bit quantize; peak-normalized, 6 ms fade; rendered length 0.1 s. Repeatable via `npm run generate:kit`.

## samples/hats/closed-08.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×1.08) → bandpass 10800 Hz → decay τ=38 ms → highpass 8600 Hz; seeded sizzle 0.28; 6-bit quantize; peak-normalized, 6 ms fade; rendered length 0.12 s. Repeatable via `npm run generate:kit`.

## samples/hats/closed-09.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×1.15) → bandpass 11600 Hz → decay τ=44 ms → highpass 9200 Hz; seeded sizzle 0.4; peak-normalized, 6 ms fade; rendered length 0.13 s. Repeatable via `npm run generate:kit`.

## samples/hats/open-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×1) → bandpass 10000 Hz → decay τ=50 ms/+slow τ=160 ms (0.45) → highpass 7800 Hz; seeded sizzle 0.3; peak-normalized, 6 ms fade; rendered length 0.38 s. Repeatable via `npm run generate:kit`.

## samples/hats/open-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×1.06) → bandpass 10600 Hz → decay τ=55 ms/+slow τ=200 ms (0.5) → highpass 8200 Hz; seeded sizzle 0.34; peak-normalized, 6 ms fade; rendered length 0.5 s. Repeatable via `npm run generate:kit`.

## samples/hats/open-03.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×1.12) → bandpass 11000 Hz → decay τ=60 ms/+slow τ=240 ms (0.55) → highpass 8600 Hz; seeded sizzle 0.42; peak-normalized, 6 ms fade; rendered length 0.58 s. Repeatable via `npm run generate:kit`.

## samples/hats/open-04.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: six-square 808 metallic bank (detune ×0.96) → bandpass 9600 Hz → decay τ=50 ms/+slow τ=170 ms (0.45) → highpass 7600 Hz; seeded sizzle 0.26; 6-bit quantize; peak-normalized, 6 ms fade; rendered length 0.42 s. Repeatable via `npm run generate:kit`.

## samples/claps/classic-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: 909-style clap: seeded noise, 3 bursts every 10 ms (τ=5 ms) + tail τ=60 ms (gain 0.85); double bandpass ~1150 Hz (Q 1.2), highpass 400 Hz, tanh glue, peak-normalized, 10 ms fade; rendered length 0.26 s. Repeatable via `npm run generate:kit`.

## samples/claps/classic-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: 909-style clap: seeded noise, 4 bursts every 11 ms (τ=5 ms) + tail τ=110 ms (gain 0.9); double bandpass ~1000 Hz (Q 0.9), highpass 400 Hz, tanh glue, peak-normalized, 10 ms fade; rendered length 0.34 s. Repeatable via `npm run generate:kit`.

## samples/claps/classic-03.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: 909-style clap: seeded noise, 3 bursts every 8 ms (τ=4 ms) + tail τ=50 ms (gain 0.8); double bandpass ~1400 Hz (Q 1.3), highpass 400 Hz, tanh glue, peak-normalized, 10 ms fade; rendered length 0.24 s. Repeatable via `npm run generate:kit`.

## samples/snares/snap-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: 909-style snare: sine modes 190/340 Hz with fast pitch bend (tone τ=50 ms, gain 0.45); seeded noise split lowpass-7 kHz body (τ=45 ms, 0.5) + highpass-1.8 kHz snap (τ=85 ms, 0.75); tanh glue, peak-normalized, 10 ms fade; rendered length 0.28 s. Repeatable via `npm run generate:kit`.

## samples/snares/body-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: 909-style snare: sine modes 172/316 Hz with fast pitch bend (tone τ=70 ms, gain 0.65); seeded noise split lowpass-7 kHz body (τ=55 ms, 0.6) + highpass-1.8 kHz snap (τ=75 ms, 0.5); tanh glue, peak-normalized, 10 ms fade; rendered length 0.34 s. Repeatable via `npm run generate:kit`.

## samples/percs/tom-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: 909-style tom: damped sine 120 Hz with 35% downward bend (amp τ=90 ms), tanh drive, band-passed noise onset; peak-normalized, 8 ms fade; rendered length 0.35 s. Repeatable via `npm run generate:kit`.

## samples/percs/tom-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: 909-style tom: damped sine 165 Hz with 35% downward bend (amp τ=90 ms), tanh drive, band-passed noise onset; peak-normalized, 8 ms fade; rendered length 0.35 s. Repeatable via `npm run generate:kit`.

## samples/percs/tom-03.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: 909-style tom: damped sine 220 Hz with 35% downward bend (amp τ=90 ms), tanh drive, band-passed noise onset; peak-normalized, 8 ms fade; rendered length 0.35 s. Repeatable via `npm run generate:kit`.

## samples/percs/blip-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: two-partial ping: sine 620 Hz (τ=40 ms) + partial ×2 (τ=25 ms); peak-normalized, 8 ms fade; rendered length 0.18 s. Repeatable via `npm run generate:kit`.

## samples/percs/blip-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: two-partial ping: sine 880 Hz (τ=40 ms) + partial ×2.4 (τ=25 ms); peak-normalized, 8 ms fade; rendered length 0.18 s. Repeatable via `npm run generate:kit`.

## samples/percs/blip-03.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: two-partial ping: sine 1240 Hz (τ=40 ms) + partial ×2.76 (τ=25 ms); peak-normalized, 8 ms fade; rendered length 0.18 s. Repeatable via `npm run generate:kit`.

## samples/percs/tick-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: seeded noise tick: bandpass 4.2 kHz Q 2 (τ=12 ms); peak-normalized, 8 ms fade; rendered length 0.06 s. Repeatable via `npm run generate:kit`.

## samples/percs/tick-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: seeded noise tick: bandpass 2.6 kHz Q 2 (τ=18 ms); peak-normalized, 8 ms fade; rendered length 0.08 s. Repeatable via `npm run generate:kit`.

## samples/percs/shaker-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: 808-maracas shaker: band-passed 5.5 kHz seeded noise, soft attack τ=20 ms, decay τ=55 ms; peak-normalized, 8 ms fade; rendered length 0.16 s. Repeatable via `npm run generate:kit`.

## samples/percs/shaker-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: 808-maracas shaker: band-passed 5.5 kHz seeded noise, attack τ=10 ms, decay τ=40 ms; peak-normalized, 8 ms fade; rendered length 0.13 s. Repeatable via `npm run generate:kit`.

## samples/cymbals/crash-01.wav

- Origin: uzu-drumkit (github.com/tidalcycles/uzu-drumkit, commit `2f3e05c7`), released under The Unlicense (public domain); verbatim copy + sha256 recorded in `sources/uzu-drumkit/PROVENANCE.md`; source file `11_cr_mot4i.wav` (crash).
- Processing: decoded PCM16, stereo mixed to mono, highpass 280 Hz, tanh saturation drive 1.15, peak-normalized to 0.84, 60 ms fade; rendered length 2 s. Repeatable via `npm run generate:kit`.

## samples/cymbals/ride-01.wav

- Origin: uzu-drumkit (github.com/tidalcycles/uzu-drumkit, commit `2f3e05c7`), released under The Unlicense (public domain); verbatim copy + sha256 recorded in `sources/uzu-drumkit/PROVENANCE.md`; source file `10_rd_switchangel.wav` (ride).
- Processing: decoded PCM16 mono, highpass 320 Hz, tanh saturation drive 1.2, peak-normalized to 0.84, 40 ms fade; rendered length 0.929 s. Repeatable via `npm run generate:kit`.

## samples/fx/riser-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: seeded noise, amplitude ramp (progress^1.6), swept bandpass 350 Hz → 5.5 kHz with Q 1 → 6 over 3 s; peak-normalized to 0.8, 30 ms fade; rendered length 3 s. Repeatable via `npm run generate:kit`.

## samples/fx/noise-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: seeded noise bed, lowpass 1.8 kHz, 150 ms fade-in, peak 0.5, 250 ms fade-out, 2 s; rendered length 2 s. Repeatable via `npm run generate:kit`.

## samples/kicks/sub-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^1.4 above F1 decaying τ=22 ms onto the root, amplitude τ=160 ms; tanh drive 1.3 with transient bloom 0.6; band-passed seeded-noise click (1800 Hz, gain 0.1); lowpass 900 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.62 s. Repeatable via `npm run generate:kit`.

## samples/kicks/sub-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^1.4 above G1 decaying τ=22 ms onto the root, amplitude τ=150 ms; tanh drive 1.35 with transient bloom 0.6; band-passed seeded-noise click (1800 Hz, gain 0.1); lowpass 950 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.6 s. Repeatable via `npm run generate:kit`.

## samples/kicks/sub-03.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^1.3 above A1 decaying τ=20 ms onto the root, amplitude τ=140 ms; tanh drive 1.3 with transient bloom 0.5; band-passed seeded-noise click (1700 Hz, gain 0.09); lowpass 1000 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.56 s. Repeatable via `npm run generate:kit`.

## samples/kicks/punch-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^2.4 above F1 decaying τ=30 ms onto the root, amplitude τ=85 ms; tanh drive 2.2 with transient bloom 1.2; band-passed seeded-noise click (2600 Hz, gain 0.32); lowpass 3200 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.46 s. Repeatable via `npm run generate:kit`.

## samples/kicks/punch-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^2.4 above G1 decaying τ=30 ms onto the root, amplitude τ=85 ms; tanh drive 2.2 with transient bloom 1.2; band-passed seeded-noise click (2600 Hz, gain 0.32); lowpass 3200 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.46 s. Repeatable via `npm run generate:kit`.

## samples/kicks/punch-03.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^2.6 above A1 decaying τ=32 ms onto the root, amplitude τ=80 ms; tanh drive 2.4 with transient bloom 1.4; band-passed seeded-noise click (3000 Hz, gain 0.36); lowpass 3800 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.44 s. Repeatable via `npm run generate:kit`.

## samples/kicks/punch-04.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^2.6 above A#1 decaying τ=32 ms onto the root, amplitude τ=80 ms; tanh drive 2.4 with transient bloom 1.4; band-passed seeded-noise click (3000 Hz, gain 0.36); lowpass 3800 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.44 s. Repeatable via `npm run generate:kit`.

## samples/kicks/deep-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^1.8 above C2 decaying τ=26 ms onto the root, amplitude τ=110 ms; tanh drive 1.7 with transient bloom 0.9; band-passed seeded-noise click (2200 Hz, gain 0.18); lowpass 1600 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.5 s. Repeatable via `npm run generate:kit`.

## samples/kicks/deep-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^1.8 above D2 decaying τ=26 ms onto the root, amplitude τ=105 ms; tanh drive 1.7 with transient bloom 0.9; band-passed seeded-noise click (2200 Hz, gain 0.18); lowpass 1700 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.48 s. Repeatable via `npm run generate:kit`.

## samples/kicks/tight-01.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^2.8 above F1 decaying τ=24 ms onto the root, amplitude τ=50 ms; tanh drive 2.6 with transient bloom 1.6; band-passed seeded-noise click (3400 Hz, gain 0.42); lowpass 4200 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.3 s. Repeatable via `npm run generate:kit`.

## samples/kicks/tight-02.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^2.8 above G1 decaying τ=24 ms onto the root, amplitude τ=50 ms; tanh drive 2.6 with transient bloom 1.6; band-passed seeded-noise click (3400 Hz, gain 0.42); lowpass 4200 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.3 s. Repeatable via `npm run generate:kit`.

## samples/kicks/tight-03.wav

- Origin: own synthesis — rendered deterministically by `scripts/generate-kit.ts` (seeded DSP, no external source material); dedicated CC0-1.0.
- Processing: sine body, pitch 2^3 above A1 decaying τ=22 ms onto the root, amplitude τ=45 ms; tanh drive 2.8 with transient bloom 1.8; band-passed seeded-noise click (3800 Hz, gain 0.46); lowpass 4600 Hz, highpass 25 Hz, peak-normalized to -1 dBFS, 8 ms fade; rendered length 0.28 s. Repeatable via `npm run generate:kit`.
