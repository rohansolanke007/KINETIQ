"""Captures the README screenshots from the running app: python3 e2e/capture_screenshots.py [url]"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173"
OUT = Path(__file__).resolve().parent.parent / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)


def play(page, seconds, speed=None):
    if speed:
        page.get_by_role("button", name=speed, exact=True).click()
    page.get_by_role("button", name="Play", exact=True).click()
    page.wait_for_timeout(int(seconds * 1000))


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()

    def shot(name, full=False):
        # side panels may have scrolled while the page was being driven; show them from the top
        page.evaluate("document.querySelectorAll('.scroll-thin').forEach((e) => (e.scrollTop = 0))")
        page.wait_for_timeout(200)
        page.screenshot(path=str(OUT / f"{name}.png"), full_page=full)
        print("saved", name)

    page.goto(BASE + "/", wait_until="networkidle"); page.wait_for_timeout(3200); shot("01-dashboard")

    page.goto(BASE + "/lab", wait_until="networkidle"); page.wait_for_timeout(600)
    page.get_by_role("button", name="Projectile motion").click()
    page.get_by_role("button", name="Forces", exact=True).click()
    play(page, 1.6); page.get_by_role("button", name="Pause", exact=True).click()
    page.get_by_role("button", name="#1").first.click(); page.wait_for_timeout(500); shot("02-sandbox-lab")

    page.goto(BASE + "/lab/projectile", wait_until="networkidle"); page.wait_for_timeout(600)
    play(page, 2.2); shot("03-projectile")
    page.goto(BASE + "/lab/shm", wait_until="networkidle"); page.wait_for_timeout(600)
    play(page, 3.2); shot("04-shm")
    page.goto(BASE + "/lab/pendulum", wait_until="networkidle"); page.wait_for_timeout(600)
    a = page.get_by_label("Initial angle", exact=True).first; a.fill("120"); a.blur(); page.wait_for_timeout(300)
    play(page, 3.4, "2×"); shot("05-pendulum")
    page.goto(BASE + "/lab/incline", wait_until="networkidle"); page.wait_for_timeout(600)
    play(page, 1.5); shot("06-incline")
    page.goto(BASE + "/lab/collision", wait_until="networkidle"); page.wait_for_timeout(600)
    play(page, 4.8); page.get_by_role("tab", name="Momentum").click(); page.wait_for_timeout(300); shot("07-collision")
    page.goto(BASE + "/analytics?module=incline", wait_until="networkidle"); page.wait_for_timeout(600)
    play(page, 2.4, "2×"); shot("08-analytics", full=True)
    page.goto(BASE + "/experiments", wait_until="networkidle"); page.wait_for_timeout(500); shot("09-experiments")
    page.goto(BASE + "/experiments/projectile-verification", wait_until="networkidle"); page.wait_for_timeout(1200)
    play(page, 3.4, "2×")
    btn = page.get_by_role("button", name="Record this run")
    for _ in range(20):
        if btn.is_enabled(): break
        page.wait_for_timeout(300)
    btn.click(); page.wait_for_timeout(800); shot("10-experiment", full=True)
    page.goto(BASE + "/concepts", wait_until="networkidle"); page.wait_for_timeout(500); shot("11-concepts")
    page.goto(BASE + "/", wait_until="networkidle")
    page.get_by_role("button", name="Switch to light theme").click(); page.wait_for_timeout(3000); shot("12-light-theme")
    browser.close()
