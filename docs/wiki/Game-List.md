# Game List

All 46 games registered in `games.json`. Status is based on the actual files — games that need the network are **not** labeled offline.

**Status key:** ✅ Offline (self-contained) · ⚠️ Offline-capable (cosmetic external refs) · ❌ Remote-dependent (needs network to play)

| # | Title | Category | Controls | Status |
| --- | --- | --- | --- | --- |
| 1 | 2048 | classic | W / A / S / D | ⚠️ (external favicon only) |
| 2 | Age of War | strategy | Mouse | ❌ (Ruffle from unpkg CDN) |
| 3 | Slope | action | Arrow keys | ❌ (remote iframe) |
| 4 | Soccer Random | sports | Arrows + Space | ⚠️ (local C3 export) |
| 5 | Basket Random | sports | Arrows + Space | ⚠️ (local C3 export) |
| 6 | Volley Random | sports | Arrows + Space | ⚠️ (local C3 export) |
| 7 | Ovo | action | WASD/Arrows, Space jump, Shift run | ⚠️ (tips/adblock calls fail silently) |
| 8 | Run 3 | action | Arrow keys (run/jump, rotate) | ⚠️ (external link hooks only) |
| 9 | Snake | classic | WASD / Arrows / touch buttons | ✅ |
| 10 | Chrome Dino | classic | Space/Up jump, Down duck, tap | ✅ |
| 11 | Breakout | classic | Left/Right arrows, touch drag | ⚠️ (external font link) |
| 12 | Hextris | classic | Arrow keys | ❌ (remote iframe) |
| 13 | Flappy Bird | classic | Tap / Space | ❌ (remote iframe) |
| 14 | Character Alsen | riddle | Type + send (scripted bot) | ✅ (READ-ONLY folder) |
| 15 | QWOP | sports | Q / W / O / P | ✅ |
| 16 | Star Catcher | action | Arrows / A-D / touch buttons | ✅ |
| 17 | Paddle Duel | sports | P1 W/S, P2 Up/Down, Space start | ✅ |
| 18 | Brick Dash | classic | Arrows move, Space dash | ✅ |
| 19 | Tile Merge | classic | Arrows/WASD, Space, tap | ✅ |
| 20 | Match Flip | classic | Arrows/WASD, Space, tap | ✅ |
| 21 | A-GEO Quiz | classic | 1–4 / A–D, Enter, R | ✅ |
| 22 | Connections | puzzle | Tap / Arrows, Space, Enter, S | ✅ |
| 23 | Eaglercraft | action | Minecraft 1.8 controls | ✅ (offline SP; GPL-3.0, own MC Java) |
| 24 | FPS | action | Mouse look, WASD, LMB, 1/2/3, R, Shift, Space | ✅ |
| 25 | Memory Match | classic | Tap / Arrows + Space/Enter | ✅ |
| 26 | Multiplayer Arena Shooter | action | WASD, mouse, LMB, Space, R | ❌ (PeerJS cloud signaling) |
| 27 | Sudoku | puzzle | Tap, Arrows, 1–9, N | ✅ |
| 28 | Times Tables | classic | Digits, Backspace, Enter | ✅ |
| 29 | Typing Test | classic | Type, Space, Backspace | ✅ |
| 30 | Word Scramble | puzzle | Letters, Backspace, Enter, H/S | ✅ |
| 31 | Letter Boxed | puzzle | Tap / A–Z, Backspace, Enter | ✅ |
| 32 | Mental Math | classic | Digits, Backspace, Enter | ✅ |
| 33 | Spelling Bee | puzzle | Tap / A–Z, Enter, Space, N | ✅ |
| 34 | Balance Beam Bash | sports | P1 A/S, P2 L/K, Space, R, M | ✅ |
| 35 | Boss Rush | action | WASD, click/Space shoot, R | ✅ |
| 36 | Grid Heist | strategy | Arrows/WASD, Space claim, Enter | ✅ |
| 37 | Last Lantern | action | P1–P4 key sets, R, Esc | ✅ |
| 38 | Orbit Relay | action | Hold Left/Right, Enter, P, Esc | ✅ |
| 39 | Parcel Panic | action | P1–P4 key sets, R, Esc | ✅ |
| 40 | Pattern Panic | classic | 1–6 symbols, R, Esc | ✅ |
| 41 | Pocket Bumper | action | P1 WASD, P2 Arrows, drag | ✅ |
| 42 | Queue Escape | strategy | Co-op P1–P4 key sets, R, Esc | ✅ |
| 43 | Signal Sprint | action | P1=A … P6=K, touch lanes | ✅ |
| 44 | Story Adventure | puzzle | Tap choice / number keys, R, M | ✅ |
| 45 | Word Relay Riot | puzzle | Type, Enter, Esc, R | ✅ |
| 46 | Wordle | puzzle | Type/tap, Enter, Backspace | ✅ |

## Remote-dependent games (not offline)

- **Slope, Hextris, Flappy Bird** — the entry `index.html` is a full-page `<iframe>` to an external site. No network, no game.
- **Age of War** — Flash `.swf` played through Ruffle, which is fetched from `unpkg.com` at runtime.
- **Multiplayer Arena Shooter** — P2P WebRTC gameplay, but room setup uses the public PeerJS cloud by default.

## Notes

- **2048** binds only WASD in this build (arrow keys/touch are not wired).
- **Character Alsen** is a scripted, offline keyword-matching chatbot — not a hosted LLM. The folder is read-only.
- **Eaglercraft** is an offline sandbox (relays empty); it bundles GPL-3.0 components and MC 1.8 assets that require owning Minecraft Java Edition.
- `Games/QWOP/` is an unregistered folder; the registered "QWOP" entry points to `Games/QwopRemake/`.

Full details, controls, and per-game notes: see [`docs/GAMES.md`](../GAMES.md).
