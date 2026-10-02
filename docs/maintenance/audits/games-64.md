# Static game audit: delegation 64

Source baseline: `8c8a055813b35bbd5d8b632423328333b4252d43`.
Actual environment printed `PI_PROVIDER=openai-codex` and `PI_MODEL=gpt-6.1-sol`.
Scope: 15 existing registered games, documentation only. No source, catalog,
registration, license, sparse selection or runtime changes. No new game, push,
publication, browser server, dependency install or full-catalog smoke.

## Priority findings and holds

All current findings below are **static/source-backed**, with native repro proposed
rather than reported as run. Historical browser evidence is identified explicitly.
Matching anchors are used for huge minified files instead of misleading line numbers.

| Priority / severity | Source path and matching anchor | Impact / reproduction | Minimal root resolution / status |
| --- | --- | --- | --- |
| 1 / HIGH | `Games/MetroidFusion/index.html`, `Games/MegaManZero/index.html`, `Games/KirbyAmazingMirror/index.html`, `Games/SonicAdvance/index.html` / `EJS_gameUrl` | Bundled archives have no game-local license/source clearance. Wrapper/emulator permission does not grant ROM rights. | Owner rights decision with archive-specific evidence. Held; do not delete, relicense or replace. |
| 1 / HIGH | `Games/MergeCatsDefender/CREDITS.md`, `Games/MergeCatsDefenderHacked/CREDITS.md` / permission request pending | Attribution/noncommercial mirroring is not a verified permission grant. Art/audio rights and upstream revision unresolved. | Obtain written game and asset evidence, preserve notices. Held. |
| 1 / HIGH | Six `Games/FireboyAndWatergirl*/` trees / game config and mirror `source.txt` where present; `Games/CrushTheCastle/crush-the-castle-36145ed4.swf` | No verified game/asset redistribution license or pinned source dossier. Engine notices do not license whole games. | Owner provenance review; no runtime disposition authorized. |
| 2 / HIGH | `Games/FreeThrow/index.html` / `restartGame`, `animateShot` | Mid-flight R leaves old RAF active, `isAnimating` and charge/input flags unreset; new round can be mutated by old shot. | Track/cancel RAF and intervals, reset flags once at round lifecycle boundary. Native repro not run. |
| 2 / HIGH | `Games/MergeCatsDefender/src/Core/Save.js`, hacked equivalent / `load`, `k in this.data` | Valid JSON null/primitive bypasses parse catch and crashes merge; wrong-type arrays break callers. | Validate root, settings, arrays and numeric fields before merging defaults, preserve recoverable data. Static reproduction proposed; no mutation of saves performed. |
| 2 / HIGH historical | `Games/CrushTheCastle/ruffle.js` + SWF / AVM2 compatibility, nightly 2021-12-22 | Historical R8 could not reach gameplay after Run anyway; renderer and property errors. | Reproduce on current GPU/browser first, then assess verified licensed local runtime update. Historical, not a new native failure. |
| 3 / MEDIUM | `Games/FreeThrow/index.html` / score predicate in `animateShot` | No per-shot score latch; overlapping descending ball can count more than once. | One scoring flag/crossing predicate reset per shot; verify exactly two points. Static risk. |
| 3 / MEDIUM | `Games/Archery/index.html` / `resolveShot` delayed `advance`, `startRound` | Hit then immediate restart leaves previous 350ms callback changing target/lock/wind in fresh round. | Store/cancel pending timeout or round-token guard at reset. Static race. |
| 3 / MEDIUM | `Games/Archery/index.html` / keydown `setAim` | Aim changes mutate velocity during flight/locked phase, unlike guarded pointer input. | Shared rest/unlocked input gate; keep launch rules. Static defect. |
| 3 / MEDIUM | Both Merge Cats `src/Interface/Scenes/BattleScene.js` / `_togglePause`, `_guarded` | Escape under portrait guard can resume clock while update remains blocked. | Centralize pause/guard/settings decision. Proposed orientation plus Escape test. |
| 3 / MEDIUM | Six Fireboy entries / `addScript`, `require([...])`; shared `Games/_emulatorjs/data/loader.js` / `loadScript/loadStyle`; Crush entry / `player.load` | Missing load error handlers can leave blank boot or unhandled rejection when local asset fails. | One honest local retry/error path at corresponding shared/bootstrap boundary. No invented replacement menu. |
| 4 / MEDIUM | Six Fireboy bundles / `setNamespace("fb-"+gameConfig.id)` | Base/hacked temple progress namespace is shared, including erase operation; cheat data intentionally differs. | Confirm selected adapter/native cross-variant effect, then isolated namespaces with backup/migration if approved. |
| 4 / MEDIUM | `Games/MergeCatsDefenderHacked/index.html` / `_hd.coins`; `src/Data/Units.js` / migration comment | Old hacked save retains incomplete unlocks; initializer raises coins only. | Idempotent known-ID unlock union in hacked slot only. Do not change base key. |
| 4 / MEDIUM | Six Fireboy + both Merge Cats entries / viewport meta | `user-scalable=no` and maximum scale restriction impair zoom accessibility. | Permit browser zoom with native canvas/touch/layout checks. |
| 4 / MEDIUM | Merge Cats `src/Interface/UIKit.js` / pointer-only buttons; scene cards/placement | Escape exists, but menus and deploy flow have no keyboard selection/focus path. | Bounded shared UI and game-selection keyboard route, measured screen touch targets. |
| 4 / MEDIUM | Light/Crystal normal/hacked `manifest.json` / `start_url:"/index.html"` | Standalone launch routes to portal instead of game. | Relative `./index.html`; native installed-launch confirmation. Forest is already relative. |
| 4 / MEDIUM conditional | Light normal/hacked `js/null.js`; `json/config.json`, `null.json`, `ping.json` / HTML error body | JS/JSON parse fails; reachability must be established before claiming boot failure. | Trace constructed consumers and replace consumed stubs with typed inert local responses; no deletion. |
| 4 / MEDIUM | Shared readable `Games/_emulatorjs/data/emulator.js` / `saveSettings`; `storage.js` / open error in `put` | Unguarded storage writes and unresolved failure promises can impair persistence. Production minified equivalence not certified. | Shared-owner review and denied/quota-storage fallback; preserve settings and saves. |
| 5 / LOW | Forest catalog `howto` vs bundle / `"wg"===this.id` | Catalog assigns Fireboy WASD; inspected engine maps wg to W/A/D and other to arrows. | Main confirms native labels, corrects catalog copy; do not edit engine bindings. |
| 5 / LOW | Merge Cats catalog desc vs `BattleScene` placement/disposal | Merge/upgrade wording lacks implemented operation in reviewed BattleScene. | Main-owned factual copy correction after native confirmation; no speculative new system. |
| 5 / LOW | Both sports entries / RAF physics | Per-frame integration changes wall-clock flight with refresh rate. | Measure on real hardware before a fixed-step repair preserving physics. |
| Privacy triage | Six Fireboy bundles / inherited p2 package author metadata | Personal-contact metadata found; value omitted from docs/snippets. | Escalated to operator/Main through Hermes ticket `pi-1257948-1790907084956`; no notice removal authorized. |

## Coverage and dependency boundaries

- Read every assigned entry completely, including authored inline JS/CSS.
- Read all nonvendor Merge Cats JavaScript in the base tree and every changed
  hacked file. Git comparisons establish unchanged copies; changed files include
  Config, Units and Landing, plus entry/CREDITS. Read local provenance notices.
- Read Fireboy version/game/manifest/small styles/stubs; parse temple and asset
  JSON; inspect bounded engine excerpts for main, Boot, Load, keyboard input,
  storage adapters/progress, SDK path and unlock logic. Confirmed matching base
  and hacked engine blob identity. Roughly 1.9 MB per engine is **not** fully
  human-reviewed; level data was not exhaustively played or visually judged.
- Read EmulatorJS loader/storage/GameManager and selected readable emulator
  interfaces, not whole production minified emulator/decompressor/packed cores.
  ROM contents were not extracted or reverse-engineered.
- Inspect Ruffle's minified publicPath/WASM/load/diagnostic interfaces, not all
  internals, and inventory SWF/WASM without claiming binary gameplay review.
- Shipped GPL v3 Archery and MIT Free Throw notices and recorded source pins were
  read; no upstream/network re-verification was performed.
- CDN strings in Fireboy `version.js` are not an active-load verdict: inspected
  Boot passes `libs:[]`. Walkthrough/affiliate links are user initiated. Local
  root-relative `/main.min.js` in Light/Forest engines requires serving-path
  review; Crystal uses an empty script data URL. Disabled ads stay disabled.
- Readable EmulatorJS contains loopback/debug update checking; production
  minified equivalence must be reviewed before asserting active external loads.
  No networking features were enabled.

## Actually executed checks

Source accessed with `git ls-tree -rlz HEAD Games/<Folder>` and `git show`.
Small text was extracted outside the repository; no Games materialization or
sparse-selection change. Browser scripts were parsed via `node --check` stdin;
JSON was decoded with Python stdlib. Exact output:

```text
JS syntax PASS 91 FAIL 2
Games/FireboyAndWatergirl/js/null.js
Games/FireboyAndWatergirlHacked/js/null.js
JSON parse PASS 346 FAIL 6
Games/FireboyAndWatergirl/json/config.json
Games/FireboyAndWatergirl/json/null.json
Games/FireboyAndWatergirl/json/ping.json
Games/FireboyAndWatergirlHacked/json/config.json
Games/FireboyAndWatergirlHacked/json/null.json
Games/FireboyAndWatergirlHacked/json/ping.json
```

These are parse units (inline blocks plus external files), not 91 successfully
played games. Syntax does not establish remote closure, save reliability, controls,
rights or full gameplay. JS dependencies outside assigned game trees were reviewed
as stated above, not included in that 91 count. Owned-path Python assertions and `git diff --check` were also executed:

```text
PASS 15 owned identities, nine headings, baseline entry blobs, relative links, privacy/copy checks
owned documentation bytes 127581
```

`git diff --check` exited 0 with no output. The byte count is the measured
pre-final-evidence documentation snapshot, not shared filesystem growth. The
following small check can be rerun from the repository root without Games checkout:

```python
import json, pathlib, re
ids = {118,119,120,121,123,127,128,129,131,132,133,136,137,149,152}
headings = ['Identity and status', 'Implementation map', 'Gameplay and controls',
            'State and persistence', 'Dependencies and provenance', 'Audit findings',
            'Safe iteration', 'Verification', 'Future outlook']
rows = [g for g in json.load(open('docs/maintenance/inventory.json'))['games']
        if g['id'] in ids]
assert len(rows) == 15
for g in rows:
    text = pathlib.Path(g['document']).read_text()
    assert '<!-- maintenance-game: ' + g['directory'] + ' -->' in text
    assert re.findall(r'^## (.+)$', text, re.M) == headings
print('PASS 15 owned identities and nine headings')
```

**Native/browser checks: 0. New screenshots: 0. Full catalog gate: not run by this
worker.** Main owns the serial unfiltered gate and real desktop/mobile/theme review.
Historical R8/R9/R10 and batch-7 evidence is retained and labeled, not rewritten
into current results. `docs/GAMES.md` and wiki 120-count claims are stale historical
context; kickoff catalog currently has 115 entries. No historical pages changed.

## Manuals delivered

- [118 Metroid Fusion](../games/118-metroidfusion.md)
- [119 Mega Man Zero](../games/119-megamanzero.md)
- [120 Kirby Amazing Mirror](../games/120-kirbyamazingmirror.md)
- [121 Sonic Advance](../games/121-sonicadvance.md)
- [123 Crush the Castle](../games/123-crushthecastle.md)
- [127 Light Temple](../games/127-fireboyandwatergirl.md)
- [128 Crystal Temple](../games/128-fireboyandwatergirlcrystaltemple.md)
- [129 Forest Temple](../games/129-fireboyandwatergirlforesttemple.md)
- [131 Light Temple Hacked](../games/131-fireboyandwatergirlhacked.md)
- [132 Forest Temple Hacked](../games/132-fireboyandwatergirlforesttemplehacked.md)
- [133 Crystal Temple Hacked](../games/133-fireboyandwatergirlcrystaltemplehacked.md)
- [136 Merge Cats Defender](../games/136-mergecatsdefender.md)
- [137 Merge Cats Defender Hacked](../games/137-mergecatsdefenderhacked.md)
- [149 Archery](../games/149-archery.md)
- [152 Free Throw](../games/152-freethrow.md)

## Largest tracked files

Git logical sizes, not workspace materialization. Paths below are relative to each
named game directory. Two-file games have no third file. Binary/audio sizes are
inventory evidence, not human-review or deletion evidence; Merge Cats music files
are real consumers of `PD.MUSIC.files` through `PD.Assets.queueAll`.

| Game directory | Up to three largest files |
| --- | --- |
| MetroidFusion | `Metroid Fusion (Europe) (En,Fr,De,Es,It).zip`: 4685121 bytes; `index.html`: 701 bytes |
| MegaManZero | `megamanzero.zip`: 3674897 bytes; `index.html`: 671 bytes |
| KirbyAmazingMirror | `Kirby & the Amazing Mirror (Europe) (En,Fr,De,Es,It).zip`: 7090244 bytes; `index.html`: 719 bytes |
| SonicAdvance | `sonic-advance.zip`: 2607489 bytes; `index.html`: 673 bytes |
| CrushTheCastle | `c5c02c4e65c1c4423a97.wasm`: 6593880 bytes; `crush-the-castle-36145ed4.swf`: 2351537 bytes; `ruffle.js`: 83706 bytes |
| FireboyAndWatergirl | `fireboy-and-watergirl-light-temple.min.js`: 1936412 bytes; `assets/audio/LevelMusic.mp3`: 1315960 bytes; `assets/atlasses/CharAssets.png`: 732103 bytes |
| FireboyAndWatergirlCrystalTemple | `fireboy-and-watergirl-crystal-temple.min.js`: 1935375 bytes; `assets/audio/LevelMusic.mp3`: 1315960 bytes; `assets/atlasses/CharAssets.png`: 732103 bytes |
| FireboyAndWatergirlForestTemple | `fireboy-and-watergirl-forest-temple.min.js`: 1914952 bytes; `assets/audio/LevelMusic.mp3`: 1315960 bytes; `assets/fonts/font_ja.png`: 1118778 bytes |
| FireboyAndWatergirlHacked | `fireboy-and-watergirl-light-temple.min.js`: 1936412 bytes; `assets/audio/LevelMusic.mp3`: 1315960 bytes; `assets/atlasses/CharAssets.png`: 732103 bytes |
| FireboyAndWatergirlForestTempleHacked | `fireboy-and-watergirl-forest-temple.min.js`: 1914952 bytes; `assets/audio/LevelMusic.mp3`: 1315960 bytes; `assets/fonts/font_ja.png`: 1118778 bytes |
| FireboyAndWatergirlCrystalTempleHacked | `fireboy-and-watergirl-crystal-temple.min.js`: 1935375 bytes; `assets/audio/LevelMusic.mp3`: 1315960 bytes; `assets/atlasses/CharAssets.png`: 732103 bytes |
| MergeCatsDefender | `src/ASSETS/music/level.mp3`: 13100512 bytes; `src/ASSETS/music/boss.mp3`: 10242507 bytes; `src/ASSETS/music/menu.mp3`: 4226304 bytes |
| MergeCatsDefenderHacked | `src/ASSETS/music/level.mp3`: 13100512 bytes; `src/ASSETS/music/boss.mp3`: 10242507 bytes; `src/ASSETS/music/menu.mp3`: 4226304 bytes |
| Archery | `LICENSE`: 35141 bytes; `index.html`: 20580 bytes |
| FreeThrow | `index.html`: 16590 bytes; `LICENSE`: 1072 bytes |

## Refurbishment order

Week 1 resolves rights and reproduces existing failure accounting, save shape,
boot failures and the historical Flash hold. Week 2 authorizes bounded wrapper
and lifecycle fixes with one regression each; no vendor-bundle hand editing.
Week 3 checks save/variant migrations, focus/keyboard/touch and installed launch
behavior. Week 4 measures real low-power hardware, high-refresh physics, textures,
rotation and audio lifecycle. This is a plan, not background work or new-game
permission. New 3D work and registration are outside this delegation.
