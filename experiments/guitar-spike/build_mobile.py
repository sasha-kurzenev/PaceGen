"""Build a self-contained Android-browser sound/performance probe from FreePats WAVs."""

import base64
import io
import json
from pathlib import Path
import wave

from render import ROOT, SAMPLES, events, read_wav, sfz_regions, validate_fixture, RATE


def short_wav(path):
    audio = read_wav(path)[:round(0.5 * RATE), 0]
    if len(audio) != round(0.5 * RATE):
        raise ValueError(f"Sample too short: {path}")
    with io.BytesIO() as data:
        with wave.open(data, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(RATE)
            wav.writeframes((audio * 32767).astype("<i2").tobytes())
        return base64.b64encode(data.getvalue()).decode("ascii")


def main():
    fixture = json.loads((ROOT / "fixture.json").read_text(encoding="utf-8"))
    validate_fixture(fixture)
    sfz = next(SAMPLES.glob("*.sfz"))
    regions = sfz_regions(sfz)
    needed = {next(r for r in regions if r["low"] <= e["note"] <= r["high"])["file"]
              for e in events(fixture)}
    bank = [{"low": r["low"], "high": r["high"], "center": r["center"],
             "wav": short_wav(r["file"])} for r in regions if r["file"] in needed]
    note_events = list(events(fixture))
    template = (ROOT / "mobile.template.html").read_text(encoding="utf-8")
    html = template.replace("__REGIONS_JSON__", json.dumps(bank, separators=(",", ":")))
    html = html.replace("__EVENTS_JSON__", json.dumps(note_events, separators=(",", ":")))
    if "__REGIONS_JSON__" in html or "__EVENTS_JSON__" in html:
        raise ValueError("Template placeholders were not replaced")
    output = ROOT.parents[1] / ".expo/guitar-spike/mobile.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding="utf-8")
    print(f"{output}: {len(html.encode('utf-8'))} bytes, {len(bank)} samples, {len(note_events)} note events")


if __name__ == "__main__":
    main()
