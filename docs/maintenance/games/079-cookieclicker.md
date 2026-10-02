<!-- maintenance-game: Games/CookieClicker -->
# Cookie Clicker maintenance

## Identity and status

Registered id **79**, category `idle`, entry `Games/CookieClicker/index.html`. Baseline `8c8a055`: entry `d5c3dfdf20b7be1d2f9584111c95b825aa54dc7d`, tree `3d2feade71e759e654d0d2dd67649de63a9f4a39`. The 336 files total 5,801,012 bytes. Version constant in `main.js` is **2.031**, `BETA=0`. Ordinary build, not hacked sibling. Explicit no-rehosting notice is an owner/legal hold, not authorization to delete.

## Implementation map

Entry loads `base64.js`, `main.js`, `style.css`. `Game.Launch()` executes at script end; window load calls `Game.Load()` if not ready. `Game.Init` initializes state/UI, then `Game.Loop`/`Game.Draw`. DOM anchors include `#bigCookie`, `#cookies`, `#products`, `#upgrades`, `#prefsButton`, `#legacyButton`, `#menu`, `#promptAnchor`, `#promptContent` and mobile `#focusLeft/Middle/Right/Menu`.

`Game.LoadMinigames` inserts local scripts only for eligible leveled buildings, records `scriptBindings` and calls `Game.scriptLoaded` to launch/restore. Garden belongs to Farm, Market to Bank, Pantheon to Temple, Grimoire to Wizard tower. Each stores data via parent minigame serialization, not an independent browser key. Selected `M.save`/`M.load` APIs encode plot/seeds, goods/stocks, god slots/swaps, or magic/cast counts.

Source review coverage: complete entry, base64 helper, README and 60,166-byte CSS; selected main launch/init, click/input, save/load/reset, mod-loading, minigame lifecycle and loop functions. Main is 801,859 bytes; full balancing/content, all 14,000+ lines, full four minigames and every image/audio were not human-reviewed. Save/load excerpts and minigame interfaces are sampled, not exhaustive certification.

## Gameplay and controls

`Game.ClickCookie` guards ascension/initial frames/rate, earns `computedMouseCps`, updates handmade cookies/clicks and triggers effects. Mouse click or touchend on `#bigCookie` is source-bound. Buildings/upgrades provide passive progression; this is open-ended idle gameplay, not a fabricated win/lose round.

Ctrl+S requests save, Ctrl+O opens import, Esc closes prompts and Enter confirms them. `Game.HardReset` has two confirmation stages before wiping; ascension/reincarnation is a different reset path. Preserve those distinctions. `Game.bakeryNameSet` sanitizes/clamps names and uses textContent; this is not a demonstrated user-name HTML injection. Menu divs/cookie are not native keyboard controls despite shortcut support.

## State and persistence

Primary key **`CookieClickerGame`**, beta **`CookieClickerGameBeta`**. `Game.WriteSave` serializes versioned pipe/semicolon sections, preferences, buildings/upgrades/achievements, minigames and mods; base64/`!END!` framing protects transport, not security. `Game.LoadSave` can migrate a cookie save, rejects bad version/shape and future versions, then restores state. Preserve format/order and export before any update.

Storage helper catches reads/writes but returns a non-success-specific value. WriteSave decides success by whether *any* saved value remains, allowing stale prior data to look successful after a denied write. `Game.Loop` runs logic, caps catch-up to five seconds, schedules drawing with requestAnimationFrame and repeats via setTimeout; `Game.Timeout`/`Resume` save/reload around inactivity. Do not start a second loop when refurbishing menus.

## Dependencies and provenance

Entry copyright credits Orteil, 2013-2020, and expressly asks not to re-host, profit from or claim the code. README links `http://orteil.dashnet.org/cookieclicker/` but claims this version can be used anywhere; it is not stronger permission evidence. No verified exception or pinned upstream revision exists here. Keep notices intact and escalate rights review.

Current `ajax` is a no-op returning false, so `Game.GrabData('/patreon/grab.php')` is inert; commented PayPal markup is not an active load. `Game.LoadMod` blocks several external URL forms but still accepts arbitrary local/script URLs. Its scheme denylist is not a complete URL-origin policy. No new dependency or mod service is authorized.

## Audit findings

- **HIGH, explicit rights conflict:** `index.html` copyright/no-rehosting comment versus `readme.md` “used anywhere”. Obtain authoritative permission; do not call this MIT or alter the notice.
- **HIGH, silent save loss:** `main.js`, `Game.localStorageSet` around 1952 and `Game.WriteSave` around 2184. Failed writes can show “Game saved” when an old value exists. Minimal root fix: helper returns success/error and WriteSave tests the current write, preserving export/backup.
- **MEDIUM, malformed import risk:** `Game.LoadSave` base64 decoding precedes comprehensive validation; minigame Market/Pantheon loads dereference split fields/god IDs. Validate format/numeric indices before mutating live state and surface recoverable errors. Static risk, no payload executed.
- **MEDIUM, keyboard access:** `#bigCookie` div and generated option links/divs lack consistent semantic button/focus behavior; CSS hides range focus outlines. Fix existing controls and visible focus without redesigning upstream art.
- **MEDIUM, conditional mod policy:** `Game.LoadMod` only rejects named prefixes, not every cross-origin/scheme form. Use URL resolution and same-origin/path validation at this boundary; no evidence that normal gameplay loads an external mod.

## Safe iteration

Rights first. Later patches should target shared save/import helpers and existing input/menu semantics. Keep ascension and wipe separate, preserve user exports and schemas. No compiled gameplay rewrite, new mod endpoint, original-art recoloring or hacked cookie top-up.

## Verification

Actually run: Git inventory, stdin parser checks for main, base64 and all four minigames, passed. Native runs **0**, screenshots **0**. Reproduce: `git show HEAD:Games/CookieClicker/main.js | node --check`. Historical `playtest_r4.md` observed cookie increments/options but not completed wipe; not a current pass.

Recommended Main-approved HTTP lease: click/buy/CpS, export-import round trip, stale-save plus denied write, malformed import recovery, reload, both wipe confirmations and minigame restore; keyboard/mobile menus/audio and blocked remote requests separately. Main's full gate remains required.

## Future outlook

Rights and honest save feedback first; import validation and accessible controls next. Month work should regression-test versioned saves, minigame lifecycle and background timing before performance changes. New upgrades/content/mod hosting are deferred.
