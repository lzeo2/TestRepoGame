# AGENTS.md — TestRepoGame

Operating rules for any agent (opencode, Claude Code, Codex, Hermes) working in this repo. Read `docs/CODE_QUALITY.md` first — it is the code-quality contract and anti-vibe-coding standard. Read `docs/proxy.md` before touching anything proxy-related.

## What this repo is

"UNBLOCKMATH // ARCADE" — a browser games site. The repo ROOT is the deployed static site (Netlify, `netlify.toml` publish = "."). Games live in `Games/<Name>/` as self-contained static HTML/CSS/JS folders. `games.json` at root is the catalog; the portal JS fetches it at runtime, so appending an entry makes a game appear without rebuilding.

## Games ARE checked out locally (Sep 28, 2026)

**Games/ is fully materialized on the Pi (~1.9 GB, 125 dirs) and the repo is a proper git clone.** Confirm before assuming otherwise: `ls Games | wc -l`. Do NOT re-read old instructions that claim Games/ is sparse-only (that policy was superseded when disk pressure forced a re-checkout). If a future swarm finds Games/ absent, restore it with:
```
git clone --no-checkout --filter=blob:none https://github.com/lzeo2/TestRepoGame.git
cd TestRepoGame && printf '/*\n!/*/\n/Games/\n' > .git/info/sparse-checkout && git read-tree -mu HEAD
```

**When adding a new game:**
1. Create `Games/<Name>/` locally (it will be new, not in git yet)
2. Add entry to `games.json`
3. `git add Games/<Name>/ games.json && git commit`
4. `git push`

**When editing portal code (CSS, index.html, portal-ux.js):**
- Work directly — no game checkout needed
- These files are always checked out locally

**Games live on GitHub** (full repo) + **Google Drive** (backup at `TestRepoGame-Games/` folder).

## Golden rules (never violate)

1. **`Games/Character AI/` is READ-ONLY** — the Alsen chat game. Never move, edit, or restructure it.
2. **No secrets in code or git history** — tokens, keys, emails, absolute local paths (`/home/...`). Use relative paths only.
3. **Evidence before deletion** — never delete a file/dir without grepping the repo to prove it is unreferenced.
4. **`/bare/*` proxy stays DISABLED** — do not re-enable, repoint, or weaken netlify.toml security settings without security sign-off.
5. **Eaglercraft stays fully offline** — its wrapper must fetch nothing external; it carries a licensing note (GPL-3.0 components, requires owning Minecraft Java) — keep it.
6. **Disk guard** — always check `df -h / | tail -1` before operations. Games are NOT local — do not assume `Games/` exists on disk.

## Architecture quick facts

- `games.json` schema: `{id, title, cat, icon, desc, url, featured}` — unique int ids, urls must resolve to real files.
- Each game dir: `index.html` + `script.js` + `style.css` (inline JS/CSS fine for tiny games). Every game needs a start screen, win/lose state, score, restart path, controls documented in-page, mobile + keyboard input.
- Portal bundle: `assets/index-*.js` + `index-*.css` (minified, no source — polish via CSS + index.html only, per the Direction A decision).
- `uv/` = Ultraviolet proxy launcher (backend disabled), `docs/` = docs + wiki content, `netlify/` = functions.
- No build tooling. No node_modules. Repo must stay lean (currently ~1.9 GB across 125 games).

## Workflow conventions

- Commit at milestones with clear prefixes: `feat:`, `fix:`, `chore:`, `docs:`.
- Small bounded commits; never mix unrelated changes in one commit.
- Verify with real commands and quote output (see docs/CODE_QUALITY.md §7): games.json parse + url check, external-fetch grep, `node --check`, `du` audit, `git status`.
- **MANDATORY pre-push QA gate**: run `xvfb-run python3 scripts/smoke_test_games.py` — it loads EVERY registered game in a real browser, captures console errors + failed/4xx requests, and exits non-zero on any failure. Static checks are NOT sufficient: runtime bugs (missing files, undefined globals, broken fetches) only surface when the game actually loads. Any game that fails the gate must be fixed or explicitly reported before push.
- Swarms (opencode multi-agent): orchestrator plans + delegates, workers implement, reviewer/mimo verifies, security-audit + ui-audit cover their domains. Anti-hang rules: small bounded subagent tasks, abandon after 2 failures, progress line per delegation, no dev servers, commit at milestones, no silent delegation > ~20 min.
- Swarms MUST record scope/self-made status in the final report: did this run only work on existing games, or did it ADD new games? Every new game's build+register commit pair must be listed. (Sep 28, 2026 precedent: sweep added 5 games - EcoSphere 222, Hangman Rush 223, Pyramid Solitaire 224, Star Forge 225, Riddle Master 226 - all under the games.json schema above.)
- Disk guard: check `df -h / | tail -1` before big operations; if free < 2 GB, stop, commit, report.
- Report with evidence — never fabricate success.

## Adding a game

1. Create `Games/<Name>/` with a self-contained, mobile-friendly game.
2. Append its entry to `games.json` (new id, valid schema).
3. Validate: `python3 -c "import json; d=json.load(open('games.json')); print(len(d))"` and check every url resolves.
4. Commit: `feat: add <Name>`.
