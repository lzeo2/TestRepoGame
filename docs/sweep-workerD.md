# Sweep Worker D — New-Game Candidate / Stub Review

Scope: catalog integrity (games.json), docs cross-check (GAMES.md, audit_verdicts.md, wiki, mirror_sources.md), unregistered `Games/` dirs, bare/stub index.html files. **Proposals only — nothing was deleted, edited in `games.json`, or touched in `Games/Character AI/`.**

Evidence run at HEAD `a569023` ("docs: repo hygiene scan"). All commands from repo root.

## Method (commands quoted)

```text
$ python3 -c "import json; d=json.load(open('games.json')); print(len(d))"   → 120
$ df -h / | tail -1                                                          → 1.4G free (96% used)
$ python3 (url exists check)                                                 → missing url files: []
$ python3 (dir gap) ls Games vs catalog first path component                 → ['QWOP', 'Slope', '_emulatorjs']
$ python3 (title substring over docs corpus incl. mirror_sources + wiki)     → only 'Balatro' missing from GAMES.md/wiki
$ find Games -maxdepth 2 -name index.html (line counts < 25)                 → 6 files (see §4)
$ rg "_emulatorjs" Games/                                                    → 18 referencing files
```

---

## 1. Catalog integrity (games.json)

| Check | Result |
|---|---|
| Parses as JSON, entry count | 120 entries (ids 4–221) |
| Duplicate ids | none |
| Placeholder/empty title / desc / cat / url | none (no "TODO", "lorem", "coming soon", no descs < 25 chars) |
| Every `url` resolves to a real file on disk | **120 / 120 OK** |
| Extra schema keys | `tags` on 93 entries; `howto`+`players` on ids 4/5/6/47/129 (already flagged by docs/catalog-audit.md §1 — outside my remit, not re-proposed) |
| Empty `icon` | **88 of 120 entries** (see finding D-1) |

### D-1 · 88 empty `icon` values (LOW, cosmetic)

| item | evidence | verdict | proposed action | deference note |
|---|---|---|---|---|
| Empty icon on 88/120 entries | `python3 -c "...Counter(g['icon'])"` → `'' × 88`; every empty-icon entry has id < 195; all 32 id ≥ 195 entries (Sokoban…Balatro wave) carry emoji icons. Portal already has a robust fallback: `assets/portal-ux.js` `getGameIcon(title, cat)` → `CATEGORY_ICONS[category] || CATEGORY_ICONS['classic']`, so empty icons render a category SVG, not a blank | KEEP (functionally fine) | FIX (optional): either populate `icon` on the 88 (house emoji convention exists: ⚔️/🚀/🃏…), or strip the key entirely and rely on the portal fallback. Not worth churn on its own; fold into the next catalog-touching commit | Cosmetic; portal fallback verified working, worker B saw no broken tiles from this |

### D-2 · Odd nested URLs (INFO, no action)

`id 7 → Games/Ovo/1.4.5/index.html` (versioned build tree) and `id 8 → Games/Run3/tn6pS9dCf37xAhkJv/index.html` (hashed dir) both resolve and are documented third-party bundles. **KEEP as-is.**

### D-3 · Icon inconsistency within one series (LOW)

`id 127 'Fireboy and Watergirl'` has **no** icon while its four siblings (128/129/131/132/133) share `⚔️`. **FIX (optional):** add `⚔️` to id 127 in the same pass as D-1.

---

## 2. Cross-check vs docs — games documented removed/broken that still sit in the catalog

Good news first: **every previously-decided removal is actually gone from games.json.** Verified absent: Fruit Ninja Hacked, Poor Bunny Hacked, Crossy Road Hacked (commit `af5be80`); Hextris, QwopRemake, Star Catcher, Paddle Duel, Brick Dash, Tile Merge, Match Flip, FPS, Letter Boxed, Boss Rush, Grid Heist, Last Lantern, Queue Escape, Story Adventure, Tetris, Pong, Minesweeper, Tic Tac Toe, Connect Four, Memory, Whack-a-Mole, Simon Says, Typing Speed, Math Quiz, Lights Out, Sudoku, Wordle, Hangman (`5e25f16`); 2048, Age of War, Flappy Bird, Helix Jump, Fireboy Fairy Tales (both), Thumb Fighter, Neon×5, House of Hazards (`5863572`); Slope/QWOP-remake also confirmed absent at HEAD.

| item | evidence | verdict | proposed action | deference note |
|---|---|---|---|---|
| **D-4 · Balatro (id 221) missing from audit_verdicts.md and GAMES.md/wiki tables** | `python3 (title-in-corpus)` → `[(221, 'Balatro')]` — the ONLY catalog title absent from `docs/audit_verdicts.md`; also absent from `docs/GAMES.md` (41 table rows, ids 1–60) and `docs/wiki/Game-List.md`. It IS documented in `docs/mirror_sources.md:384-390` ("Source: github.com/OutBlade/balatro-web @ 3c8cf43 … browser boot test passed") and in commit `f926125` | KEEP (game is fine; docs gap) | FIX (docs): add Balatro rows to `docs/GAMES.md` + `docs/wiki/Game-List.md`, and a Phase-5-style verdict line in `docs/audit_verdicts.md` (source: mirror_sources.md batch, house EmulatorJS pattern) | Docs-only; no code/catalog change |
| **D-5 · GAMES.md / wiki / README counts are badly stale** | `docs/GAMES.md:3` "All **42 registered games**"; table has 41 rows covering ids 1–60 only — **79 of 120 catalog entries** (Cut the Rope, Vex 7, Geometry Dash Lite, the whole GBA row, Pokémon row, all 195+ mirrors, Balatro…) have no per-game row. `docs/wiki/Game-List.md:3` "All 29 games"; `README.md:80` "all 29 registered games". Actual: **120 entries, 123 dirs**. Also `README.md:67` still cites "Slope, Flappy Bird, Hextris, Age of War" as registered remote-dependent examples — all four are **no longer in the catalog** (verified: none in games.json) | KEEP (game data correct) | FIX (docs): regenerate GAMES.md table from games.json (120 rows), fix counts in README/wiki/ARCHITECTURE (already proposed by sweep-workerE — endorse), and replace the stale remote-dependent examples or note they were removed | Overlaps workerE finding; deference to whoever owns the docs pass |
| **D-6 · Cut the Rope (id 62) "BROKEN" verdict line vs later PASS** | `docs/audit_verdicts.md:74` batch-2 "functional BROKEN (intro_1024.mp4 net::ERR_ABORTED)"; `:256` Phase1b "menu + drag-cuts work"; `:376` "Known quirk documented… **signed off**"; `:437` final verdict "PASS … KEPT (unchanged this round)". `Games/CutTheRope/video/intro_1024.mp4` exists on disk | KEEP (resolved; no action) | NONE — record here so future sweeps don't re-flag it | None |
| **D-7 · Headless-flagged titles still KEPT by explicit sign-off** | Retro Bowl / Retro Bowl Hacked ("do not remove, flagship", `audit_verdicts.md` Phase-4), Temple Run 2 ("verify on real browser before any decision", `:436` final "ENV-LIMITED … KEPT"), Vex 7 (`:439` "KEPT, no fix shipped" — known issue). The mandatory pre-push smoke gate (`scripts/smoke_test_games.py`) is the enforcement path | KEEP | NONE (re-confirm via the smoke gate at next push) | Operator already signed these; I add nothing |
| **D-8 · Stale QWOP note in GAMES.md** | `docs/GAMES.md:86` "The registered 'QWOP' entry (id 15) points to `Games/QwopRemake/index.html`" — **id 15 no longer exists**; QwopRemake was deleted in `5e25f16`. Same stale claim in `docs/wiki/Game-List.md:47`, `docs/ARCHITECTURE.md:36` | (docs item) | FIX (docs): update the three stale "id 15 → QwopRemake" sentences to match reality (QWOP fully removed from catalog; see D-10 for the orphan dir) | Docs-only |

---

## 3. Dirs on disk with NO catalog entry (exactly 3, as predicted)

| item | evidence | verdict | proposed action | deference note |
|---|---|---|---|---|
| **D-9 · `Games/_emulatorjs/` (50 MB)** | Unregistered by design — it is the **shared EmulatorJS runtime**, referenced by **18 game files**: `rg -l _emulatorjs Games/` → 17 GBA wrappers (`PokemonEmerald/index.html`, `DrMario/index.html`, `Balatro/index.html`, …) + `Balatro/CREDITS.md`. Pattern documented in `docs/mirror_sources.md:389` ("house EmulatorJS pattern … shared local ../_emulatorjs loader") and `docs/audit_verdicts.md:471+` ("LOCAL EmulatorJS infra … zero external URLs") | KEEP — **NOT junk, NOT a candidate for the "suspected-dead" list** (workerE's SUSPECTED-DEAD entry for it can be closed with this evidence) | FIX (docs, optional): add one ARCHITECTURE.md line noting `_emulatorjs` is load-bearing infra for 17 catalog games | Do not delete — 17 games break |
| **D-10 · `Games/QWOP/` (24 KB, single 18.5 KB index.html)** | Not referenced by games.json (no id 15 at HEAD). It is a **different folder** from the removed `Games/QwopRemake` (deleted in `5e25f16` as agent-built). Documented as an intentional orphan: `docs/GAMES.md:86`, `docs/wiki/Game-List.md:47`, `docs/ARCHITECTURE.md:36`. Grep: zero external URLs in its index.html. Last touched `2a6849c "Added basic qwop"` (2026-04-04) | KEEP (documented deliberate orphan, tiny) — or REMOVE if the operator wants the GAMES.md "Unregistered folders" section to go empty | **PROPOSE-REMOVE (operator call):** if the mirrors-only directive also applies to this unregistered single-file remake (same no-attribution profile that killed QwopRemake), `git rm -r Games/QWOP` and collapse the stale docs notes (D-8). If kept, fix D-8 wording only | **REMOVALS REQUIRE OPERATOR SIGN-OFF** — worker D will not act |
| **D-11 · `Games/Slope/` (8 KB, 1 file)** | History: originally a full-page iframe to `AidanTangTPS.github.io/Slope-Game` (`84ee549`, 2026-03-18); at `41a5911` (2026-08-11) catalog id 3 was demoted to "Unavailable offline" desc and index.html replaced with the static stub page now on disk ("Slope is unavailable offline … ← Back to Arcade", no scripts, no external URLs). The id-3 catalog entry itself was removed by `5863572` (operator-directed embedded-game cleanup). Result: a registered-nobody stub that can only be reached by typing the URL | **PROPOSE-REMOVE** (stale stub of a deliberately-removed entry; its only content is "this game is unavailable") — or, alternative: re-register as a `classic`-cat "offline notice" page if deep links matter. Either way docs must stop describing Slope as a registered remote-iframe game (D-5) | **REMOVALS REQUIRE OPERATOR SIGN-OFF** — worker D will not act. WorkerE independently flagged the same dir as SUSPECTED; this report supplies the git-history evidence it lacked |

---

## 4. Suspiciously bare index.html files (< ~25 lines)

| item | evidence | verdict | proposed action | deference note |
|---|---|---|---|---|
| **D-12 · GBA wrappers: `PokemonEmerald`, `PokemonFireRed`, `PokemonRuby`, `PokemonUnbound` (18 lines each)** | e.g. `Games/PokemonEmerald/index.html`: 18 lines, `EJS_core="gba"`, `EJS_startOnLoaded=true`, `EJS_pathtodata="../_emulatorjs/data/"`, local ROM — this is the **house EmulatorJS pattern**, audited PASS in `docs/audit_verdicts.md:473-475` | KEEP | NONE — bareness is the design | — |
| **D-13 · `Games/Balatro/index.html` (25 lines)** | Same house pattern + `CREDITS.md`; documented `docs/mirror_sources.md:384`. Only gap is docs-table absence (D-4) | KEEP | FIX (docs): add to GAMES.md/audit docs per D-4 | — |
| **D-14 · `Games/LunarLander/index.html` (12 lines)** | Tiny but legit: local `lunar-lander.js` (8.5 KB), MIT LICENSE + CREDITS.md shipped; registered id 218, PASS in `docs/audit_verdicts.md`. **One real gap: no viewport meta** — likely poor on mobile (`grep -c viewport` → 0) | KEEP | FIX (minor): add `<meta name="viewport" …>` like sibling ingests (Pacman/Qix/Tron wrappers all note "added viewport meta" in their headers) | One-line game edit; coordinate with game-fix wave |
| **D-15 · `Games/DuckHunt/index.html` (21 lines)** | Ingested open-source build (Matt Surabian DuckHuntJS; `duckhunt.js`, sprites, audio, LICENSE, CREDITS.md all local); registered id 220, documented in mirror_sources batch-2; a178a82 specifically fixed its webpack-chunk 404s | KEEP | NONE | — |

Placeholder-text scan across all 143 game `index.html` with `<script>`: only `placeholder=` input attributes and a CSS `::placeholder` rule (AchtungDieKurve, WordLadder, WordScramble) — **no shipped "coming soon"/lorem/TODO stubs**.

---

## REMOVALS REQUIRE OPERATOR SIGN-OFF

Nothing has been removed. The following are **proposals only**; each needs an explicit operator decision before anyone acts:

1. **`Games/Slope/`** (D-11) — stale "unavailable offline" stub whose catalog entry was removed in `5863572`. Propose `git rm -r Games/Slope` **or** deliberate re-registration; docs must be fixed either way.
2. **`Games/QWOP/`** (D-10) — unregistered single-file remake, same no-attribution profile as the QwopRemake deleted in `5e25f16`, but it is documented as a known orphan in three docs files, so KEEP is also defensible. Operator call.

**Explicitly NOT proposed for removal:** `Games/_emulatorjs/` (load-bearing infra for 17 games — evidence in D-9), `Games/Character AI/` (read-only, untouched), and every catalog entry (all 120 urls resolve; no scam/dead-hack builds remain from any prior removal wave).

## Summary

| # | Item | Type | Action proposed |
|---|---|---|---|
| D-1 | 88 empty `icon` values | LOW | FIX (optional) — populate or rely on portal fallback |
| D-3 | Fireboy id 127 missing icon | LOW | FIX (optional, fold into D-1) |
| D-4 | Balatro absent from GAMES.md / wiki / audit_verdicts | MEDIUM (docs) | FIX — add rows/verdict line |
| D-5 | GAMES.md/wiki/README counts + remote-examples stale (42/29 vs 120) | MEDIUM (docs) | FIX — regenerate catalog docs |
| D-6 | Cut the Rope BROKEN line | resolved | KEEP, none |
| D-7 | Retro Bowl, Temple Run 2, Vex 7 headless flags | resolved | KEEP, enforce via smoke gate |
| D-8 | Stale "id 15 → QwopRemake" notes (GAMES.md:86, wiki:47, ARCHITECTURE:36) | docs | FIX alongside D-5 |
| D-9 | `Games/_emulatorjs/` unregistered | INFO | KEEP — load-bearing infra; close workerE's SUSPECTED-DEAD flag |
| D-10 | `Games/QWOP/` orphan | MEDIUM | PROPOSE-REMOVE or KEEP + docs fix — **operator sign-off required** |
| D-11 | `Games/Slope/` stub | MEDIUM | PROPOSE-REMOVE (or re-register) — **operator sign-off required** |
| D-14 | Lunar Lander missing viewport meta | LOW | FIX (one line) |
| — | Catalog schema / urls / dupes / placeholders | PASS | 120/120 urls resolve, no stubs, no dead builds |

Worker D time: within budget. No catalog edits, no deletions, no pushes.
