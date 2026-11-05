"""Smoke-check the live Web Audio page in local Chromium (optional Playwright)."""

import argparse
from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--long", action="store_true", help="check the automatic 32-bar transition")
    args = parser.parse_args()
    errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True,
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
        page = browser.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto("http://127.0.0.1:8767/", wait_until="networkidle")
        page.get_by_role("button", name="▶ Играть").click()
        page.wait_for_timeout(2000)
        print("status", page.locator("#status").inner_text(), "errors", errors, flush=True)
        assert page.locator("#status").inner_text() == "Играет"
        page.wait_for_timeout(1600)
        print("playing", {item: page.locator(f"#{item}").inner_text()
                          for item in ("seed", "bar", "samples", "decode", "late", "jitter")})
        assert page.locator("#samples").inner_text() == "15"
        assert page.locator("#late").inner_text() == "0"
        page.route("**/*", lambda route: route.abort())  # All future music should come from memory.
        page.get_by_role("button", name="⏭ Другая").click()
        page.get_by_text("20261106", exact=True).wait_for(timeout=5000)
        page.locator("#bpm").fill("130")
        page.locator("#bpm").dispatch_event("change")
        page.get_by_text("130", exact=True).wait_for(timeout=5000)
        if args.long:
            page.locator("#bpm").fill("150")
            page.locator("#bpm").dispatch_event("change")
            page.get_by_text("150", exact=True).wait_for(timeout=5000)
            page.wait_for_function("document.getElementById('seed').textContent === '20261107'", timeout=60000)
            print("automatic transition", {item: page.locator(f"#{item}").inner_text()
                                           for item in ("seed", "bar", "late", "jitter")}, flush=True)
            assert page.locator("#late").inner_text() == "0"
        page.get_by_role("button", name="■ Стоп").click()
        page.get_by_text("Остановлено", exact=True).wait_for(timeout=5000)
        assert not errors, errors
        browser.close()
    print("Live page smoke-check passed")


if __name__ == "__main__":
    main()
