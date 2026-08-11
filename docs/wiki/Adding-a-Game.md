# Adding a Game

Adding a game to the arcade takes two steps: create a self-contained game folder, then register it in `games.json`. The portal reads `games.json` at runtime, so **no rebuild is needed** — commit and it appears.

## Step 1 — Create the game folder

Create `Games/<Name>/` with an `index.html` entry point (plus `script.js` and `style.css` as needed; inline JS/CSS is fine for tiny games).

Requirements (see `docs/CODE_QUALITY.md` for the full contract):

- **Offline-first, self-contained.** No CDN scripts, no external fonts, no runtime `fetch()`/`WebSocket` to third parties. Everything must be vendored in the folder.
- **Mobile + keyboard input** both work; no horizontal overflow on phones.
- **Complete game loop:** start screen, play state, clear win/lose state, score display, restart path.
- **Controls documented in-page** on the start screen.
- `node --check` passes on every entry script; no `eval()`, no `document.write`.

Do **not** touch `Games/Character AI/` (read-only).

## Step 2 — Register in `games.json`

Append an entry with the **next unique integer id** (current max is 46):

```json
{
  "id": 47,
  "title": "Example Game",
  "cat": "classic",
  "icon": "🎮",
  "desc": "A short, honest description.",
  "url": "Games/ExampleGame/index.html",
  "featured": false
}
```

Schema:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | int | Unique. New games: current max + 1. |
| `title` | string | Display name. |
| `cat` | string | `classic`, `action`, `sports`, `strategy`, `puzzle`, `riddle`, … |
| `icon` | string | Emoji for the tile. |
| `desc` | string | One line for the tile. |
| `url` | string | Relative path to the entry HTML — must resolve to a real file. |
| `featured` | bool | Show in the featured row. |

## Step 3 — Validate

```bash
python3 -c "import json; d=json.load(open('games.json')); print(len(d))"
python3 - <<'PY'
import json, os
for g in json.load(open('games.json')):
    assert os.path.isfile(g['url']), g['url']
print('all urls OK')
PY
```

Also run the external-fetch and hygiene scans from `docs/CODE_QUALITY.md` §7.

## Step 4 — Commit

- `feat: add <Name>`
- Keep the commit small and scoped to the new game + its `games.json` entry.

## After adding

- The game appears in the portal automatically (the JS fetches `games.json` at runtime).
- If you add it to `docs/GAMES.md` / `docs/wiki/Game-List.md`, keep the table's controls and status accurate to the actual files — especially the offline/remote distinction.
