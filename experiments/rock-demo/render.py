"""Offline preview of the pure TypeScript rock events. Requires NumPy and spike assets."""

import argparse
import json
import math
from pathlib import Path
import struct
import sys
import wave

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "experiments/guitar-spike"))
from render import RATE, SAMPLES, read_wav, sfz_regions, sample_voice, write_wav, midi_varlen  # noqa: E402

TICKS_PER_BEAT = 480
DRUM_FILES = {"kick": "kickHouse.wav", "snare": "snare.wav",
              "hat": "closedHat.wav", "openHat": "openHat.wav"}
DRUM_MIDI = {"kick": 36, "snare": 38, "hat": 42, "openHat": 46}


def put(stem, voice, start, gain=1.0, pan=0.0):
    end = min(len(stem), start + len(voice))
    if start >= end:
        return
    voice = voice[:end - start] * gain
    stem[start:end, 0] += voice * math.sqrt((1 - pan) / 2)
    stem[start:end, 1] += voice * math.sqrt((1 + pan) / 2)


def bass_voice(note, count):
    frequency = 440 * 2 ** ((note - 69) / 12)
    phase = 2 * np.pi * frequency * np.arange(count) / RATE
    voice = np.sin(phase) * 0.75 + np.sin(2 * phase) * 0.20 + np.sin(3 * phase) * 0.05
    attack = min(count, round(0.008 * RATE))
    release = min(count, round(0.09 * RATE))
    voice[:attack] *= np.linspace(0, 1, attack)
    voice[-release:] *= np.linspace(1, 0, release)
    return voice


def save_midi(path, fragment):
    """Four GM tracks, retaining exact event tick positions and velocities."""
    bpm = fragment["bpm"]
    tracks = []
    for name, channel, program in (("rhythmGuitar", 0, 30), ("leadGuitar", 1, 26),
                                   ("bass", 2, 33), ("drums", 9, None)):
        commands = [(0, 0, b"\xff\x51\x03" + round(60_000_000 / bpm).to_bytes(3, "big"))]
        if program is not None:
            commands.append((0, 1, bytes((0xc0 | channel, program))))
        for event in fragment["events"]:
            if event["instrument"] != name and not (name == "drums" and event["kind"] == "drum"):
                continue
            pitch = event["pitchMidi"] if event["kind"] == "note" else DRUM_MIDI[event["instrument"]]
            start = event["startTick"]
            end = start + event.get("durationTicks", 65)
            commands.extend(((start, 2, bytes((0x90 | channel, pitch, event["velocity"]))),
                             (end, 0, bytes((0x80 | channel, pitch, 0)))))
        commands.sort(key=lambda item: (item[0], item[1]))
        data = bytearray()
        previous = 0
        for tick, _, message in commands:
            data += midi_varlen(tick - previous) + message
            previous = tick
        data += b"\x00\xff\x2f\x00"
        tracks.append(b"MTrk" + struct.pack(">I", len(data)) + data)
    path.write_bytes(b"MThd" + struct.pack(">IHHH", 6, 1, len(tracks), TICKS_PER_BEAT) + b"".join(tracks))


def render(fragment):
    duration = fragment["barCount"] * 4 * 60 / fragment["bpm"] + 1.2
    length = round(duration * RATE)
    stems = {name: np.zeros((length, 2), dtype=np.float32)
             for name in ("rhythmGuitar", "leadGuitar", "bass", "drums")}
    regions = sfz_regions(next(SAMPLES.glob("*.sfz")))
    sample_cache = {}
    drum_cache = {name: read_wav(ROOT / "assets/audio" / file)[:, 0]
                  for name, file in DRUM_FILES.items()}
    for event in fragment["events"]:
        start = round(event["startTick"] * 60 * RATE / (TICKS_PER_BEAT * fragment["bpm"]))
        gain = event["velocity"] / 100
        name = event["instrument"]
        if event["kind"] == "drum":
            put(stems["drums"], drum_cache[name], start, gain * 0.78)
        elif name == "bass":
            count = round(event["durationTicks"] * 60 * RATE / (TICKS_PER_BEAT * fragment["bpm"]))
            put(stems[name], bass_voice(event["pitchMidi"], count), start, gain * 0.36)
        else:
            region = next(r for r in regions if r["low"] <= event["pitchMidi"] <= r["high"])
            requested = event["durationTicks"] * 60 / (TICKS_PER_BEAT * fragment["bpm"])
            if region["file"] not in sample_cache:
                sample_cache[region["file"]] = read_wav(region["file"])
            source_length = len(sample_cache[region["file"]]) / RATE
            playback_rate = 2 ** ((event["pitchMidi"] - region["center"]) / 12)
            seconds = min(requested, (source_length - 0.01) / playback_rate)
            voice = sample_voice(region, event["pitchMidi"], seconds,
                                 event["articulation"] == "palmMute", sample_cache)
            if name == "rhythmGuitar":
                voice = np.tanh(voice * 3.2) * 0.20
                pan = -0.31 if event.get("string", 5) == 6 else 0.31
            else:
                voice = np.tanh(voice * 1.8) * 0.22
                pan = 0.06
            put(stems[name], voice, start, gain, pan)
    lead = stems["leadGuitar"]
    delay = round(0.21 * RATE)
    lead[delay:] += lead[:-delay].copy() * 0.13
    rhythm = stems["rhythmGuitar"]
    delay = round(0.115 * RATE)
    rhythm[delay:] += rhythm[:-delay].copy() * 0.08
    mix = sum(stems.values())
    mix = np.tanh(mix * 1.4)
    peak = np.max(np.abs(mix))
    if peak < 1e-6:
        raise ValueError("Silent render")
    mix *= 0.93 / peak
    return mix, {"seconds": round(duration, 2), "peakBeforeGain": round(float(peak), 4),
                 "stems": {key: round(float(np.sqrt(np.mean(value ** 2))), 5) for key, value in stems.items()}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("fragment", type=Path)
    args = parser.parse_args()
    fragment = json.loads(args.fragment.read_text(encoding="utf-8"))
    if fragment["algorithmVersion"] != 1 or fragment["meter"] != [4, 4]:
        raise ValueError("Unsupported fragment format")
    output = args.fragment.parent
    save_midi(output / "fragment.mid", fragment)
    mix, metrics = render(fragment)
    write_wav(output / "fragment.wav", mix)
    (output / "render-metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics))


if __name__ == "__main__":
    main()
