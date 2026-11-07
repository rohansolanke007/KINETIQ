"""
End-to-end smoke test for KINETIQ. It drives the real app in headless Chromium and
checks the numbers the C++ engine produces against hand-calculated values.

    pip install playwright && playwright install chromium
    cd frontend && npm run dev            # in another terminal
    python3 e2e/smoke_test.py [http://127.0.0.1:5173]

Exit code 0 = all checks passed.
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173"
GUIDED = ["projectile-verification", "energy-conservation", "collision-lab", "shm-lab", "incline-friction"]
ROUTES = ["/", "/lab", "/lab/projectile", "/lab/shm", "/lab/pendulum", "/lab/incline", "/lab/collision",
          "/concepts", "/experiments", "/experiments/laws", "/analytics", "/about",
          *[f"/experiments/{e}" for e in GUIDED]]

passed, failed = 0, []


def check(name, condition, detail=""):
    global passed
    if condition:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed.append(name)
        print(f"  FAIL  {name} {detail}")


def section(title):
    print(f"\n{title}")


def panel(page, title):
    return page.locator(f"section:has(h2:text-is('{title}'))").first.inner_text().replace("\n", " | ")


def number_after(text, label):
    m = re.search(re.escape(label) + r"[^\d\-]*(-?\d+\.?\d*)", text)
    return float(m.group(1)) if m else float("nan")


def near(a, b, tol):
    return abs(a - b) <= tol


def wait_enabled(locator, seconds=20):
    for _ in range(seconds * 2):
        if locator.is_enabled():
            return True
        locator.page.wait_for_timeout(500)
    return False


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
    page = ctx.new_page()
    problems = []
    page.on("console", lambda m: problems.append(m.text[:160]) if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: problems.append(str(e)[:160]))

    section("Every page loads without console errors")
    for route in ROUTES:
        page.goto(BASE + route, wait_until="networkidle")
        page.wait_for_timeout(700)
        check(f"{route}", page.locator("h1").count() > 0 or page.locator("main").count() > 0)
    check("no console errors or warnings on any page", not problems, str(problems[:3]))

    section("Projectile motion: formulas T, H, R equal the simulation")
    page.goto(BASE + "/lab/projectile", wait_until="networkidle")
    page.wait_for_timeout(1000)
    ready = panel(page, "Results")
    check("T = 2u sin(theta)/g = 3.60 s", near(number_after(ready, "Time of flight T"), 3.60, 0.005), ready[:120])
    check("H = 15.93 m", near(number_after(ready, "Maximum height H"), 15.93, 0.005))
    check("R = 63.71 m", near(number_after(ready, "Horizontal range R"), 63.71, 0.005))
    page.get_by_role("button", name="2×", exact=True).click()
    page.get_by_role("button", name="Play", exact=True).click()
    page.wait_for_timeout(3000)
    landed = panel(page, "Results")
    check("subtitle reports landing", "Landed" in landed, landed[:80])

    section("Simple harmonic motion and pendulum periods")
    page.goto(BASE + "/lab/shm", wait_until="networkidle")
    page.wait_for_timeout(800)
    page.get_by_role("button", name="Play", exact=True).click()
    page.wait_for_timeout(2800)
    shm = panel(page, "Results")
    check("SHM period 2*pi*sqrt(m/k) = 1.257 s", near(number_after(shm, "Period T (formula)"), 1.257, 0.001))
    check("SHM measured period matches", near(number_after(shm, "Period (measured)"), 1.257, 0.002), shm[:200])
    page.goto(BASE + "/lab/pendulum", wait_until="networkidle")
    page.wait_for_timeout(800)
    page.get_by_role("button", name="2×", exact=True).click()
    page.get_by_role("button", name="Play", exact=True).click()
    page.wait_for_timeout(3500)
    pend = panel(page, "Period")
    check("pendulum small-angle period T0 = 2.006 s", near(number_after(pend, "Small-angle T₀"), 2.006, 0.001), pend[:160])
    check("pendulum exact period at 30 deg = 2.041 s", near(number_after(pend, "Exact T (this amplitude)"), 2.041, 0.001))
    check("pendulum measured period matches the exact one", near(number_after(pend, "Measured in simulation"), 2.041, 0.002))

    section("Inclined plane: friction decides whether it slides")
    page.goto(BASE + "/lab/incline", wait_until="networkidle")
    page.wait_for_timeout(800)
    analysis = panel(page, "Force analysis")
    check("N = mg cos(30) = 42.48 N", near(number_after(analysis, "Normal force N = mg cos θ"), 42.48, 0.01), analysis[:100])
    check("slides with a = -2.356 m/s2", near(number_after(analysis, "Acceleration"), -2.356, 0.002))
    mu = page.get_by_label("Static friction μs", exact=True).first
    mu.fill("0.7")
    mu.blur()
    page.wait_for_timeout(500)
    check("raising mu_s to 0.7 makes it hold", "stays at rest" in panel(page, "Force analysis"))
    check("free-body diagram reports balanced forces", "Forces balance" in (page.locator("svg[role=img]").first.text_content() or ""))

    section("Collisions: momentum conserved, kinetic energy only when elastic")
    page.goto(BASE + "/lab/collision", wait_until="networkidle")
    page.wait_for_timeout(800)
    page.get_by_role("button", name="Play", exact=True).click()
    page.wait_for_timeout(5200)
    ba = panel(page, "Before and after")
    check("elastic: v1' = -3.40 and v2' = 3.60 m/s", "-3.40" in ba and "3.60" in ba, ba[:160])
    check("kinetic energy 31.00 J unchanged", ba.count("31.00") >= 2, ba[:200])
    page.get_by_role("button", name="Sticky", exact=True).click()
    page.get_by_role("button", name="Replay", exact=True).click() if page.get_by_role("button", name="Replay", exact=True).count() else page.get_by_role("button", name="Play", exact=True).click()
    page.wait_for_timeout(5200)
    sticky = panel(page, "Before and after")
    check("perfectly inelastic: both bodies leave at 0.80 m/s", sticky.count("0.80") >= 2, sticky[:200])

    section("Sandbox: momentum is conserved for unequal masses (the Phase 1 bug)")
    page.goto(BASE + "/lab", wait_until="networkidle")
    page.wait_for_timeout(800)
    page.get_by_role("button", name="Collision lab").click()
    page.get_by_role("button", name="Play", exact=True).click()
    page.wait_for_timeout(4500)
    page.get_by_role("button", name="Pause", exact=True).click()
    page.wait_for_timeout(300)
    sandbox = panel(page, "Energy and momentum")
    check("total momentum stays -4.00 through the collision", "-4.00" in sandbox, sandbox[:200])
    check("kinetic energy dropped (e = 0.6 dissipates)", number_after(sandbox, "Kinetic energy") < 262.0)

    section("Experiments: record a run and download the PDF report")
    page.goto(BASE + "/experiments/projectile-verification", wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.get_by_role("button", name="2×", exact=True).click()
    page.get_by_role("button", name="Play", exact=True).click()
    record = page.get_by_role("button", name="Record this run")
    check("the run completes and can be recorded", wait_enabled(record))
    results = panel(page, "Calculated results")
    check("T = 4.325 s, H = 22.936 m, R = 91.743 m", all(v in results for v in ["4.325", "22.936", "91.743"]), results[:160])
    record.click()
    check("observation is listed", "Observations (1)" in page.locator("h2:has-text('Observations')").first.inner_text())
    page.locator("textarea").fill("Formula and simulation agree.")
    with page.expect_download() as d:
        page.get_by_role("button", name="Download PDF report").click()
    pdf = Path(tempfile.gettempdir()) / "kinetiq-e2e.pdf"
    d.value.save_as(pdf)
    check("download is a PDF", pdf.read_bytes()[:4] == b"%PDF")
    try:
        text = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, check=True).stdout
        check("PDF contains title, results, a recorded run and notes",
              all(s in text for s in ["Projectile motion verification", "22.936", "Run 1", "Formula and simulation agree."]))
    except FileNotFoundError:
        print("  skip  pdftotext not installed: PDF text content not checked")

    section("Analytics: graphs and CSV come from the C++ recording")
    page.goto(BASE + "/analytics?module=pendulum", wait_until="networkidle")
    page.wait_for_timeout(800)
    page.get_by_role("button", name="Play", exact=True).click()
    page.wait_for_timeout(2500)
    check("six graphs for a simulation", page.locator("figure").count() == 6)
    with page.expect_download() as d2:
        page.get_by_role("button", name="Export CSV").click()
    csv = Path(tempfile.gettempdir()) / "kinetiq-e2e.csv"
    d2.value.save_as(csv)
    header = csv.read_text().splitlines()[0]
    check("CSV header carries units", "t (s)" in header and "theta (rad)" in header, header)

    browser.close()

print(f"\n{passed} checks passed, {len(failed)} failed")
if failed:
    print("Failed:", ", ".join(failed))
sys.exit(1 if failed else 0)
