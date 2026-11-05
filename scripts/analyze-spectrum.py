"""Measure band RMS in local PCM WAVs; compare renders with the same seed/tempo."""
import argparse
import json
from pathlib import Path
import wave

import numpy as np

BANDS = [(30, 100), (100, 200), (200, 1000), (1000, 6000), (6000, 16000)]


def analyze(path):
    with wave.open(str(path), 'rb') as stream:
        rate, channels, width = stream.getframerate(), stream.getnchannels(), stream.getsampwidth()
        raw = stream.readframes(stream.getnframes())
    if width == 2:
        samples = np.frombuffer(raw, dtype='<i2').astype(float) / 32768
    elif width == 3:
        data = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3).astype(np.int32)
        data = data[:, 0] | (data[:, 1] << 8) | (data[:, 2] << 16)
        samples = ((data ^ 0x800000) - 0x800000) / 8388608
    elif width == 4:
        samples = np.frombuffer(raw, dtype='<i4').astype(float) / 2147483648
    else:
        raise ValueError(f'Unsupported PCM width: {width}')
    samples = samples.reshape(-1, channels)
    size = min(8192, len(samples))
    window = np.hanning(size)
    energy = []
    for start in range(0, len(samples) - size + 1, max(1, size // 2)):
        fft = np.fft.rfft(samples[start:start + size] * window[:, None], axis=0)
        power = np.mean(np.abs(fft) ** 2, axis=1) / (size * np.sum(window ** 2))
        power[1:-1] *= 2
        energy.append(power)
    power = np.mean(energy, axis=0)
    frequencies = np.fft.rfftfreq(size, 1 / rate)
    bands = {}
    for low, high in BANDS:
        level = np.sum(power[(frequencies >= low) & (frequencies < high)])
        bands[f'{low}-{high}'] = round(float(10 * np.log10(max(1e-15, level))), 2)
    return {'peak': round(float(np.max(np.abs(samples))), 4),
            'rms_dbfs': round(float(20 * np.log10(max(1e-15, np.sqrt(np.mean(samples ** 2))))), 2),
            'band_rms_dbfs': bands}


parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
result = {path.stem: analyze(path) for path in sorted(args.directory.glob('*.wav'))}
text = json.dumps(result, indent=2)
if args.output:
    args.output.write_text(text + '\n', encoding='utf-8')
print(text)
