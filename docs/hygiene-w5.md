# Hygiene report — worker W5 (follow-up: stale counts, reverted-game refs, sweep-shots)

Date: session after the 5-game revert (`6810f76` / `88593a9`). All outputs below are quoted from real commands run in the repo root.

## 1. Stale game counts → VERIFIED FIXED (no diff needed by W5)

```
$ python3 -c "import json; print(len(json.load(open('games.json'))))"
120
```

Sweep D-5 / workerE flagged `docs/GAMES.md` "42 registered games", `docs/wiki/Game-List.md` "29 games", `README.md` "29 registered games", `docs/ARCHITECTURE.md` "30 folders, 29 registered", `docs/wiki/Home.md` "29 registered games".

These were already corrected in commit `10c81c1 docs: correct stale game counts and removed-feature claims` (worker F2's documented fix set) before W5 ran. Current state verified by grep:

```
$ grep -rniE "all [0-9]+ (registered )?games|[0-9]+ registered games|[0-9]+ games registered" README.md docs/*.md docs/wiki/*.md | grep -v "120"
(no count-claim hits; only audit prose "all 13 games" [batch scope] and design_review "15 of 118 games" [historical thumbnail-audit ratio] remain — neither is a catalog count)
```

Spot checks:

- `docs/GAMES.md:3` → "All **120 registered games** from `games.json` (ids 4–221 …)"
- `docs/wiki/Game-List.md:3` → "All 120 games registered in `games.json` (ids 4–221 …)"
- `README.md:80` → "catalog of the **120 registered games** (… ids 4–221, ~123 game folders on disk …)"
- `docs/ARCHITECTURE.md:14` → "(~123 folders; 120 registered entries in games.json)"
- `docs/wiki/Home.md:7` → "**120 registered games** in `Games/`"

**Files with stale counts (before → after): none pending — all already 120 via `10c81c1`. W5 made no count edits.**

## 2. Reverted self-made games — grep verdict: CLEAN (0 references)

```
$ grep -rniE "EcoSphere|Hangman Rush|Pyramid Solitaire|Star Forge|Riddle Master" README.md index.html games.json assets/ docs/ --exclude-dir=sweep-shots
(no output)  EXIT=1
```

Broader pattern incl. sweep-shots dir, text files only:

```
$ grep -rnoE "EcoSphere[A-Za-z0-9 ]*|Hangman Rush[A-Za-z0-9 ]*|Pyramid Solitaire[A-Za-z0-9 ]*|Star Forge[A-Za-z0-9 ]*|Riddle Master[A-Za-z0-9 ]*" README.md index.html games.json assets docs | grep -v "^docs/sweep-shots"
(no output)  EXIT=1
```

**Verdict: zero references to the 5 reverted games in docs/, README.md, index.html, assets/*.js|*.css, games.json (the only remaining hits anywhere are PNG filenames under docs/sweep-shots/, removed in step 3).** The word "Hangman" alone appears in audit docs but refers to the kept classic game id 88, not "Hangman Rush".

## 3. docs/sweep-shots/ — 6 untracked reverted-game screenshots DELETED (dir kept: 2 tracked files)

Orchestrator expected `git ls-files docs/sweep-shots/` to be empty; it was **not** — 2 portal screenshots are tracked and referenced in sweep reports:

```
$ git ls-files docs/sweep-shots/
docs/sweep-shots/portal-filters-after.png
docs/sweep-shots/portal-load.png
```

(referenced by `docs/sweep-workerB.md:10,31` and `docs/sweep-workerF1.md:90` — evidence-before-deletion rule ⇒ kept.)

`git status --porcelain` confirmed the 6 reverted-game PNGs untracked; deleted individually:

```
$ rm -f docs/sweep-shots/{ecosphere-gameplay,hangmanrush-play,hangmanrush-start,pyramidsolitaire,riddlemaster-play,starforge}.png
$ ls docs/sweep-shots/
portal-filters-after.png  portal-load.png
$ git status --porcelain docs/sweep-shots/
(clean)
```

**Result: all 6 reverted-game screenshots gone (untracked, unreferenced); the 2 tracked, referenced portal screenshots remain.**

## 4. Safety checks

- Disk: `df -h / | tail -1` → `29G total, 1.3G free (96%)` — within guard, no large operations performed.
- `games.json`, `Games/`, portal assets, `index.html`: untouched.
- `Games/Character AI/`: untouched (READ-ONLY respected).
