"""Serve only the live music probe and its local music/sample assets."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / ".expo/rock-demo"


def allowed_files():
    manifest = json.loads((OUT / "bank.json").read_text(encoding="utf-8"))
    files = {"/": (ROOT / "experiments/rock-demo/live.html", "text/html; charset=utf-8"),
             "/bank.json": (OUT / "bank.json", "application/json")}
    for module in (OUT / "js").glob("*.js"):
        files[f"/js/{module.name}"] = (module, "text/javascript")
    for sample in (region["url"] for region in manifest["regions"]):
        files[sample] = (OUT / sample.lstrip("/"), "audio/wav")
    for sample in manifest["drums"].values():
        files[sample] = (OUT / sample.lstrip("/"), "audio/wav")
    return files


FILES = allowed_files()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        item = FILES.get(self.path)
        if item is None or not item[0].is_file():
            self.send_error(404)
            return
        path, mime = item
        size = path.stat().st_size
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            with path.open("rb") as source:
                while chunk := source.read(65536):
                    self.wfile.write(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass


if __name__ == "__main__":
    print("PaceGen live rock probe: http://0.0.0.0:8767/", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 8767), Handler).serve_forever()
