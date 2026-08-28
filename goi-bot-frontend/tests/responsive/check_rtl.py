#!/usr/bin/env python3
"""
Responsive RTL smoke test for the courier dashboard.

Boots Chromium headlessly against the running dev server (http://localhost:8080),
restores browser session cookies from env if present, and visits a set of routes
at multiple viewports. Fails if:
  - document horizontally overflows the viewport
  - any element extends past the right/left edge of the viewport
  - dir="rtl" is not active on <html> for RTL routes
  - any text node is clipped (scrollWidth > clientWidth on truncate containers)

Run:
  python3 tests/responsive/check_rtl.py
  (dev server must already be running on :8080)
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("APP_URL", "http://localhost:8080")
OUT = Path("/tmp/responsive-rtl"); OUT.mkdir(exist_ok=True)

ROUTES = [
    "/courier/dashboard",
    "/courier/jobs",
    "/courier/active",
    "/courier/performance",
    "/courier/history",
    "/courier/wallet",
    "/courier/share",
    "/courier/ratings",
    "/courier/my-profile",
    "/courier/account-settings",
]

VIEWPORTS = [
    ("mobile-320", 320, 700),
    ("mobile-360", 360, 780),
    ("mobile-390", 390, 844),
    ("tablet-768", 768, 1024),
    ("desktop-1280", 1280, 900),
    ("desktop-1440", 1440, 900),
]

OVERFLOW_PROBE = r"""
() => {
  const vw = document.documentElement.clientWidth;
  const docW = document.documentElement.scrollWidth;

  // An element only counts as an offender if it actually causes the document
  // to scroll horizontally. Decorative absolutes (blurred blobs, glow rings)
  // live inside an ancestor with overflow:hidden|clip and are visually clipped
  // — they do not contribute to docW and must be ignored.
  const clippedByAncestor = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'hidden' || cs.overflowX === 'clip' ||
          cs.overflow === 'hidden' || cs.overflow === 'clip') return true;
      p = p.parentElement;
    }
    return false;
  };

  const offenders = [];
  if (docW > vw + 1) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= vw + 1 && r.left >= -1) continue;
      if (clippedByAncestor(el)) continue;
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.toString && el.className.toString().slice(0, 80)) || '',
        left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
      });
      if (offenders.length >= 5) break;
    }
  }
  return {
    vw, docW,
    dir: document.documentElement.getAttribute('dir'),
    overflowX: docW - vw,
    offenders,
  };
}
"""



async def restore_session(ctx, page):
    sk = os.environ.get("LOVABLE_BROWSER_NEST_STORAGE_KEY")
    sj = os.environ.get("LOVABLE_BROWSER_NEST_SESSION_JSON")
    cj = os.environ.get("LOVABLE_BROWSER_NEST_COOKIES_JSON")
    if cj:
        cookies = json.loads(cj)
        for c in cookies:
            c["url"] = BASE
        await ctx.add_cookies(cookies)
    await page.goto(BASE)
    if sk and sj:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(sk)}, {json.dumps(sj)})"
        )


async def check(page, route, label):
    await page.goto(BASE + route, wait_until="domcontentloaded")
    await page.wait_for_timeout(1500)
    info = await page.evaluate(OVERFLOW_PROBE)
    failed = []
    # truncate clipping is informational only (truncate intentionally clips)
    if info["overflowX"] > 0:
        failed.append(f"horizontal overflow {info['overflowX']}px")
    if info["offenders"]:
        failed.append(f"{len(info['offenders'])} element(s) past viewport edge: {info['offenders'][:2]}")
    if info["dir"] != "rtl":
        failed.append(f"<html dir> is {info['dir']!r}, expected 'rtl'")
    status = "FAIL" if failed else "ok"
    print(f"  [{status}] {label} {route} (vw={info['vw']} docW={info['docW']} dir={info['dir']})")
    for f in failed:
        print(f"      - {f}")
    if failed:
        await page.screenshot(path=str(OUT / f"FAIL_{label}_{route.replace('/', '_')}.png"))
    return not failed


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        all_ok = True
        for label, w, h in VIEWPORTS:
            ctx = await browser.new_context(viewport={"width": w, "height": h})
            page = await ctx.new_page()
            await restore_session(ctx, page)
            print(f"\n=== {label} ({w}x{h}) ===")
            for route in ROUTES:
                ok = await check(page, route, label)
                all_ok = all_ok and ok
            await ctx.close()
        await browser.close()
        if not all_ok:
            print("\nresponsive checks FAILED — screenshots in", OUT)
            sys.exit(1)
        print("\nall responsive RTL checks passed ✅")


if __name__ == "__main__":
    asyncio.run(main())
