# Fireboy and Watergirl Hacked (Light Temple) maintenance manual

<!-- maintenance-game: Games/FireboyAndWatergirlHacked -->

Source baseline: `8c8a055`. Documentation-only static review, delegation 64.

## Identity and status

Registered ID **131**, category `puzzle`, not featured. Entry: `Games/FireboyAndWatergirlHacked/index.html` ([local entry](../../../Games/FireboyAndWatergirlHacked/index.html)). Tracked tree: **137 files, 10,345,832 bytes**; entry blob `4f2b3d3556adb6069984432e752ef7b6f91836d9`. Existing Light Temple HTML5 export, not a newly ingested port. This variant intentionally unlocks all 41 level records through `initial:true` and adds a noninteractive `.hacked-badge`; the engine blob is identical to its base sibling. It is not a security exploit. Local asset closure is partially inspected; offline play and restart are not currently certified.

## Implementation map

`index.html` preserves `window.require` as `requireNode`, clears it, loads local RequireJS, and creates `#root`, `#container`, `#hammer`, `#debug-fps`. `addScript` loads `version.js?v=Date.now()` and its callback requests `fireboy-and-watergirl-light-temple.min.js?v=version`. Version is `tc-238`. The bundled AMD `main` wires Phaser, `States/Boot`, `States/Load`, level states, TouchManager, storage and ad integrations. Boot loads `game.json` and PreloaderAssets, initializes storage, then enters load. Splash Play runs the existing load-state callback into menu/level menu; assets resolve under `assets/atlasses/`, `assets/tilemaps/tilesets/`, and `data/`.

**Source review coverage:** full entry, version/config/manifest, small CSS/stubs read; temple JSON parsed and selected records inspected; relevant bundle excerpts `main`, Boot, Load, keyboard binding, progress `fetch/getStored/save`, storage adapter and SDK injection read. RequireJS dependency exists and syntax was checked, but its complete vendor internals were not human-reviewed. Roughly 1.9 MB minified gameplay/Phaser/p2 bundle and image/audio assets were not fully reviewed. Light data includes dark and speed levels, a light tutorial and a forest tutorial. `assets/styles/main.css` supplies the effective overflow rule despite the body typo. `js/null.js` and three JSON files contain an origin-error HTML document.

## Gameplay and controls

Cooperative level selection and paired character controls are engine-owned. The inspected input branch maps `id==="wg"` to W jump, A left, D right, and the other branch to Up jump, Left/Right movement. This identifies Watergirl's binding opposite to the Forest catalog's current how-to claim; confirm actual character labels in native play before Main corrects copy. No Down/S action was established. Mobile branch creates engine buttons/state objects; exact multi-touch usability needs testing. Temple records contain `time`, `mobileTime`, level filenames and level-menu edge progression; bundle tracks stars/diamonds/best results. Failure and retry screens belong to compiled states, not wrapper DOM. Their exact interaction was not fully traced, so do not document R as a guaranteed restart key.

## State and persistence

Progress model fetches `data/light/temple.json`, merges stored records, derives unlocked/star states (`f.initial?1:0`), and saves JSON `progress` under namespace `fb-light`. Storage adapters append `:` to namespaces; local and iframe adapters exist. `setStorageAdapter` attempts a MessageChannel handshake with the embedding parent and falls back to force-promises local storage on rejection. Do not claim the portal implements that handshake without tracing its side. Language storage includes `i18nextLng`. Complete settings-key and timer cleanup review remains an engine follow-up. Unlock data is intentional, but it does not isolate stored progress from the base game.

## Dependencies and provenance

The engine embeds Phaser/p2, jQuery/underscore and PhaserSuperStorage/CacheBuster dependencies; RequireJS is local. `version.js` lists jsDelivr URLs, but inspected Boot passes `libs:[]` to SplashLoader, so that array alone is **not** proof of an active CDN load. `source.txt` records a GameDistribution mirror URL; it is a location, not redistribution permission or a source pin. No verified game/art redistribution license or upstream revision was established. Embedded dependency notices do not license the whole game. User-initiated walkthrough/affiliate links are distinct from runtime loads; preserved ad-disabled stubs must not be re-enabled.

## Audit findings

- **MEDIUM, zoom restriction:** `index.html` / `#viewport` sets `maximum-scale=1.0,user-scalable=no`. Players cannot reliably zoom instructions/menus. Minimal wrapper fix: restore browser zoom and test canvas sizing and touch behavior rather than disabling accessibility.
- **MEDIUM, missing bootstrap error state:** `index.html` / `addScript` handles only load success, and `require([...])` has no errback. Block `version.js` to reproduce a blank boot with no local explanation. Add one visible load/retry path at this wrapper boundary; do not replace the upstream menu.
- **MEDIUM, save-sharing risk:** bundle / `setNamespace("fb-"+gameConfig.id)` uses the same temple identity in both base and hacked copies. Progress and erase operations can cross variants on the same origin with the local adapter. Verify this before an approved isolated namespace/migration; do not erase user saves.
- **MEDIUM, invalid stub content:** `js/null.js` begins with HTML and fails JavaScript syntax; `json/config.json`, `json/null.json`, `json/ping.json` fail JSON parsing. Impact depends on constructed loader reachability, not their mere existence. Trace callers and replace only consumed stubs with typed local inert responses; do not delete evidence. Body `overlfow` is **LOW** because the linked stylesheet already hides overflow.
- **MEDIUM, manifest routing:** `manifest.json` / `start_url:"/index.html"` opens the portal root instead of this game when launched standalone. Root fix: use `./index.html`, preserving icons and testing install behavior.
- **HIGH, rights hold:** game tree lacks verified game/asset license evidence. Owner must resolve provenance before redistribution decisions. Prior audit verdicts are not grants.
- **Privacy triage:** bundle / embedded p2 author metadata contains inherited personal-contact text. Escalated without repeating the value; do not remove vendor attribution/notices casually.

Historical [batch 7](../../audit_batches/batch_7.md) config-404 claims partly predate the currently tracked empty-array JSON fixtures; they are not a new native failure. No XSS claim is made from vendor `eval`/HTML patterns alone.

## Safe iteration

Prefer wrapper viewport/error/manifest fixes after authorization. Maintain DOM hosts, RequireJS order, version variable and template data paths; do not rename the compiled module or patch it into a different game. Preserve intentional unlock behavior in hacked copies, base progression in normal copies, and all supplied art/notices. Any future save isolation needs old-slot backup and explicit migration, not deleting storage. Root-relative `/main.min.js` in light/forest engines needs serving-path review: a local sibling stub does not automatically satisfy a root request. No runtime changes were made here.

## Verification

**Actually run:** Git inventory, all assigned inline/external JavaScript stdin syntax checks and JSON parsing. This game has one JS and three JSON static failures listed above. Native checks/screenshots: **zero**. Historical [R9](../../audit_batches/playtest_r9.md) recorded input/render changes with varied restart certainty and config/branding failures; treat it as a past probe, not this run's gate.

Reproduce without materializing Games: `git show HEAD:Games/FireboyAndWatergirlHacked/version.js | node --check`; `git show HEAD:Games/FireboyAndWatergirlHacked/data/light/temple.json | python3 -m json.tool` (redirect output if unnecessary). Main's later isolated Git-backed server should block outbound traffic, inspect Play/menu, select tutorial and a later level, use both character key sets, complete/fail/retry, reload progress, deny storage and compare base/hacked slots. Check touch overlap, rotation, keyboard focus and zoom; distinguish SDK/branding requests from required level assets. Full smoke remains a separate Main gate.

## Future outlook

Week 1: rights and consumed-stub triage. Week 2: local boot feedback, zoom and standalone start URL. Week 3: native tutorial/later-level progression and safe base/hacked save isolation. Week 4: low-power rendering and two-finger touch QA. Defer engine upgrades, CDN restoration, cosmetic asset recoloring and new temple content until rights and functional evidence exist.
