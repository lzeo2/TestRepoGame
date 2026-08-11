# Architecture — UNBLOCKMATH // ARCADE

A static browser-games portal. **The repo root is the deployed site.** Netlify publishes `.` with no build command; the portal is a compiled React app in `./assets/` that loads the game catalog at runtime.

## Repository layout

```
.
├── index.html              Portal entry (compiled React app shell + inline proxy launcher styles)
├── assets/
│   ├── index-CRWHmtoy.js   Minified portal bundle (no source — polish via CSS + index.html only)
│   └── index-CUsUGgbt.css  Minified portal styles
├── games.json              Catalog — single source of truth for the game grid
├── Games/                  Self-contained game folders, one per game (47 folders, 46 registered)
├── netlify.toml            Netlify config: publish ".", security headers, /uv redirects, disabled /bare template
├── netlify/functions/
│   └── bare.js             Status endpoint: honestly reports proxyEnabled: false
├── uv/                     Ultraviolet proxy launcher (backend DISABLED by default)
├── docs/                   Docs + wiki content (this directory)
└── .gitignore
```

## Data flow

1. Browser loads `index.html` → portal JS (`assets/index-*.js`).
2. Portal fetches `games.json` → renders the grid (categories, search, featured row). No rebuild needed to add a game.
3. Clicking a game opens its `url` from `games.json` — a relative path into `Games/`.

`games.json` schema — see `README.md`. Every `url` must resolve to a real file (verified with the check in `README.md` / `docs/CODE_QUALITY.md` §7).

## Games layout

- `Games/<Name>/index.html` is the entry point (may be the only file for tiny games; most have `script.js` + `style.css`).
- Larger bundles keep their original structure (e.g. `Games/Ovo/1.4.5/`, `Games/Run3/tn6pS9dCf37xAhkJv/`, `Games/Eaglercraft/`, `Games/BasketRandom/`).
- `Games/Character AI/` is **read-only** — never moved, edited, or restructured.
- `Games/QWOP/` exists but is **not registered** in `games.json` (the "QWOP" entry, id 15, points to `Games/QwopRemake/index.html`).

## Offline-first design

- All games and the portal must work with zero network access. No CDN scripts, no external fonts (portal's Google Fonts `Inter` reference is the one exception and falls back gracefully), no runtime third-party `fetch()`/`WebSocket`.
- Status is audited per game in `docs/GAMES.md`; remote-dependent games are labeled honestly and never claimed to be offline.

## Proxy / UV (backend disabled)

- `uv/` is a static Ultraviolet launcher. The UV distribution files (`uv.bundle.js`, `uv.client.js`, `uv.handler.js`, `uv.sw.js`) are **not vendored**, and the Bare backend is **disabled** — `/bare/*` returns 404 by default.
- `netlify.toml` carries a commented-out `/bare/*` redirect template an operator may enable only against a **controlled** Bare server. See `docs/proxy.md` for the full design and `docs/DEPLOYMENT.md` for the operational posture.

## Deployment

- Netlify: **Build command** empty, **Publish directory** `.`. Headers/redirects in `netlify.toml`. See `docs/DEPLOYMENT.md`.
- GitHub Pages can serve the arcade but **cannot** host the UV proxy (no Bare runtime, no custom headers) — see `docs/proxy.md` §2.

## Verification commands

Run before milestones (from `docs/CODE_QUALITY.md` §7):

```bash
python3 -c "import json; d=json.load(open('games.json')); print(len(d))"   # catalog parses
python3 - <<'PY'                                                            # every url exists
import json, os
for g in json.load(open('games.json')):
    assert os.path.isfile(g['url']), g['url']
print('all urls OK')
PY
grep -rEl "https?://" Games --include=*.html --include=*.js | head -20      # external fetch scan
grep -rEl "/home/|C:\\\\" Games docs *.html *.js *.json *.toml 2>/dev/null  # absolute paths
node --check Games/*/script.js 2>/dev/null | head                            # syntax
du -sh Games/* | sort -h | tail -10                                          # bloat audit
git status --short                                                           # hygiene
```
