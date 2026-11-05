"""Render the same four-bar guitar riff with SF2, WAV samples and Karplus–Strong.

Requirements: Python 3 with NumPy, FreePats small SF2/SFZ+WAV archives and
FluidSynth CLI. Sources and download hashes are documented in README.md.
No generated audio or third-party assets are part of the Android app.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import random
import shutil
import struct
import subprocess
import time
import wave

import numpy as np


RATE = 44100
ROOT = Path(__file__).resolve().parent
SAMPLES = ROOT.parents[1] / ".expo/guitar-spike/sfz/EGuitarFSBS-clean bridge small SFZ+WAV-20260807"
SF2 = ROOT.parents[1] / ".expo/guitar-spike/sf2/EGuitarFSBS-clean bridge small SF2-20260807/EGuitarFSBS-clean bridge small 20260807.sf2"
FLUID = ROOT.parents[1] / ".expo/guitar-spike/fluidsynth/fluidsynth-v2.6.2-win10-x64-cpp11/bin/fluidsynth.exe"
OUT = ROOT.parents[1] / ".expo/guitar-spike/output"


def read_wav(path):
    with wave.open(str(path), "rb") as wav:
        assert wav.getframerate() == RATE and wav.getsampwidth() == 2
        data = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2").astype(np.float64) / 32768
        return data.reshape(-1, wav.getnchannels())


def write_wav(path, audio):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = np.clip(audio, -1, 1)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes((data * 32767).astype("<i2").tobytes())


def events(fixture):
    seconds_per_beat = 60 / fixture["bpm"]
    for bar_index, bar in enumerate(fixture["bars"]):
        for attack_index, (beat, articulation) in enumerate(zip(bar["attacksBeats"], bar["articulations"])):
            assert articulation in ("open", "palmMute")
            for string_index, midi_note in enumerate(bar["notesMidi"]):
                # A real chord's two strings do not start at exactly the same instant.
                start = ((bar_index * 4) + beat) * seconds_per_beat + string_index * 0.008
                duration = 0.22 if articulation == "open" else 0.105
                velocity = (92 if articulation == "open" else 69) - attack_index % 3 * 3
                yield {"start": start, "duration": duration, "note": midi_note,
                       "velocity": velocity, "articulation": articulation, "string": string_index}


def validate_fixture(fixture):
    if fixture["meter"] != [4, 4] or len(fixture["bars"]) != 4 or fixture["bpm"] != 120:
        raise ValueError("The comparison fixture must be four bars of 4/4 at 120 BPM")
    for bar in fixture["bars"]:
        fretted = [fixture["tuningMidi"][6 - finger["string"]] + finger["fret"]
                   for finger in bar["fingering"]]
        if fretted != bar["notesMidi"]:
            raise ValueError(f"Impossible fingering for {bar['chord']}")
        if len(bar["attacksBeats"]) != len(bar["articulations"]):
            raise ValueError(f"Missing articulation in {bar['chord']}")
        if any(not 0 <= beat < 4 for beat in bar["attacksBeats"]):
            raise ValueError(f"Attack outside the bar in {bar['chord']}")


def midi_varlen(value):
    result = [value & 0x7f]
    value >>= 7
    while value:
        result.insert(0, (value & 0x7f) | 0x80)
        value >>= 7
    return bytes(result)


def make_midi(path, notes, bpm):
    ticks_per_beat = 480
    ticks_per_second = ticks_per_beat * bpm / 60
    commands = [(0, 0, b"\xff\x51\x03" + (round(60_000_000 / bpm)).to_bytes(3, "big")),
                (0, 1, b"\xc0\x00")]
    for note in notes:
        start = round(note["start"] * ticks_per_second)
        end = round((note["start"] + note["duration"]) * ticks_per_second)
        commands.extend([(start, 2, bytes((0x90, note["note"], note["velocity"]))),
                         (end, 0, bytes((0x80, note["note"], 0)))])
    commands.sort(key=lambda item: (item[0], item[1]))
    track = bytearray()
    previous = 0
    for tick, _, command in commands:
        track += midi_varlen(tick - previous) + command
        previous = tick
    track += b"\x00\xff\x2f\x00"
    path.write_bytes(b"MThd" + struct.pack(">IHHH", 6, 0, 1, ticks_per_beat)
                     + b"MTrk" + struct.pack(">I", len(track)) + track)


def sfz_regions(path):
    text = path.read_text(encoding="utf-8")
    regions = []
    for section in text.split("<region>")[1:]:
        def value(key):
            match = re.search(r"\b" + key + r"=([^\s]+)", section)
            if not match:
                raise ValueError(f"Missing {key} in SFZ region")
            return match.group(1).strip()
        regions.append({"low": int(value("lokey")), "high": int(value("hikey")),
                        "center": int(value("pitch_keycenter")), "file": path.parent / value("sample")})
    return regions


def sample_voice(region, midi_note, length, muted, cache):
    if region["file"] not in cache:
        cache[region["file"]] = read_wav(region["file"])
    source = cache[region["file"]][:, 0]
    playback_rate = 2 ** ((midi_note - region["center"]) / 12)
    count = round(length * RATE)
    positions = np.arange(count, dtype=np.float64) * playback_rate
    # Our short riff fits in the start of each supplied sample; no loop is needed.
    assert positions[-1] < len(source), f"sample too short: {region['file']}"
    voice = np.interp(positions, np.arange(len(source)), source)
    return envelope(voice, muted)


def karplus_voice(midi_note, length, muted, seed):
    frequency = 440 * 2 ** ((midi_note - 69) / 12)
    delay = round(RATE / frequency)
    rng = np.random.default_rng(seed)
    buffer = rng.uniform(-1, 1, delay)
    buffer = (buffer + np.roll(buffer, 1)) * 0.5
    out = np.empty(round(length * RATE), dtype=np.float64)
    damping = 0.985 if muted else 0.998
    for i in range(len(out)):
        slot = i % delay
        current = buffer[slot]
        buffer[slot] = damping * 0.5 * (current + buffer[(slot - 1) % delay])
        out[i] = current
    return envelope(out, muted)


def envelope(voice, muted):
    result = voice.copy()
    attack = min(len(result), round(0.003 * RATE))
    release = min(len(result), round((0.035 if muted else 0.055) * RATE))
    result[:attack] *= np.linspace(0, 1, attack)
    result[-release:] *= np.linspace(1, 0, release)
    return result


def render_voices(notes, method, regions=None):
    audio = np.zeros((round(9 * RATE), 2), dtype=np.float64)
    cache = {}
    for index, note in enumerate(notes):
        if method == "samples":
            region = next(r for r in regions if r["low"] <= note["note"] <= r["high"])
            voice = sample_voice(region, note["note"], note["duration"],
                                 note["articulation"] == "palmMute", cache)
        else:
            voice = karplus_voice(note["note"], note["duration"],
                                  note["articulation"] == "palmMute", 1000 + index)
        voice *= note["velocity"] / 100
        start = round(note["start"] * RATE)
        audio[start:start + len(voice), note["string"]] += voice
        audio[start:start + len(voice), 1 - note["string"]] += voice * 0.82
    return audio


def stereo(audio):
    if audio.shape[1] == 2:
        return audio
    return np.repeat(audio, 2, axis=1)


def common_effects(audio):
    # One identical, moderate effects chain for all three sources.
    driven = np.tanh(audio * 3.0) / np.tanh(3.0)
    frequencies = np.fft.rfftfreq(len(driven), 1 / RATE)
    highpass = frequencies / np.sqrt(frequencies ** 2 + 75 ** 2)
    cabinet = 1 / np.sqrt(1 + (frequencies / 5100) ** 6)
    presence = 1 + 0.32 * np.exp(-0.5 * ((frequencies - 2400) / 900) ** 2)
    shaped = np.fft.irfft(np.fft.rfft(driven, axis=0) * (highpass * cabinet * presence)[:, None],
                          n=len(driven), axis=0)
    # Chorus, delay and short reverb are intentionally subtle for rhythm guitar.
    t = np.arange(len(shaped)) / RATE
    chorus_offset = ((0.007 + 0.002 * np.sin(2 * math.pi * 0.7 * t)) * RATE).astype(int)
    chorus = shaped[np.maximum(0, np.arange(len(shaped)) - chorus_offset)]
    result = shaped * 0.88 + chorus[:, ::-1] * 0.12
    delay = round(0.185 * RATE)
    result[delay:] += shaped[:-delay] * 0.11
    rng = np.random.default_rng(123456)
    impulse = rng.uniform(-1, 1, round(0.19 * RATE))
    impulse *= np.exp(-np.arange(len(impulse)) / (0.035 * RATE))
    impulse[0] += 4
    impulse /= np.sum(np.abs(impulse))
    fft_size = 1 << (len(result) + len(impulse) - 2).bit_length()
    wet = np.fft.irfft(np.fft.rfft(result, fft_size, axis=0)
                       * np.fft.rfft(impulse, fft_size)[:, None], n=fft_size, axis=0)[:len(result)]
    return result * 0.93 + wet * 0.07


def normalize(audio):
    rms = float(np.sqrt(np.mean(audio ** 2)))
    peak = float(np.max(np.abs(audio)))
    if rms < 1e-5:
        raise ValueError("Rendered audio is silent")
    gain = min(0.10 / rms, 0.92 / peak)
    return audio * gain, {"rmsBeforeGain": round(rms, 6), "peakBeforeGain": round(peak, 6),
                          "gain": round(gain, 5)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sf2", type=Path, default=SF2)
    parser.add_argument("--sfz-dir", type=Path, default=SAMPLES)
    parser.add_argument("--fluidsynth", type=Path, default=FLUID)
    parser.add_argument("--output", type=Path, default=OUT)
    args = parser.parse_args()
    fixture = json.loads((ROOT / "fixture.json").read_text(encoding="utf-8"))
    validate_fixture(fixture)
    notes = list(events(fixture))
    args.output.mkdir(parents=True, exist_ok=True)
    midi = args.output / "riff.mid"
    make_midi(midi, notes, fixture["bpm"])
    sfz_file = next(args.sfz_dir.glob("*.sfz"))
    regions = sfz_regions(sfz_file)
    results = {}
    for method in ("soundfont", "samples", "karplus"):
        started = time.perf_counter()
        if method == "soundfont":
            raw = args.output / "soundfont-raw.wav"
            subprocess.run([str(args.fluidsynth), "-n", "-i", "-R", "no", "-C", "no",
                            "-r", str(RATE), "-g", "0.25", "-F", str(raw),
                            str(args.sf2), str(midi)], check=True, capture_output=True)
            audio = stereo(read_wav(raw))
            if len(audio) < round(9 * RATE):
                audio = np.pad(audio, ((0, round(9 * RATE) - len(audio)), (0, 0)))
            else:
                audio = audio[:round(9 * RATE)]
            raw.unlink()
        else:
            audio = render_voices(notes, method, regions)
        render_seconds = time.perf_counter() - started
        dry, dry_gain = normalize(audio)
        write_wav(args.output / f"{method}-dry.wav", dry)
        processed, wet_gain = normalize(common_effects(audio))
        write_wav(args.output / f"{method}-processed.wav", processed)
        results[method] = {"renderSecondsOnThisPC": round(render_seconds, 3),
                           "dry": dry_gain, "processed": wet_gain,
                           "processedSha256": hashlib.sha256((args.output / f"{method}-processed.wav").read_bytes()).hexdigest()}
    (args.output / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    methods = list(results)
    random.Random(20261105).shuffle(methods)
    for letter, method in zip("ABC", methods):
        shutil.copyfile(args.output / f"{method}-processed.wav", args.output / f"{letter}.wav")
    (args.output / "blind-key.json").write_text(json.dumps(dict(zip("ABC", methods)), indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
