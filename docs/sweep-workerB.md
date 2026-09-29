# Sweep Worker B — Portal UX Check (index.html + assets bundle)

Date: 2025-09-29 · Scope: portal load under headless Chromium against `python3 -m http.server 8811`, repo root served as static site.

## Method

- Playwright (chromium, `--no-sandbox`), viewport 1280×900, `networkidle`, listeners for console messages, `pageerror`, `response >= 400`, `requestfailed`.
- All local `<script src>` / `<link href>` targets replied to with a real request to confirm 200.
- games.json fetch + rendered-card count vs. catalog entries.
- Full-page screenshot: `docs/sweep-shots/portal-load.png` (1400×9207).

## Results summary

| Check | Result |
|---|---|
| Console errors / warnings / pageerror | **0** |
| Failed or 4xx/5xx network requests | **0** |
| Local asset refs all 200 | **5/5** (`favicon.svg`, `assets/index-CRWHmtoy.js`, `assets/index-CUsUGgbt.css`, `assets/portal-polish.css`, `assets/portal-ux.js`) |
| games.json fetch | OK — fetched (2×, 200, bundle fetches catalog; 120 cards render) |
| Rendered game cards vs catalog | **120 / 120** |
| Internal links ("Play Portal" → `#main-content`, `./uv/`) | all resolve (`uv/` dir 200) |
| `main.min.js` referenced? | **No** — not referenced by index.html or bundle; nothing to check |
| Unreferenced local asset `assets/game-save.js` | 200 on disk; referenced by the bundle (`grep` hit), so loaded via JS — fine |
| Horizontal overflow (1280px) | none (`scrollWidth == clientWidth`) |
| Page structure | `<main>` present, h1 = "UNBLOCKMATH // ARCADE", footer present |

## Findings

| # | Issue | Evidence | Severity | Suggested fix |
|---|---|---|---|---|
| 1 | Some game cards show a dark placeholder glyph tile instead of a thumbnail | screenshot `docs/sweep-shots/portal-load.png` (e.g. final ~40 cards: Fire, Pals, Mine Cart, War etc.) | LOW | Intentional fallback if no `assets/thumbs/` image exists; verify all games that *should* have a thumb have one, otherwise fine |
| 2 | games.json is fetched twice on page load | Playwright response listener: two `http://localhost:8811/games.json` responses for one page load | LOW | Likely one fetch by `index-CRWHmtoy.js` bundle + one by `portal-ux.js`; harmless perf nit, could share one fetch |

No CRITICAL/HIGH issues found. No inline fixes required (nothing broken).

## Notes

- Disk at sweep start: `1.4G free` — ops kept small per disk guard.
- `http.server 8811` killed after checks (port no longer responds).
- Per instructions, did NOT run `scripts/smoke_test_games.py` (owned by another worker).
