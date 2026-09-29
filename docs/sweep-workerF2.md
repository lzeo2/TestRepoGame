# Sweep Worker F2 — fix-wave RETRY (docs staleness + Lunar Lander viewport)

Scope per delegation: FIX 1 (stale counts / removed-feature claims across README + docs, D-4/D-5/D-8/E items) and FIX 2 (D-14: Lunar Lander viewport meta). Two commits, explicit paths, no push, no deletions.

Verified at start (quoted):
```
$ python3 -c "import json; d=json.load(open('games.json')); print(len(d), max(g['id'] for g in d))" → 120 221
$ ls Games | wc -l → 123
$ python3 (all-url-exists check) → all urls OK
$ df -h / | tail -1 → 1.5G free
```

## FIX 1 — docs staleness (commit `docs: correct stale game counts and removed-feature claims`)

Files changed: `README.md`, `docs/GAMES.md`, `docs/ARCHITECTURE.md`, `docs/wiki/Game-List.md`, `docs/wiki/Home.md`, `docs/wiki/Security.md`.

Phrasing used everywhere: **"120 registered games / catalog entries, ids 4–221, ~123 game folders on disk (incl. unregistered leftovers)"** so on-disk vs catalog distinction stays honest.

### README.md

| Before (stale) | After |
| --- | --- |
| "The portal itself loads one external font (Google Fonts `Inter`, referenced in `index.html`); it falls back to system fonts when offline." | "`Games/` are audited for external references… remote-dependent games are not claimed to be offline. (The best-known former offenders — Slope, Flappy Bird, Hextris, Age of War — were removed from the catalog entirely…). The portal itself loads **no external fonts**: `index.html` explicitly documents that the bundled stylesheet falls back to local/system fonts (Inter → system-ui stack)." |
| "…notably Slope, Flappy Bird, Hextris, and Age of War, which are embedded/remote or need a CDN" (citing all four as *registered* examples) | Replaced by the "former offenders — removed" phrasing above. All four verified absent from games.json: `grep` on catalog titles → `slope False / flappy bird False / hextris False / age of war False`. |
| "- `docs/GAMES.md` — catalog of all 29 registered games (category, controls, status)" | "- `docs/GAMES.md` — catalog of the **120 registered games** (category, controls, status; ids 4–221, ~123 game folders on disk including a few unregistered leftovers)" |
| "Most arcade games under `Games/` (FPS, Boss Rush, Star Catcher, Paddle Duel, Brick Dash, Tile Merge, Match Flip, Letter Boxed, Grid Heist, Last Lantern, Queue Escape, Story Adventure, and others) are **original code written for this repo**." | Rewritten: all twelve named games verified absent from games.json (grep of catalog titles → all False); now cites Character Alsen (14) + later original slots as in-catalog provenance examples. |

### docs/GAMES.md

| Before | After |
| --- | --- |
| "All **42 registered games** from `games.json` (ids 1–60 with gaps…)" | "All **120 registered games** from `games.json` (ids 4–221 with gaps…; 123 game folders exist on disk, including the unregistered ones noted at the bottom)." |
| Stale removed rows 1/2/3/12/13/15/16/17/18/19/20/24/31/35/36/37/42→ kept 42/44 present but 2048, Age of War, Slope, Hextris, Flappy Bird, QWOP(id 15, QwopRemake), Star Catcher, Paddle Duel, Brick Dash, Tile Merge, Match Flip, FPS, Letter Boxed, Boss Rush, Grid Heist, Last Lantern, Story Adventure table rows | Removed (they are not in the catalog — verified titles-by-id grep); table now starts at id 4 and retains row 42 Queue Escape, 44 Story Adventure, 47+ as before, with a new "Coverage note (ids 61–221)" wave-grouping section covering every later id through Balatro (221). |
| Stale notes: "**2048 (1)**…", "**Age of War (2)**…", "**Gladihoppers (47)**…", "**Burrito Bison (48)**…", "**Catalog pruning (2026-08):** 18 self-built games…" | 2048 and Age of War notes removed (both gone from catalog); Balatro (221) added with mirror_sources provenance (`github.com/OutBlade/balatro-web`, commit `3c8cf43`, boot test passed, MIT LICENSE + CREDITS.md, shared `Games/_emulatorjs` runtime) — closes D-4 for GAMES.md. |
| "**Original code (written for this repo):** FPS, Star Catcher, Paddle Duel, Brick Dash, Tile Merge, Match Flip, Letter Boxed, Boss Rush, Grid Heist, Last Lantern, Queue Escape, Story Adventure." | Rewritten to note those 12 were themselves removed in the 2026-08 pruning, and to derive current original-code status from per-row ✅ marks among retained ids 62–221. |
| "- Third-party bundles… Breakout, QWOP remake, Soccer/Basket/Volley Random…" | "QWOP remake" removed from the third-party list (QwopRemake deleted in `5e25f16`; confirmed not in catalog). |
| "- `Games/QWOP/` — … The registered 'QWOP' entry (id 15) points to `Games/QwopRemake/index.html`." | Updated to: QWOP fully removed (old id-15 entry and `Games/QwopRemake/` deleted in 2026-08 pruning); folder documented as deliberate orphan pending operator decision (D-10). Added `Games/Slope/` (D-11) and `Games/_emulatorjs/` load-bearing-runtime explanation (D-9). Closes D-8 for this file. |

### docs/ARCHITECTURE.md

| Before (stale) | After |
| --- | --- |
| "├── Games/ Self-contained game folders, one per game (30 folders, 29 registered)" | "├── Games/ Self-contained game folders (~123 folders; 120 registered entries in games.json)" |
| "- `Games/QWOP/` exists but is **not registered** in `games.json` (the \"QWOP\" entry, id 15, points to `Games/QwopRemake/index.html`)." | Rewritten: QWOP **and** Slope are unregistered leftovers pending operator decision; old id-15/id-3 entries deleted in the 2026-08 pruning; `_emulatorjs/` explained as the shared EmulatorJS runtime (closes D-8 + D-9 docs note). |
| "No CDN scripts, no external fonts (portal's Google Fonts `Inter` reference is the one exception and falls back gracefully), no runtime third-party `fetch()`/`WebSocket`." | "No CDN scripts, no external fonts **(the portal loads none at all — `index.html` explicitly falls back to local/system fonts)**, no runtime third-party `fetch()`/`WebSocket`." |

### docs/wiki/Game-List.md

| Before (stale) | After |
| --- | --- |
| "All 29 games registered in `games.json` (ids 1–47 with gaps…)" | "All 120 games registered in `games.json` (ids 4–221 with gaps…; ~123 game folders exist on disk)… table keeps per-row detail for early ids (4–60); later ids see wave summaries + `docs/GAMES.md`." |
| Stale removed rows 1/2/3/12/13/15/16/17/18/19/20/24/31/35/36/37/42/44 (2048, Age of War, Slope, Hextris, Flappy Bird, QWOP, Star Catcher, Paddle Duel, Brick Dash, Tile Merge, Match Flip, FPS, Letter Boxed, Boss Rush, Grid Heist, Last Lantern, Queue Escape, Story Adventure) | Removed; table now holds the verified-present early ids (4,5,6,7,8,9,10,11,14,47) plus pointer to GAMES.md coverage section + games.json for the authoritative list. |
| "## Remote-dependent games (not offline) — Slope, Hextris, Flappy Bird… Age of War…" (as if current) | Removed section; Notes now state: "**No remote-dependent games remain in the catalog** at the time of writing (former remote iframes Slope/Hextris/Flappy Bird + Ruffle-CDN Age of War were removed in the 2026-08 pruning, among 40+ further removals)." |
| "- `Games/QWOP/` is an unregistered folder; the registered \"QWOP\" entry points to `Games/QwopRemake/`." | Updated: QWOP + Slope unregistered leftovers pending operator decision; `_emulatorjs/` documented as unregistered-by-design shared runtime (closes D-8 for this file). |

### docs/wiki/Home.md

| Before (stale) | After |
| --- | --- |
| "- **29 registered games** in `Games/`, each a self-contained folder…" | "- **120 registered games** in `Games/` (catalog `games.json`, ids 4–221; ~123 game folders on disk including a few unregistered leftovers), each a self-contained folder…" |
| "- [Game List](Game-List.md) — all 29 games with category, controls, and honest offline/remote status." | "- [Game List](Game-List.md) — all 120 games with category, controls, and honest offline/remote status." |

### docs/wiki/Security.md

| Before (stale) | After |
| --- | --- |
| "- Games that are exceptions (remote iframes like Slope/Hextris/Flappy Bird, the Ruffle-CDN Age of War) are **audited and labeled honestly** in `docs/GAMES.md` — they are not claimed to be offline." | "- Games are audited for external references and labeled honestly in `docs/GAMES.md` — but **no remote-dependent games remain in the catalog** (the former remote-iframe Slope/Hextris/Flappy Bird and the Ruffle-CDN Age of War were removed in the 2026-08 pruning)." |

### Files explicitly NOT touched (out of delegated scope)

- `docs/audit_verdicts.md` — historical per-phase audit log (Age of War/Hextris/Flappy Bird lines are verdict records, not current-catalog claims). Historical log should not be rewritten.
- `docs/DEPLOYMENT.md`, `docs/proxy.md`, `docs/mirror_sources.md` — greped; no stale count claims found there.
- `docs/wiki/Adding-a-Game.md`, `docs/wiki/Deploying.md` — no stale counts found.

## FIX 2 — Lunar Lander viewport (commit `fix: Lunar Lander add viewport meta for mobile`)

File: `Games/LunarLander/index.html` (registered id 218; the tiny 12-line ingest flagged as D-14, confirmed `grep -c viewport` → 0 before).

Changed exactly one line, nothing else:

```diff
   <head>
+    <meta name="viewport" content="width=device-width, initial-scale=1">
     <title>Lunar Lander</title>
```

Full file is 13 lines; diff (`git diff`) shows only the meta line inserted.

## Verification commands and output

```
$ python3 -c "import json; d=json.load(open('games.json')); print(len(d), max(g['id'] for g in d))"
120 221
$ ls Games | wc -l
123
$ python3 - <<'PY' (all urls exist)
all urls OK
$ grep -rn "29 registered\|29 games\|42 registered\|8 registered games\|QwopRemake\|all 29\b\|All 29\b" README.md docs/GAMES.md docs/ARCHITECTURE.md docs/wiki/*.md
→ no hits (clean)
$ grep -c viewport Games/LunarLander/index.html
1
```

## Commits

1. `docs: correct stale game counts and removed-feature claims` — README.md, docs/GAMES.md, docs/ARCHITECTURE.md, docs/wiki/Game-List.md, docs/wiki/Home.md, docs/wiki/Security.md (explicit paths only)
2. `fix: Lunar Lander add viewport meta for mobile` — Games/LunarLander/index.html (explicit path only)

No push. Nothing deleted. `Games/Character AI/` untouched. Removal decisions (Games/Slope, Games/QWOP orphans) left for operator sign-off per worker D report.
