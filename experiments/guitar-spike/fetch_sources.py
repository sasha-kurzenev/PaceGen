"""Fetch pinned, licensed experiment sources into ignored .expo/guitar-spike/."""

import argparse
import hashlib
from pathlib import Path
import shutil
import subprocess
from urllib.request import urlopen
import zipfile


ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / ".expo/guitar-spike"
SOURCES = {
    "freepats-small-sf2.7z": (
        "https://github.com/freepats/electric-guitar-FSBS-clean/releases/download/2026-08-07/EGuitarFSBS-clean-bridge-small-SF2-20260807.7z",
        "bcea7d4c92a1cc6a26e545a218b34e59037d4bab6cf0fce24396428e6934d69c", "sf2"),
    "freepats-small-sfz-wav.7z": (
        "https://github.com/freepats/electric-guitar-FSBS-clean/releases/download/2026-08-07/EGuitarFSBS-clean-bridge-small-SFZ%2BWAV-20260807.7z",
        "b3e8226ae8e879f86ffcac75bcedf061cff6cf87933d58dc9c890c6c4cd6ad73", "sfz"),
    "fluidsynth-win10-x64.zip": (
        "https://github.com/FluidSynth/fluidsynth/releases/download/v2.6.2/fluidsynth-v2.6.2-win10-x64-cpp11.zip",
        "808295345d43c9c428f3fa87d29fbf97a9926f356df95559ff2689f3bd4072d7", "fluidsynth"),
}


def digest(path):
    sha = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            sha.update(chunk)
    return sha.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seven-zip", type=Path, default=Path(r"C:\Program Files\7-Zip\7z.exe"))
    args = parser.parse_args()
    DEST.mkdir(parents=True, exist_ok=True)
    for name, (url, expected, directory) in SOURCES.items():
        archive = DEST / name
        if not archive.exists():
            print(f"Downloading {name}...")
            with urlopen(url) as source, archive.open("wb") as target:
                shutil.copyfileobj(source, target)
        if digest(archive) != expected:
            raise ValueError(f"SHA-256 mismatch: {archive}")
        output = DEST / directory
        output.mkdir(exist_ok=True)
        if archive.suffix == ".zip":
            with zipfile.ZipFile(archive) as bundle:
                bundle.extractall(output)
        else:
            subprocess.run([str(args.seven_zip), "x", "-y", f"-o{output}", str(archive)],
                           check=True, stdout=subprocess.DEVNULL)
        print(f"Verified and extracted {name}")


if __name__ == "__main__":
    main()
