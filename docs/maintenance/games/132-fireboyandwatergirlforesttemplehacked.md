# Fireboy and Watergirl Forest Temple Hacked maintenance manual

<!-- maintenance-game: Games/FireboyAndWatergirlForestTempleHacked -->

Source baseline: `8c8a055`. Documentation-only static review, delegation 64.

## Identity and status

Registered ID **132**, category `puzzle`, not featured. Entry: `Games/FireboyAndWatergirlForestTempleHacked/index.html` ([local entry](../../../Games/FireboyAndWatergirlForestTempleHacked/index.html)). Tracked tree: **124 files, 11,675,618 bytes**; entry blob `fcfbca54b6078721a2d8e41b20884dfc341e2b9b`. Existing Forest Temple HTML5 export, not a newly ingested port. This variant intentionally unlocks all 32 level records through `initial:true` and adds a noninteractive `.hacked-badge`; the engine blob is identical to its base sibling. It is not a security exploit. Local asset closure is partially inspected; offline play and restart are not currently certified.

## Implementation map

`index.html` preserves `window.require` as `requireNode`, clears it, loads local RequireJS, and creates `#root`, `#container`, `#hammer`, `#debug-fps`. `addScript` loads `version.js?v=Date.now()` and its callback requests `fireboy-and-watergirl-forest-temple.min.js?v=version`. Version is `tc-285`. The bundled AMD `main` wires Phaser, `States/Boot`, `States/Load`, level states, TouchManager, storage and ad integrations. Boot loads `game.json` and PreloaderAssets, initializes storage, then enters load. Splash Play runs the existing load-state callback into menu/level menu; assets resolve under `assets/atlasses/`, `assets/tilemaps/tilesets/`, and `data/`.

**Source review coverage:** full entry, version/config/manifest, small CSS/stubs read; temple JSON parsed and selected records inspected; relevant bundle excerpts `main`, Boot, Load, keyboard binding, progress `fetch/getStored/save`, storage adapter and SDK injection read. RequireJS dependency exists and syntax was checked, but its complete vendor internals were not human-reviewed. Roughly 1.9 MB minified gameplay/Phaser/p2 bundle and image/audio assets were not fully reviewed. Forest data includes speed/puzzle variants and the forest tutorial. The wrapper supplies `_azerionIntegration` with ad flags false and `playBtn:true`; `assets/css/app.css` targets legacy RTB placements. The manifest already uses `./index.html`.

## Gameplay and controls

Cooperative level selection and paired character controls are engine-owned. The inspected input branch maps `id==="wg"` to W jump, A left, D right, and the other branch to Up jump, Left/Right movement. This identifies Watergirl's binding opposite to the Forest catalog's current how-to claim; confirm actual character labels in native play before Main corrects copy. No Down/S action was established. Mobile branch creates engine buttons/state objects; exact multi-touch usability needs testing. Temple records contain `time`, `mobileTime`, level filenames and level-menu edge progression; bundle tracks stars/diamonds/best results. Failure and retry screens belong to compiled states, not wrapper DOM. Their exact interaction was not fully traced, so do not document R as a guaranteed restart key.

## State and persistence

Progress model fetches `data/forest/temple.json`, merges stored records, derives unlocked/star states (`f.initial?1:0`), and saves JSON `progress` under namespace `fb-forest`. Storage adapters append `:` to namespaces; local and iframe adapters exist. `setStorageAdapter` attempts a MessageChannel handshake with the embedding parent and falls back to force-promises local storage on rejection. Do not claim the portal implements that handshake without tracing its side. Language storage includes `i18nextLng`. Forest additionally writes diamond progress to `fb-forest-dprog`; preserve its `cdm` and `dArr` fields. Unlock data is intentional, but it does not isolate stored progress from the base game.

## Dependencies and provenance

The engine embeds Phaser/p2, jQuery/underscore and PhaserSuperStorage/CacheBuster dependencies; RequireJS is local. `version.js` lists jsDelivr URLs, but inspected Boot passes `libs:[]` to SplashLoader, so that array alone is **not** proof of an active CDN load. No game-local source.txt, LICENSE or CREDITS was found in the tracked forest tree. No verified game/art redistribution license or upstream revision was established. Embedded dependency notices do not license the whole game. User-initiated walkthrough/affiliate links are distinct from runtime loads; preserved ad-disabled stubs must not be re-enabled.

## Audit findings

- **MEDIUM, zoom restriction:** `index.html` / `#viewport` sets `maximum-scale=1.0,user-scalable=no`. Players cannot reliably zoom instructions/menus. Minimal wrapper fix: restore browser zoom and test canvas sizing and touch behavior rather than disabling accessibility.
- **MEDIUM, missing bootstrap error state:** `index.html` / `addScript` handles only load success, and `require([...])` has no errback. Block `version.js` to reproduce a blank boot with no local explanation. Add one visible load/retry path at this wrapper boundary; do not replace the upstream menu.
- **MEDIUM, save-sharing risk:** bundle / `setNamespace("fb-"+gameConfig.id)` uses the same temple identity in both base and hacked copies. Progress and erase operations can cross variants on the same origin with the local adapter. Verify this before an approved isolated namespace/migration; do not erase user saves.
- **LOW, CSS parse error:** `assets/css/app.css` / `display:none; !important;` does not apply importance. The declaration still hides the matched legacy ad container. Correct syntax only if the selector remains a real consumer.
- **HIGH, rights hold:** game tree lacks verified game/asset license evidence. Owner must resolve provenance before redistribution decisions. Prior audit verdicts are not grants.
- **Privacy triage:** bundle / embedded p2 author metadata contains inherited personal-contact text. Escalated without repeating the value; do not remove vendor attribution/notices casually.

Historical [batch 7](../../audit_batches/batch_7.md) config-404 claims partly predate the currently tracked empty-array JSON fixtures; they are not a new native failure. No XSS claim is made from vendor `eval`/HTML patterns alone.

## Safe iteration

Prefer wrapper viewport/error/manifest fixes after authorization. Maintain DOM hosts, RequireJS order, version variable and template data paths; do not rename the compiled module or patch it into a different game. Preserve intentional unlock behavior in hacked copies, base progression in normal copies, and all supplied art/notices. Any future save isolation needs old-slot backup and explicit migration, not deleting storage. Root-relative `/main.min.js` in light/forest engines needs serving-path review: a local sibling stub does not automatically satisfy a root request. No runtime changes were made here.

## Verification

**Actually run:** Git inventory, all assigned inline/external JavaScript stdin syntax checks and JSON parsing. This game’s checked JS/JSON parsed; parsing is not gameplay proof. Native checks/screenshots: **zero**. Historical [R9](../../audit_batches/playtest_r9.md) recorded input/render changes with varied restart certainty and config/branding failures; treat it as a past probe, not this run's gate.

Reproduce without materializing Games: `git show HEAD:Games/FireboyAndWatergirlForestTempleHacked/version.js | node --check`; `git show HEAD:Games/FireboyAndWatergirlForestTempleHacked/data/forest/temple.json | python3 -m json.tool` (redirect output if unnecessary). Main's later isolated Git-backed server should block outbound traffic, inspect Play/menu, select tutorial and a later level, use both character key sets, complete/fail/retry, reload progress, deny storage and compare base/hacked slots. Check touch overlap, rotation, keyboard focus and zoom; distinguish SDK/branding requests from required level assets. Full smoke remains a separate Main gate.

## Future outlook

Week 1: rights and consumed-stub triage. Week 2: local boot feedback, zoom and catalog controls correction after native confirmation. Week 3: native tutorial/later-level progression and safe base/hacked save isolation. Week 4: low-power rendering and two-finger touch QA. Defer engine upgrades, CDN restoration, cosmetic asset recoloring and new temple content until rights and functional evidence exist.
