# UNBLOCKMATH // ARCADE

A browser-games site. The repository **root is the deployed static site** — there is no build step. The portal (React app compiled into `./assets/`) fetches `games.json` at runtime, so adding a game is just a new folder plus a catalog entry.

- **Hosting:** Netlify. `netlify.toml` sets `publish = "."` — the repo root is served directly.
- **Catalog:** `games.json` at the repo root is the single source of truth for the game grid (search, categories, featured row).
- **Games:** each game lives in `Games/<Name>/` as a self-contained folder with an `index.html` entry point (plus optional `script.js` / `style.css`).
- **Docs:** `docs/` holds the architecture (`docs/ARCHITECTURE.md`), the full game catalog (`docs/GAMES.md`), deployment notes (`docs/DEPLOYMENT.md`), the proxy design (`docs/proxy.md`), and a paste-ready wiki (`docs/wiki/`).

---

## Adding a game

1. **Create the game folder.** `Games/<Name>/index.html` (+ `script.js`, `style.css` as needed). The game must be self-contained and offline (see policy below), mobile-friendly, with a start screen, a clear win/lose state, a score, a restart path, and its controls documented in-page.
2. **Register it in `games.json`.** Append an entry with a **unique integer `id`** (highest existing id + 1). The `url` must resolve to a real file relative to the repo root.
3. **Validate** before committing:
   ```bash
   python3 -c "import json; d=json.load(open('games.json')); print(len(d))"
   python3 - <<'PY'
   import json, os
   for g in json.load(open('games.json')):
       assert os.path.isfile(g['url']), g['url']
   print('all urls OK')
   PY
   ```
4. **Commit:** `feat: add <Name>` (see `docs/CODE_QUALITY.md` §2 for commit conventions).

### `games.json` schema

Every entry is exactly:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | int | Unique. New games: current max + 1. |
| `title` | string | Display name in the grid. |
| `cat` | string | Category: `classic`, `action`, `sports`, `strategy`, `puzzle`, `riddle`, … |
| `icon` | string | Emoji used as the tile icon. |
| `desc` | string | One-line description shown on the tile. |
| `url` | string | Relative path to the game's entry HTML (must exist). |
| `featured` | bool | Whether the game shows in the featured row. |

Example:

```json
{
  "id": 47,
  "title": "Example Game",
  "cat": "classic",
  "icon": "🎮",
  "desc": "A short, honest description of the game.",
  "url": "Games/ExampleGame/index.html",
  "featured": false
}
```

---

## Offline-first policy

**Everything must work with zero network access.** The golden rules (full list in `AGENTS.md` and `docs/CODE_QUALITY.md`):

- No CDN scripts, no external fonts, no runtime `fetch()`/`WebSocket` to third parties — everything is vendored locally.
- No secrets, no absolute local paths in code or git history.
- `Games/Character AI/` is **read-only** — never edit or restructure it.
- The `/bare/*` proxy stays **disabled** (see `docs/proxy.md`).

The portal itself loads one external font (Google Fonts `Inter`, referenced in `index.html`); it falls back to system fonts when offline. Games are audited for external references; see `docs/GAMES.md` — status is labeled honestly per game, and **remote-dependent games are not claimed to be offline** (notably Slope, Flappy Bird, Hextris, Age of War, and Multiplayer Arena Shooter, which are embedded/remote or need signaling).

## Eaglercraft — honesty note

`Games/Eaglercraft/` runs **EaglercraftX 1.8.8** (client bundle from [eaglerforge](https://github.com/eaglerforge)) with everything served locally — nothing is fetched from an external CDN or tracking service. The wrapper is an **offline sandbox**: relays and servers are empty by default, and clicking **Singleplayer** creates a local offline world.

Licensing honesty: the bundle contains **GPL-3.0 components** and **Minecraft 1.8 assets that require the player to own a copy of Minecraft Java Edition**. Playing implies you have a legitimate Minecraft Java license. Do not remove this note.

## Original code note

Most arcade games under `Games/` (FPS, Boss Rush, Star Catcher, Paddle Duel, Brick Dash, Tile Merge, Match Flip, Memory Match, Mental Math, Times Tables, Typing Test, Word Scramble, Letter Boxed, Spelling Bee, Sudoku, Connections, A-GEO Quiz, Balance Beam Bash, Grid Heist, Last Lantern, Orbit Relay, Parcel Panic, Pattern Panic, Pocket Bumper, Queue Escape, Signal Sprint, Story Adventure, Word Relay Riot, Wordle, and others) are **original code written for this repo**. A handful of folders bundle third-party games (Ovo, Run 3, Snake, Chrome Dino, Breakout, QWOP remake, the "Random" sports games, Eaglercraft) with their original licensing/attribution kept intact. The game catalog (`docs/GAMES.md`) flags provenance per game.

## Character AI — honesty note

`Games/Character AI/` (registered as "Character Alsen", id 14) is a **scripted, rule-based local chatbot** — a keyword-matching chat simulation with pre-written responses. It is **not** a hosted LLM or API call; it works fully offline and sends nothing anywhere. The folder is **read-only** per repo policy.

## Useful links

- `docs/ARCHITECTURE.md` — how the repo fits together
- `docs/GAMES.md` — catalog of all 46 registered games (category, controls, status)
- `docs/DEPLOYMENT.md` — Netlify deployment and the disabled `/bare` / UV posture
- `docs/proxy.md` — full design and caveats of the Ultraviolet launcher
- `docs/CODE_QUALITY.md` — code-quality contract and verification commands
- `docs/wiki/` — wiki-ready pages (Home, Game List, Adding a Game, Deploying, Security)
