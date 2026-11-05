"""Exercise the self-contained WebView audio HTML with real Chromium Web Audio."""

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / ".expo/rock-demo/app-engine.html"
FRAGMENT = ROOT / ".expo/rock-demo/fragment.json"


def main():
    fragment = json.loads(FRAGMENT.read_text(encoding="utf-8"))
    messages, errors = [], []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True,
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            args=["--autoplay-policy=no-user-gesture-required"])
        page = browser.new_page()
        page.on("console", lambda item: messages.append(json.loads(item.text)) if item.text.startswith('{') else None)
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(HTML.as_uri())
        page.evaluate("fragment => window.control({type:'start',fragment,next:fragment,volume:0.55})", fragment)
        page.wait_for_timeout(1800)
        kinds = [item["type"] for item in messages]
        print("messages", kinds)
        assert "ready" in kinds and "decoded" in kinds and "playing" in kinds and "metrics" in kinds
        assert next(item["message"]["samples"] for item in messages if item["type"] == "decoded") == 15
        assert all(item["message"]["late"] == 0 for item in messages if item["type"] == "metrics")
        page.evaluate("window.control({type:'stop'})")
        page.evaluate("fragment => window.control({type:'start',fragment,next:fragment,volume:0.4})", fragment)
        page.wait_for_timeout(500)
        assert kinds.count("playing") < [item["type"] for item in messages].count("playing")
        assert not errors, errors
        browser.close()
    print("App WebView audio smoke-check passed")


if __name__ == "__main__":
    main()
