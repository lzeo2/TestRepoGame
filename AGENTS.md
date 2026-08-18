# AGENTS.md — TestRepoGame

Operating rules for any agent (opencode, Claude Code, Codex, Hermes) working in this repo. Read `docs/CODE_QUALITY.md` first — it is the code-quality contract and anti-vibe-coding standard. Read `docs/proxy.md` before touching anything proxy-related.

## What this repo is

"UNBLOCKMATH // ARCADE" — a browser games site. The repo ROOT is the deployed static site (Netlify, `netlify.toml` publish = "."). Games live in `Games/<Name>/` as self-contained static HTML/CSS/JS folders. `games.json` at root is the catalog; the portal JS fetches it at runtime, so appending an entry makes a game appear without rebuilding.

## CRITICAL: Games are NOT checked out locally

**Games/ is in the git repo (pushed to GitHub, deployed by Netlify) but NOT checked out locally on the Pi.** This saves 1.4GB of disk space. The Pi only has portal code locally (~200MB).

**When you need to work on games:**
1. Check out only the specific game: `git sparse-checkout add Games/<Name>`
2. Or download from GitHub: `git show HEAD:Games/<Name>/index.html > /tmp/game.html`
3. Work on it, test it, then: `git add Games/<Name> && git commit`
4. Push to GitHub: `git push` (Netlify auto-deploys)

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
2. **Offline-first** — every game and the portal must work with zero network access. No CDN scripts, no external fonts, no runtime fetch/WebSocket to third parties. Vendor everything locally.
3. **No secrets in code or git history** — tokens, keys, emails, absolute local paths (`/home/...`). Use relative paths only.
4. **Evidence before deletion** — never delete a file/dir without grepping the repo to prove it is unreferenced.
5. **`/bare/*` proxy stays DISABLED** — do not re-enable, repoint, or weaken netlify.toml security settings without security sign-off.
6. **Eaglercraft stays fully offline** — its wrapper must fetch nothing external; it carries a licensing note (GPL-3.0 components, requires owning Minecraft Java) — keep it.
7. **Disk guard** — always check `df -h / | tail -1` before operations. Games are NOT local — do not assume `Games/` exists on disk.

## Architecture quick facts

- `games.json` schema: `{id, title, cat, icon, desc, url, featured}` — unique int ids, urls must resolve to real files.
- Each game dir: `index.html` + `script.js` + `style.css` (inline JS/CSS fine for tiny games). Every game needs a start screen, win/lose state, score, restart path, controls documented in-page, mobile + keyboard input.
- Portal bundle: `assets/index-*.js` + `index-*.css` (minified, no source — polish via CSS + index.html only, per the Direction A decision).
- `uv/` = Ultraviolet proxy launcher (backend disabled), `docs/` = docs + wiki content, `netlify/` = functions.
- No build tooling. No node_modules. Repo must stay lean (currently ~0.8 GB, dominated by Eaglercraft + Ovo).

## Workflow conventions

- Commit at milestones with clear prefixes: `feat:`, `fix:`, `chore:`, `docs:`.
- Small bounded commits; never mix unrelated changes in one commit.
- Verify with real commands and quote output (see docs/CODE_QUALITY.md §7): games.json parse + url check, external-fetch grep, `node --check`, `du` audit, `git status`.
- **MANDATORY pre-push QA gate**: run `xvfb-run python3 scripts/smoke_test_games.py` — it loads EVERY registered game in a real browser, captures console errors + failed/4xx requests, and exits non-zero on any failure. Static checks are NOT sufficient: runtime bugs (missing files, undefined globals, broken fetches) only surface when the game actually loads. Any game that fails the gate must be fixed or explicitly reported before push.
- Swarms (opencode multi-agent): orchestrator plans + delegates, workers implement, reviewer/mimo verifies, security-audit + ui-audit cover their domains. Anti-hang rules: small bounded subagent tasks, abandon after 2 failures, progress line per delegation, no dev servers, commit at milestones, no silent delegation > ~20 min.
- Disk guard: check `df -h / | tail -1` before big operations; if free < 2 GB, stop, commit, report.
- Report with evidence — never fabricate success.

## Adding a game

1. Create `Games/<Name>/` with a self-contained, offline, mobile-friendly game.
2. Append its entry to `games.json` (new id, valid schema).
3. Validate: `python3 -c "import json; d=json.load(open('games.json')); print(len(d))"` and check every url resolves.
4. Commit: `feat: add <Name>`.
