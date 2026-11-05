"""Expose only the rock preview page and rendered WAV on the local network."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = {"/": (ROOT / "experiments/rock-demo/mobile.html", "text/html; charset=utf-8"),
         "/fragment.wav": (ROOT / ".expo/rock-demo/fragment.wav", "audio/wav")}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        item = FILES.get(self.path)
        if item is None or not item[0].is_file():
            self.send_error(404)
            return
        path, mime = item
        size = path.stat().st_size
        requested = self.headers.get("Range", "")
        start, end = 0, size - 1
        if requested.startswith("bytes="):
            try:
                first, last = requested[6:].split("-", 1)
                start = int(first) if first else 0
                end = min(int(last), end) if last else end
                if start < 0 or start > end:
                    raise ValueError
            except ValueError:
                self.send_error(416)
                return
        self.send_response(206 if requested else 200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-store")
        if requested:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        with path.open("rb") as file:
            file.seek(start)
            remaining = end - start + 1
            while remaining:
                chunk = file.read(min(65536, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)


if __name__ == "__main__":
    if not FILES["/fragment.wav"][0].exists():
        raise SystemExit("Render the WAV first")
    print("PaceGen rock preview: http://0.0.0.0:8766/", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 8766), Handler).serve_forever()
