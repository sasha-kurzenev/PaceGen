"""Serve only the self-contained guitar probe to a phone on the same Wi-Fi."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


FILE = Path(__file__).resolve().parents[2] / ".expo/guitar-spike/mobile.html"


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path not in ("/", "/mobile.html"):
            self.send_error(404)
            return
        body = FILE.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    if not FILE.exists():
        raise SystemExit("Run build_mobile.py first")
    print("PaceGen guitar probe: http://0.0.0.0:8765/", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 8765), Handler).serve_forever()
