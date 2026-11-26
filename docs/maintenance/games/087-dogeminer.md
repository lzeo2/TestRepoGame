<!-- maintenance-game: Games/DogeMiner -->
# Doge Miner maintenance

## Identity and status

Registered id **87**, category `idle`, entry [index.html](../../../Games/DogeMiner/index.html). Baseline `8c8a055`: 14 files, 4,297,578 bytes; entry blob `d1fbbc02b3b33c8bb9443c839280f05042fd8ad4`. The November 2026 browser check completed the tutorial and mined currency.

## Implementation map

Entry loads main CSS and jQuery UI CSS. At the end of the body, `js/plugins.js` provides jQuery, `js/offline-audio.js` selects the bundled no-audio path, and `js/main.js` starts the game. At the original baseline, main was a 631,006-byte bundled script containing gameplay plus React/vendor code; plugins is 399,804 bytes. UI anchors include `#introscreen`, `#start-playing`, tutorial second/third/last buttons, `#miner`, `#mined`, `#persec`, `#progressBar`, `#launchbutton`, `#tabs`, `#upgradewrapper`, `#achiwrapper`, `#restartbutton`, `#exportsave`, `#importsave` and `#savemodal`.

Source review coverage: full 888-line entry, selected CSS sprite/layout rules and bundled gameplay/save/reset/timer anchors read. Bundled React, Moment, plugin internals and full CSS animation/sprite catalog were not fully human-reviewed. Gameplay functions are minified; reliable anchors are selector strings, `tt.currentlevel`, `re()` JSON serialization, `ae()` load/migration and `oe()` reset removal, not invented descriptive function names.

## Gameplay and controls

Intended flow shows a tutorial to click Doge, hire helpers, buy upgrades and launch toward new locations. `#miner` is a clickable div, not a keyboard button. Shop buttons include buyshibe/buykennel/buykitten/buyrocket/buybase/buyrig. UI displays mined coins, per-second production, location and launch progress. Settings contain animation controls, export/import, location switching and Reset game. The audio notice explains that this edition has no bundled soundtrack or effects. No keyboard mining binding was established. The browser check exercises the real mining handler after the tutorial.

## State and persistence

`tt` holds level/maxlevel, per-level currency/helpers/upgrades, clicks/time and preferences; `nt` holds transient runtime state. Save keys include `dogeminer2015`, `achis`, `dogeminer-tutorial`, legacy `dogeminer` and `dogeminer-level1/2/3`. `re()` serializes tt; `ae()` imports/migrates earlier data; `oe()` removes named cookies/storage values. Reset confirmation sets `nt.dontsave`, removes data and optionally reloads. Main schedules 25 ms updates, one-second counters/title updates and longer news/background tasks. Entry separately forces a load event after ten seconds and runs theatrical loader-message timeouts. Unguarded JSON/storage reads warrant recovery testing in fresh and returning profiles.

## Dependencies and provenance

CSS references local image sprites/backgrounds, but exact resource closure was not exhaustively traced through dynamic strings. Fourteen missing Sunny theme PNGs were restored from jQuery UI 1.10.4. The upstream MIT licence and per-file SHA-256 values are recorded in the [Sunny source receipt](../../../Games/DogeMiner/css/sunny/SOURCES.md). The game’s own artwork and bundle have separate provenance. HTML metadata names 3kh0 as creator and rkn as seller; this is inherited metadata, not independently verified authorship or redistribution permission. Its cookie/analytics claims and aggregate rating are also not verified current runtime facts. Vendor documentation URLs in bundled strings are not evidence of automatic requests. Root cloak/favicon paths are inherited references, historically 404.

## Audit findings

- Resolved the malformed React diagnostic by removing a raw line feed from the string in `js/main.js`. Loading the existing jQuery plugin bundle first also restores selection handlers. The unnecessary deferred ad push was removed. [Historical failure](../../audit_batches/playtest_r5.md).
- **MEDIUM**, `index.html`, `loadtimer`/`nextLoaderText`: synthetic load and a timeout-revealed Start button can present an unusable start path. Surface actual script-load/initialization failure and remove duplicate initialization risk only after tracing ready handlers.
- **MEDIUM**, main `ae` and `achis` parse anchors: malformed save JSON lacks reviewed recovery. Validate before mutation, retain exportable bad data and catch denied storage.
- **MEDIUM**, `css/main-v1-0-2-bs.css`, `#superwrapper/#wrapper/#tabs`: fixed large layout scaled down rather than reflowed risks mobile overflow/tiny targets. Main must review real screenshots after boot repair.

## Safe iteration

Keep bundled vendor notices and save migration intact when editing the miner. Preserve export before reset; never call origin-wide clear. Refurbish authored intro/error/help and then layout, without claiming stale metadata is provenance.

## Verification

On 26 November 2026, a clean Chromium session completed all four tutorial panels and observed Dogecoins change from 0 to 1 on a miner click. The local run recorded zero uncaught JavaScript errors, external requests or HTTP errors, including the delayed tutorial callbacks. Run `python3 scripts/test_arcade_legacy_startup.py --game DogeMiner` and `node --check Games/DogeMiner/js/main.js`. Backgrounds and icons newly restored from jQuery UI 1.10.4 also matched their release SHA-256 values byte for byte. [Local browser regression](../../../scripts/test_arcade_legacy_startup.py) · [Theme checksums and licence](../../../Games/DogeMiner/css/sunny/SOURCES.md)

Historical baseline receipt: main.js Git blob `node --check` **FAIL** (`[stdin]:1`); plugins.js **PASS**. Native **0**, screenshots **0**. Recommended after authorized repair: tutorial completion, mine five times, buy a helper, observe passive income, export/reload/import, cancel/confirm reset and corrupt/denied storage. Inspect duplicate load initialization and request closure. Main owns full gate; historical batch-4 working summary is superseded by deterministic baseline parse evidence.

### Static metadata receipt (2026-10-15)

Only the entry head description changed. Entry/tree matched inventory at `e787681`.
[Metadata checks and exact paths](../audits/fleet-followup-descriptions.md).
No engine audit or gameplay acceptance; source-coverage limits and known holds remain.

## Future outlook

Document game source and rights, improve actual load/error feedback and test save recovery. Then keyboard mining, readable mobile reflow and reduced animation. Defer extra locations/features until basic gameplay works and provenance is verified.
