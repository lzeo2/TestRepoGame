# Game List

All 120 games registered in `games.json` (ids 4–221 with gaps — the ids of removed games are not reused; ~123 game folders exist on disk). The table below keeps per-row detail for the early ids (4–60); for the later ids see the wave summaries and `docs/GAMES.md`. Status is based on the actual files — games that need the network are **not** labeled offline.

**Status key:** ✅ Offline (self-contained) · ⚠️ Offline-capable (cosmetic external refs) · ❌ Remote-dependent (needs network to play)

| # | Title | Category | Controls | Status |
| --- | --- | --- | --- | --- |
| 4 | Soccer Random | sports | Arrows + Space | ⚠️ (local C3 export) |
| 5 | Basket Random | sports | Arrows + Space | ⚠️ (local C3 export) |
| 6 | Volley Random | sports | Arrows + Space | ⚠️ (local C3 export) |
| 7 | Ovo | action | WASD/Arrows, Space jump, Shift run | ⚠️ (tips/adblock calls fail silently) |
| 8 | Run 3 | action | Arrow keys (run/jump, rotate) | ⚠️ (external link hooks only) |
| 9 | Snake | classic | WASD / Arrows / touch buttons | ✅ |
| 10 | Chrome Dino | classic | Space/Up jump, Down duck, tap | ✅ |
| 11 | Breakout | classic | Left/Right arrows, touch drag | ⚠️ (external font link) |
| 14 | Character Alsen | riddle | Type + send (scripted bot) | ✅ (READ-ONLY folder) |
| 47 | Gladihoppers | action | P1/P2 pick WASD, Arrows, or gamepad in the pre-fight menu | ✅ |

Full per-row detail for ids 61–221: see `docs/GAMES.md` ("Coverage note (ids 61–221)") and `games.json` itself.

## Notes

- **Character Alsen** is a scripted, offline keyword-matching chatbot — not a hosted LLM. The folder is read-only.
- `Games/QWOP/` and `Games/Slope/` are unregistered folders left over from removed entries (QWOP id 15, Slope id 3); they await an operator keep/remove decision. `Games/_emulatorjs/` is an unregistered-by-design shared runtime for the EmulatorJS-wrapper games.
- **Catalog pruning (2026-08):** 18 self-built games (A-GEO Quiz, Connections, Memory Match, Multiplayer Arena Shooter, Sudoku, Times Tables, Typing Test, Word Scramble, Mental Math, Spelling Bee, Balance Beam Bash, Orbit Relay, Parcel Panic, Pattern Panic, Pocket Bumper, Signal Sprint, Word Relay Riot, Wordle) plus the remote-dependent originals (Slope, Hextris, Flappy Bird, Age of War, and their "Hacked" variants, among 40+ further removals) were removed from `Games/` and the catalog; their ids are not reused. No remote-dependent games remain in the catalog at the time of writing.

Full details, controls, and per-game notes: see [`docs/GAMES.md`](../GAMES.md).
