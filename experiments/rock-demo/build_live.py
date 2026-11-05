"""Prepare a small locally served sample bank and browser-compatible music modules."""

import json
from pathlib import Path
import shutil
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / ".expo/rock-demo"
sys.path.insert(0, str(ROOT / "experiments/guitar-spike"))
from render import SAMPLES, sfz_regions, RATE  # noqa: E402


def trimmed_wav(source, destination, seconds=0.9):
    with wave.open(str(source), "rb") as original:
        if original.getframerate() != RATE or original.getsampwidth() != 2:
            raise ValueError(f"Unexpected audio format: {source}")
        frames = original.readframes(round(seconds * RATE))
        with wave.open(str(destination), "wb") as output:
            output.setparams(original.getparams())
            output.writeframes(frames)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    command = ["npx.cmd" if sys.platform == "win32" else "npx", "tsc", "--ignoreConfig",
               "--target", "es2022", "--module", "es2022", "--moduleResolution", "bundler",
               "--strict", "--allowImportingTsExtensions", "--rewriteRelativeImportExtensions",
               "--outDir", str(OUT / "js"), "--rootDir", str(ROOT / "src/music"),
               str(ROOT / "src/music/generate.ts")]
    subprocess.run(command, check=True, cwd=ROOT)
    sample_dir = OUT / "samples"
    sample_dir.mkdir(exist_ok=True)
    regions = []
    for region in sfz_regions(next(SAMPLES.glob("*.sfz"))):
        if region["high"] < 41 or region["low"] > 79:
            continue
        destination = sample_dir / f"guitar-{region['center']}.wav"
        trimmed_wav(region["file"], destination)
        regions.append({"low": region["low"], "high": region["high"],
                        "center": region["center"], "url": f"/samples/{destination.name}"})
    drums = {"kick": "kickHouse.wav", "snare": "snare.wav",
             "hat": "closedHat.wav", "openHat": "openHat.wav"}
    for name in drums.values():
        shutil.copyfile(ROOT / "assets/audio" / name, sample_dir / name)
    manifest = {"regions": regions, "drums": {name: f"/samples/{file}" for name, file in drums.items()}}
    (OUT / "bank.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    used = [OUT / item["url"].lstrip("/") for item in regions]
    used += [sample_dir / file for file in drums.values()]
    print(f"Prepared {len(regions)} guitar samples, {len(drums)} drums, "
          f"{sum(file.stat().st_size for file in used) / 1024:.0f} KiB")


if __name__ == "__main__":
    main()
