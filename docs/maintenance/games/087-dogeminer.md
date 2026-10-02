<!-- maintenance-game: Games/DogeMiner -->
# Doge Miner maintenance

## Identity and status

Registered id **87**, category `idle`, entry [index.html](../../../Games/DogeMiner/index.html). Baseline `8c8a055`: 14 files, 4,297,578 bytes; entry blob `d1fbbc02b3b33c8bb9443c839280f05042fd8ad4`. **Known parse blocker remains at baseline.** Do not equate rendered intro HTML with a running game.

## Implementation map

Entry loads main CSS, jQuery UI CSS, inherited cloak reference, `js/main.js` in head and `js/plugins.js` at body end. Main is a 631,006-byte bundled script containing gameplay plus React/vendor code; plugins is 399,804 bytes. UI anchors include `#introscreen`, `#start-playing`, tutorial second/third/last buttons, `#miner`, `#mined`, `#persec`, `#progressBar`, `#launchbutton`, `#tabs`, `#upgradewrapper`, `#achiwrapper`, `#restartbutton`, `#exportsave`, `#importsave` and `#savemodal`.

Source review coverage: full 888-line entry, selected CSS sprite/layout rules and bundled gameplay/save/reset/timer anchors read. Bundled React, Moment, plugin internals and full CSS animation/sprite catalog were not fully human-reviewed. Gameplay functions are minified; reliable anchors are selector strings, `tt.currentlevel`, `re()` JSON serialization, `ae()` load/migration and `oe()` reset removal, not invented descriptive function names.

## Gameplay and controls

Intended flow shows a tutorial to click Doge, hire helpers, buy upgrades and launch toward new locations. `#miner` is a clickable div, not a keyboard button. Shop buttons include buyshibe/buykennel/buykitten/buyrocket/buybase/buyrig. UI displays mined coins, per-second production, location and launch progress. Settings contain sound/music/animation toggles, export/import, location switching and Reset game. No keyboard mining binding was established. Actual handlers cannot run while main.js fails parsing; the loader's delayed override merely reveals Start, not repairs engine initialization.

## State and persistence

`tt` holds level/maxlevel, per-level currency/helpers/upgrades, clicks/time and preferences; `nt` holds transient runtime state. Save keys include `dogeminer2015`, `achis`, `dogeminer-tutorial`, legacy `dogeminer` and `dogeminer-level1/2/3`. `re()` serializes tt; `ae()` imports/migrates earlier data; `oe()` removes named cookies/storage values. Reset confirmation sets `nt.dontsave`, removes data and optionally reloads. Main schedules 25 ms updates, one-second counters/title updates and longer news/background tasks. Entry separately forces a load event after ten seconds and runs theatrical loader-message timeouts. Unguarded JSON/storage reads warrant recovery testing after boot is restored.

## Dependencies and provenance

CSS references local image sprites/backgrounds, but exact resource closure was not exhaustively traced through dynamic strings. No LICENSE/README/source pin is tracked in this directory. HTML metadata names 3kh0 as creator and rkn as seller; this is inherited metadata, not independently verified authorship or redistribution permission. Its cookie/analytics claims and aggregate rating are also not verified current runtime facts. Vendor documentation URLs in bundled strings are not evidence of automatic requests. Root cloak/favicon paths are inherited references, historically 404.

## Audit findings

- **HIGH**, `js/main.js`, React diagnostic string containing `(eg <html>, <head>`: a raw LF follows `<head>` inside a double-quoted string at byte offset about 267841 (ASCII context; character index 267835 at `<head>`). `node --check` fails. Impact: no main gameplay handlers or tick execute. Minimal root fix requires verified original source/blob and restoration of the damaged literal, not a game rewrite or fake Start screen. [Playtest r5](../../audit_batches/playtest_r5.md) independently documented the same parse corruption.
- **MEDIUM**, `index.html`, `loadtimer`/`nextLoaderText`: synthetic load and a timeout-revealed Start button can present an unusable start path. Surface actual script-load/initialization failure and remove duplicate initialization risk only after tracing ready handlers.
- **MEDIUM**, main `ae` and `achis` parse anchors: malformed save JSON lacks reviewed recovery. Validate before mutation, retain exportable bad data and catch denied storage.
- **MEDIUM**, `css/main-v1-0-2-bs.css`, `#superwrapper/#wrapper/#tabs`: fixed large layout scaled down rather than reflowed risks mobile overflow/tiny targets. Main must review real screenshots after boot repair.

## Safe iteration

First restore the exact source corruption under separate authorization, keeping bundled vendor notices and save migration. Do not rewrite the bundle to a placeholder miner. Preserve export before reset; never call origin-wide clear. Refurbish authored intro/error/help and then layout, without claiming stale metadata is provenance.

## Verification

Actually run: main.js Git blob `node --check` **FAIL** (`[stdin]:1`); plugins.js **PASS**. Native **0**, screenshots **0**. Recommended after authorized repair: tutorial completion, mine five times, buy a helper, observe passive income, export/reload/import, cancel/confirm reset and corrupt/denied storage. Inspect duplicate load initialization and request closure. Main owns full gate; historical batch-4 working summary is superseded by deterministic baseline parse evidence.

## Future outlook

Priority one is source recovery/rights plus an exact parser regression. Priority two is genuine load/error feedback and safe save recovery. Then keyboard mining, readable mobile reflow and reduced animation. Defer extra locations/features until basic gameplay works and provenance is verified.
