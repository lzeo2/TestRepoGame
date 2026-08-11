# Game Catalog — UNBLOCKMATH // ARCADE

All **47 registered games** from `games.json` (ids 1–47). Category comes from the catalog `cat` field; controls and status are based on the actual files in `Games/`.

**Status key**

| Mark | Meaning |
| --- | --- |
| ✅ Offline | Fully self-contained; works with zero network access. |
| ⚠️ Offline-capable | Gameplay runs offline; cosmetic external references (fonts, favicons, links) or bundle attempts that fail silently. |
| ❌ Remote-dependent | Requires network to actually play (embedded iframe or runtime CDN/signaling). **Not offline.** |

---

| # | Title | Cat | Controls | Status |
| --- | --- | --- | --- | --- |
| 1 | 2048 | classic | W / A / S / D (arrow keys and touch are not bound in this build) | ⚠️ Offline-capable — external favicon (`i.ibb.co`) only |
| 2 | Age of War | strategy | Mouse (Flash game) | ❌ Remote-dependent — loads Ruffle from `unpkg.com` CDN at runtime |
| 3 | Slope | action | Arrow keys (embedded game) | ❌ Remote-dependent — full-page iframe to `AidanTangTPS.github.io/Slope-Game` |
| 4 | Soccer Random | sports | Arrows + Space (wrapper binds these; in-game C3 bindings per original) | ⚠️ Offline-capable — local Construct 3 export |
| 5 | Basket Random | sports | Arrows + Space (wrapper binds these; in-game C3 bindings per original) | ⚠️ Offline-capable — local Construct 3 export |
| 6 | Volley Random | sports | Arrows + Space (wrapper binds these; in-game C3 bindings per original) | ⚠️ Offline-capable — local Construct 3 export |
| 7 | Ovo | action | WASD / Arrows move · Space / Up jump · Shift run (standard Ovo) | ⚠️ Offline-capable — bundle attempts a tips fetch + adblock-check XHR that fail silently offline |
| 8 | Run 3 | action | Arrow keys — run/jump, Left/Right rotate the tunnel | ⚠️ Offline-capable — self-contained bundle; contains external ad/store link hooks (not gameplay fetches) |
| 9 | Snake | classic | WASD / Arrows · on-screen mobile buttons | ✅ Offline |
| 10 | Chrome Dino | classic | Space / Up jump · Down duck · tap to jump | ✅ Offline |
| 11 | Breakout | classic | Left/Right arrows · touch drag | ⚠️ Offline-capable — external Google Fonts link (cosmetic, falls back); dead `compiled.css` link |
| 12 | Hextris | classic | Arrow keys (embedded game) | ❌ Remote-dependent — full-page iframe to `hextris.github.io/hextris` |
| 13 | Flappy Bird | classic | Tap / click / Space (embedded game) | ❌ Remote-dependent — full-page iframe to `flappybird.io` |
| 14 | Character Alsen | riddle | Type a message, press send/Enter | ✅ Offline — **scripted** local keyword-matching chatbot (not a hosted LLM). Folder is READ-ONLY. |
| 15 | QWOP | sports | Q = left thigh · W = right thigh · O = left calf · P = right calf | ✅ Offline (registered entry points at `Games/QwopRemake/`) |
| 16 | Star Catcher | action | Left/Right arrows or A/D · touch buttons | ✅ Offline |
| 17 | Paddle Duel | sports | P1: W / S · P2: Up / Down · SPACE starts · first to 5 | ✅ Offline |
| 18 | Brick Dash | classic | Left/Right arrows move · SPACE launch/dash · touch buttons | ✅ Offline |
| 19 | Tile Merge | classic | Arrows / WASD · SPACE select · tap tiles + buttons | ✅ Offline |
| 20 | Match Flip | classic | Arrows / WASD move · SPACE flip · tap cards | ✅ Offline |
| 21 | A-GEO Quiz | classic | 1–4 or A–D to answer · ENTER continue · R restart | ✅ Offline |
| 22 | Connections | puzzle | Tap words · Arrows/WASD move · Space select · Enter submit · S shuffle | ✅ Offline |
| 23 | Eaglercraft | action | Minecraft 1.8 defaults: WASD move · mouse look · LMB mine · RMB place · Space jump · E inventory · Q drop · F5 camera · Esc menu | ✅ Offline singleplayer — GPL-3.0 components; **requires owning Minecraft Java Edition** (see `README.md`) |
| 24 | FPS | action | Mouse look · WASD/Arrows move · LMB fire · RMB alt fire · 1/2/3 weapons · R reload · Shift walk · Space hop · Esc pause | ✅ Offline (original raycast renderer) |
| 25 | Memory Match | classic | Click/tap cards · Arrows/WASD + Space/Enter flip · R restart · Esc quit | ✅ Offline |
| 26 | Multiplayer Arena Shooter | action | WASD/Arrows move · mouse aim · LMB shoot · Space dash · R respawn · touch sticks | ❌ Remote-dependent — PeerJS **cloud signaling** (`0.peerjs.com`) needed to create/join rooms (gameplay is P2P WebRTC) |
| 27 | Sudoku | puzzle | Tap cell then number · Arrows move · 1–9 enter · 0/Backspace erase · N notes | ✅ Offline |
| 28 | Times Tables | classic | Digits · Backspace · Enter · touch keypad | ✅ Offline |
| 29 | Typing Test | classic | Type the passage · Space next word · Backspace fix errors | ✅ Offline |
| 30 | Word Scramble | puzzle | Type letters · Backspace · Enter submit · H hint · S skip · tap tiles | ✅ Offline |
| 31 | Letter Boxed | puzzle | Tap letters · A–Z keyboard · Backspace · Enter submit · Esc clears | ✅ Offline |
| 32 | Mental Math | classic | Digits · Backspace · Enter · touch keypad | ✅ Offline |
| 33 | Spelling Bee | puzzle | Tap letters or type A–Z · Enter submit · Backspace delete · Space shuffle · N new | ✅ Offline |
| 34 | Balance Beam Bash | sports | P1: A tip / S launch · P2: L tip / K launch · SPACE start · R restart · M mute | ✅ Offline |
| 35 | Boss Rush | action | WASD/Arrows move · mouse click or SPACE shoot · R restart · touch FIRE | ✅ Offline |
| 36 | Grid Heist | strategy | 2/3/4 players · Arrows/WASD move · Space claim · Enter start · 4s per turn | ✅ Offline |
| 37 | Last Lantern | action | P1: WASD + Q dash · P2: Arrows + / · P3: IJKL + U · P4: Numpad 8456 + 0 · R restart · Esc menu | ✅ Offline |
| 38 | Orbit Relay | action | 2–4 players · hold Left/Right to orbit · 6/7/8 round length · Enter start · P pause · Esc menu | ✅ Offline |
| 39 | Parcel Panic | action | P1: WASD + Space · P2: Arrows + Enter · P3: IJKL + O · P4: TFGH + Y · R restart · Esc menu | ✅ Offline |
| 40 | Pattern Panic | classic | 2–6 players · 1–6 press symbols · R restart · Esc menu · tap buttons | ✅ Offline |
| 41 | Pocket Bumper | action | P1: WASD · P2: Arrow keys · touch drag half-screen · R restart | ✅ Offline |
| 42 | Queue Escape | strategy | Co-op 1–4: P1 WASD + Space · P2 Arrows + Enter · P3 IJKL + O · P4 TFGH + Y · R restart · Esc menu | ✅ Offline |
| 43 | Signal Sprint | action | 2–6 players · P1=A P2=S P3=D P4=F P5=J P6=K · touch/click your lane | ✅ Offline |
| 44 | Story Adventure | puzzle | Tap a choice or press its number key · R restart · M menu (text adventure, 5 endings) | ✅ Offline |
| 45 | Word Relay Riot | puzzle | Type word · Enter submit · Esc menu · R restart | ✅ Offline |
| 46 | Wordle | puzzle | Type or tap letters · Enter submit · Backspace delete · 6 guesses | ✅ Offline |
| 47 | Gladihoppers | action | P1/P2 pick WASD, Arrows, or gamepad in the pre-fight menu · mouse/touch for menus | ✅ Offline |

---

## Notes on specific games

- **2048 (1):** the local build binds only `W/A/S/D` — the arrow keys and touch/swipe are not wired up in this copy. The external reference is a favicon only; gameplay is local.
- **Ovo (7):** the original bundle contains an ad-block-detection XHR (`api.adinplay.com`) and a tips fetch (`dedragames.com/games/ovo/.../tips.json`). Offline these fail silently and the game still plays from the local `data.js`/assets.
- **Run 3 (8):** gameplay is fully local; the bundle carries external link hooks (an ad-click URL and store/credits links) that open in new tabs — they are not game-state fetches.
- **Age of War (2):** the game is a Flash `.swf` played through Ruffle, which is loaded from `https://unpkg.com/@ruffle-rs/ruffle`. Without network, Ruffle never loads and the game cannot start.
- **Multiplayer Arena Shooter (26):** gameplay data flows peer-to-peer over WebRTC, but room creation/joining goes through the **public PeerJS cloud** by default. It can point at a self-hosted PeerServer via query params (`?host=...&port=...`), but out of the box it needs network.
- **Gladihoppers (47):** vendored Unity WebGL build (v3.0.1, Dreamon Studios) from `github.com/1000unblockedgames/Gladihoppers` (commit `a14cd76`); ad/analytics scripts removed and a local no-op Poki SDK stub keeps it fully offline — the online-PvP and IAP buttons are inert without network.
- **Random sports games (4, 5, 6):** Construct 3 exports with local assets (`box2d.wasm.js`, `scripts/offlineclient.js`, `scripts/main.js`). Leftover `ubg235`/analytics files exist in the folders but are **not loaded** by `index.html`, so they don't affect offline play.
- **Eaglercraft (23):** relays and server list are empty by default (`relays: null`, `servers: null` in `index.html`). Clicking **Singleplayer** creates a local offline world. Licensing: GPL-3.0 components + MC 1.8 assets require owning Minecraft Java Edition.

## Unregistered folders

- `Games/QWOP/` — a standalone QWOP-style game folder that is **not** referenced by `games.json`. The registered "QWOP" entry (id 15) points to `Games/QwopRemake/index.html`. Left untouched; flagged here for awareness.

## Provenance quick view

- **Original code (written for this repo):** FPS, Star Catcher, Paddle Duel, Brick Dash, Tile Merge, Match Flip, Memory Match, Mental Math, Times Tables, Typing Test, Word Scramble, Letter Boxed, Spelling Bee, Sudoku, Connections, A-GEO Quiz, Balance Beam Bash, Grid Heist, Last Lantern, Orbit Relay, Parcel Panic, Pattern Panic, Pocket Bumper, Queue Escape, Signal Sprint, Story Adventure, Word Relay Riot, Wordle, Boss Rush, Multiplayer Arena Shooter (wrapper/game code; PeerJS vendored).
- **Third-party bundles (attribution/licensing kept):** Ovo, Run 3, Snake, Chrome Dino, Breakout, QWOP remake, Soccer/Basket/Volley Random (Construct 3 exports), Eaglercraft (GPL-3.0 + MC assets), Gladihoppers (Unity WebGL, Dreamon Studios).
- **Read-only:** `Games/Character AI/`.
