# Fleet follow-up: static entry descriptions

Authorization: `ticketpi-364975-1792044821714`, static metadata lane, 2026-10-15.
Starting source: `e787681d6fe573b393fc73445a031be8e9af5214`.

## Scope and result

125 registered titles; 124 nonprotected descriptions are now present in actual
HTML heads. Character AI is the one explicit read-only exception. Its tree stays
`b7b7e60e98c11b6ccdebbf8f480a072b8b6f2017`; it was not written or staged.
This lane owns 122 entries and changed 108: 103 insertions, 5 replacements,
14 meaningful existing descriptions retained. Wings and Jetpack Joyride Hacked
are separate workers' paths; their current worktree metadata is counted but not
attributed to this lane. No pending-owner exemptions were added to coverage tests.
OG coverage remains 5 titles / 3 descriptions, not complete social metadata.

Only each listed entry's description tag (plus insertion newline) changed.
No engine, style, body, script, attribution, charset, canonical, tracking, catalog,
portal bundle, non-entry game asset or security configuration changed here.
No games added, ingested, invented or registered. No runtime dependencies added.
All 108 corresponding inventory `document` manuals received only a metadata
receipt; their source-coverage limits, rights holds and gameplay defects remain.
Supporting files: `scripts/update_game_descriptions.py`,
`scripts/test_portal_seo.py`, `docs/maintenance/site/deployment-and-routing.md`,
and this report. The commit's explicit path list is the complete change manifest.

## Source and text review

Preflight compared all 122 owned entry blobs and directory trees to the current
inventory and HEAD before mutation. Relevant manuals' implementation maps,
source-coverage limits, audit findings and verification sections informed text
review; this is not an engine-source audit or a new gameplay acceptance pass.
Catalog descriptions supply the default text; a reviewed ID map narrows claims
contradicted or qualified by the manuals. Examples: no Pacman fruit, no Qix
territory/enemy implementation, no Tron AI, no Lunar Lander fuel, no kart
multiplayer claim, no guaranteed co-op connection, and no assumed invincibility.
DogeMiner, DuckHunt and Night Shift text preserves documented blockers rather
than advertising them as fixed. No redistribution permission is inferred.
The five replacements remove Chrome Dino's inadequate fragment and inherited
keyword/marketing text in Geometry Dash Lite, Cribbage, DuckHunt and Server Survival.
Other meaningful existing descriptions are retained, not newly certified claims.

The updater uses stdlib HTMLParser with raw-byte offsets, skips comments and
script/style raw text, requires one explicit head and at most one description,
and inserts before the parsed closing head. It does not reserialize HTML.
New descriptions use escaped ASCII with numeric entities for non-ASCII text;
existing BOM, encoding declarations, bytes and CRLF/LF remain unchanged.
Ambiguous heads or duplicate descriptions fail rather than guessing.
`--check` is nonmutating; `--apply` excludes all three protected/delegated trees.
Sparse-excluded source is read from HEAD; only changed individual entries are
materialized. No sparse-selection command, broad checkout or restore was used.

## Verification and limits

Actual static outputs:

```text
PASS: all 122 owned entries/trees match inventory and HEAD; no owned dirty source
Coverage: 124/124 nonprotected entries; Character AI read-only exception
Owned changes needed: 0; other-owner missing: 0
PASS metadata-only: 122 owned entries unchanged outside the approved description patch
PASS descriptions: 124/124 nonprotected entries; Character AI unchanged; byte-preserving parser fixtures
PASS static: 125 games, 126 sitemap URLs, metadata/manifest/3 icon sizes
Static game-page metadata (worktree where present, otherwise HEAD): {"description": 124, "og:title": 5, "og:description": 3}
PASS sitemap: 125 Git-backed game URLs + portal; base=https://lzeo2.github.io/TestRepoGame/
PASS: 108 entry byte-preservation checks; 108 manual receipt-only checks; 2 Python AST checks; no added runtime loads
PASS: owned git diff --check
```

Reproduce the static checks without materializing more entries:

```sh
python3 -B scripts/update_game_descriptions.py --check
python3 -B scripts/test_portal_seo.py --check --metadata-baseline e787681
python3 -B scripts/generate_sitemap.py --check
python3 -B scripts/check_maintenance_docs.py
```

The first three commands passed. The maintenance checker was run and failed:
`AssertionError: Commit inspected source changes before validating its inventory.`
Concurrent Games work was present before this lane's entry changes. Coordinator
owns the final inventory refresh after all source commits and the combined check;
this lane did not edit inventory or weaken the checker. After source commit
`f71f298c7b9e4e62e47e8e84e6285a6c04bf525d`, the worktree was clean and both metadata
checks passed again; the maintenance checker then failed with
`AssertionError: Inventory stale: inspect changes, then run --refresh.`
No current inventory PASS is claimed. The optional metadata baseline check deliberately detects any later
non-metadata change to an owned entry; omit that option for normal future coverage.

Parser fixtures cover UTF-8 BOM, legacy Windows-1252 bytes, CRLF, non-ASCII entity
escaping, quotation/ampersand/angle-bracket escaping, false head endings in comments
and scripts/styles, body-only descriptions, duplicate rejection, insertion,
replacement, preservation and idempotence. A real-entry comparison checks all
122 owned paths, and a separate precommit comparison checked each changed manual
against the starting source with only the exact receipt removed.

No browser, full-fleet loading, screenshots, crawler discovery, hosted HTTP,
mobile/native installation, rights or N100 hardware checks were run by this
static lane. The prior failed 122/125 full gate and all release holds remain;
static coverage is not game acceptance. No push or release authorization.

## Storage and coordinator restoration manifest

Preflight: 122 owned entries total 1,062,070 bytes; largest entry 117,507 bytes.
Initial free space 2,359,193,600 bytes. After entry/manual changes it was
2,337,497,088 bytes (shared-workspace decrease 21,696,512 bytes, not attributable
solely to this lane); after the source commit free space was 2,334,715,904 bytes
(total shared-workspace decrease 24,477,696 bytes). `df -h /` still reported 2.2G
free. Changed entry payloads
total 948,343 bytes, net tracked entry increase 13,176 bytes. There are **97 newly
materialized individual entry files**, not 97 complete games. Disk remains above
the 2 GB floor. No installs, downloads, build, history rewrite or garbage collection.

The table is exact: `new` means absent locally before this lane and materialized
by it; `present` means already present and must not be blindly removed during
coordinator restoration. All paths are tracked entry blobs, never asset trees.
Restore only after commit and coordinator review. Sparse selection was unchanged.
Each entry maps to its affected manual through inventory's `entry` / `document`.

```text
local-before | change | entry
new | insert | Games/SoccerRandom/index.html
new | insert | Games/BasketRandom/index.html
new | insert | Games/VolleyRandom/index.html
new | insert | Games/Ovo/1.4.5/index.html
new | insert | Games/Run3/tn6pS9dCf37xAhkJv/index.html
present | insert | Games/Snake/index.html
new | replace | Games/ChromeDino/dino.html
new | insert | Games/BreakoutClassic/index.html
new | insert | Games/Gladihoppers/index.html
new | insert | Games/BurritoBison/index.html
new | insert | Games/BitLife/index.html
new | insert | Games/SubwaySurfers/index.html
new | insert | Games/StrandedInIsekai/index.html
new | insert | Games/PapasPizzeria/index.html
new | insert | Games/RetroBowl/index.html
new | insert | Games/Superhot/index.html
new | insert | Games/TenMinutesTillDawn/index.html
new | insert | Games/FleeingTheComplex/index.html
new | insert | Games/InfiltratingTheAirship/index.html
new | insert | Games/BaldisBasics/index.html
new | insert | Games/TempleRun2/index.html
new | insert | Games/FancyPantsAdventure3/index.html
new | insert | Games/Vex7/index.html
new | replace | Games/GeometryDashLite/index.html
new | insert | Games/CookieClicker/index.html
new | insert | Games/BloonsTD/index.html
new | insert | Games/DriftBoss/index.html
new | insert | Games/DoodleJump/index.html
new | insert | Games/Chess/index.html
new | insert | Games/JetpackJoyride/index.html
new | insert | Games/DogeMiner/index.html
new | insert | Games/RetroBowlHacked/index.html
new | insert | Games/CookieClickerHacked/index.html
new | insert | Games/BreakoutHacked/index.html
new | insert | Games/SnakeHacked/index.html
new | insert | Games/SubwaySurfersHacked/index.html
new | insert | Games/DoodleJumpHacked/index.html
new | insert | Games/DrMario/index.html
new | insert | Games/StreetFighter2/index.html
new | insert | Games/AdvanceWars/index.html
new | insert | Games/MarioKartSuperCircuit/index.html
new | insert | Games/MetroidFusion/index.html
new | insert | Games/MegaManZero/index.html
new | insert | Games/KirbyAmazingMirror/index.html
new | insert | Games/SonicAdvance/index.html
new | insert | Games/CrushTheCastle/index.html
new | insert | Games/FireboyAndWatergirl/index.html
new | insert | Games/FireboyAndWatergirlCrystalTemple/index.html
new | insert | Games/FireboyAndWatergirlForestTemple/index.html
new | insert | Games/FireboyAndWatergirlHacked/index.html
new | insert | Games/FireboyAndWatergirlForestTempleHacked/index.html
new | insert | Games/FireboyAndWatergirlCrystalTempleHacked/index.html
new | insert | Games/MergeCatsDefender/index.html
new | insert | Games/MergeCatsDefenderHacked/index.html
new | insert | Games/Archery/index.html
new | insert | Games/FreeThrow/index.html
new | insert | Games/Backgammon/index.html
new | insert | Games/Pacman/index.html
new | insert | Games/Qix/index.html
new | insert | Games/Joust/index.html
new | insert | Games/TronLightCycles/index.html
new | insert | Games/Puzzle15/index.html
new | insert | Games/PegSolitaire/index.html
new | insert | Games/Checkers/index.html
new | insert | Games/Reversi/index.html
new | insert | Games/Mastermind/index.html
new | insert | Games/Nim/index.html
new | insert | Games/DotsAndBoxes/index.html
new | insert | Games/UltimateTicTacToe/index.html
new | insert | Games/KlondikeSolitaire/index.html
new | insert | Games/FreeCell/index.html
new | insert | Games/Blackjack/index.html
new | insert | Games/VideoPoker/index.html
new | insert | Games/Yahtzee/index.html
new | insert | Games/WordScramble/index.html
new | insert | Games/Darts501/index.html
new | insert | Games/MahjongLite/index.html
new | insert | Games/Nonogram/index.html
new | insert | Games/Battleship/index.html
new | insert | Games/Boggle/index.html
new | insert | Games/Dominoes/index.html
new | insert | Games/MiniGolf/index.html
new | insert | Games/Bowling/index.html
new | insert | Games/SpiderSolitaire/index.html
new | insert | Games/TowerDefense/index.html
new | insert | Games/JavaScriptRacer/index.html
new | insert | Games/Rhythm/index.html
new | insert | Games/BulletHell/index.html
new | replace | Games/CribbageClassic/index.html
new | insert | Games/Crossword/index.html
new | insert | Games/Gomoku/index.html
new | insert | Games/Mancala/index.html
new | insert | Games/Asteroids/index.html
new | insert | Games/Frogger/index.html
new | insert | Games/MissileCommand/index.html
new | insert | Games/LunarLander/index.html
new | insert | Games/SpaceInvaders/index.html
new | replace | Games/DuckHunt/index.html
present | insert | Games/Balatro/index.html
present | insert | Games/Circuit Ward/index.html
present | insert | Games/Tag Relay/index.html
present | insert | Games/Spline Ride/index.html
present | insert | Games/Slipstream Borough/index.html
present | insert | Games/Foldwild/index.html
present | insert | Games/Night Shift/index.html
present | insert | Games/Borough Run/index.html
present | replace | Games/ServerSurvival/index.html
present | insert | Games/Astray/index.html
```
