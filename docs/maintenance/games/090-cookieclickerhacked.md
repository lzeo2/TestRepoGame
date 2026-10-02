<!-- maintenance-game: Games/CookieClickerHacked -->
# Cookie Clicker Hacked maintenance

## Identity and status

Registered id **90**, category `idle`, entry [index.html](../../../Games/CookieClickerHacked/index.html). Baseline `8c8a055`: 336 files, 5,802,253 bytes; entry blob `87d792c72a37cb1cda5fb454da80b681a835f769`. Existing idle game with intentional top-up cheat. **Rehosting restriction is explicitly present in source.** No rights or runtime changes are authorized here.

## Implementation map

Entry loads `base64.js`, `main.js`, inline cheat and `style.css`. Main declares VERSION 2.031, `Game.Launch()`, and window-load calls `Game.Load()` if not ready. `Game.Loader` calls `Game.Init`; gameplay uses `Game.ClickCookie`, `Game.Earn`, object purchasing and `Game.Loop`. `#bigCookie`, `#cookies`, `#products`, `#upgrades`, `#prefsButton`, `#menu`, `#promptContent` and `#textareaPrompt` are useful DOM anchors. Local Garden/Grimoire/Market/Pantheon scripts belong to minigames.

Source review coverage: full entry and readme; selected main Launch/Init/click/save/mod/loop/reset anchors and CSS asset/layout excerpts reviewed. The 801,859-byte main, base64 implementation, four minigame internals, full CSS and art/audio were not fully human-reviewed. Readable function names do not imply every upstream subsystem was audited.

## Gameplay and controls

Click or touch `#bigCookie` earns cookies through `Game.ClickCookie`; Game chooses click versus touch events. Buildings/upgrades supply idle production. Options includes export/import/file save and Wipe save; `Game.HardReset` requires two confirmations. Legacy/ascension is progression, not an invented win/lose screen. Every two seconds the wrapper waits for Game readiness, initially grants 999999999999999 cookies/earned cookies, replenishes below 1000000000000 and raises cookiesPs below 1000000 to 9999999. This is intentionally not a normal zero-cookie restart. No authored keyboard equivalent for cookie clicking is established here.

## State and persistence

`Game.SaveTo` is `CookieClickerGame` or `CookieClickerGameBeta`, origin-wide and potentially shared with the normal variant. `Game.WriteSave` builds encoded data, writes localStorage through guarded helpers and falls back to cookies; export/file save retain portable data. `Game.LoadSave` decodes/version-checks and migrates old formats. Autosave runs around every game-minute when enabled and minigames are not loading. The cheat interval handle is local but never cleared. Its `applied` flag survives `HardReset`, so later top-ups do not repeat the original cookiesEarned synchronization. Reset changes other progress while currency quickly returns.

## Dependencies and provenance

Entry explicitly credits Orteil, 2013-2020 and says not to re-host, profit from or present the code as one's own. Readme links `http://orteil.dashnet.org/cookieclicker/` but its claim that this version can be used anywhere does not override that header. **No blanket open-source permission is established.** Main includes credited FileSaver/seeded-random/helper adaptations; these do not clear the game's graphics. Runtime mod loading has an authored external-URL deny-list; actual default assets are local. Source URL is verified as a supplied reference, not network-verified permission/revision.

## Audit findings

- **HIGH**, `index.html`, copyright/rehosting notice: current hosted-copy intent conflicts with explicit supplied restriction. Owner must resolve provenance/permission before release; do not delete notice or relabel as MIT.
- **MEDIUM**, `main.js:1553`, `Game.LoadMod`: string deny-list rejects only some URL spellings. Leading whitespace before HTTPS can pass the regex while the browser normalizes it; non-string input throws. Root fix is parse/type-check against the current origin and explicitly allowed local paths before creating script. This is an API trust-boundary finding, not proof an attacker can call it remotely.
- **MEDIUM**, entry cheat interval: reset top-up leaves one-time earned-cookie bookkeeping inconsistent with replenished currency. Preserve unlimited cookies but reset/update cheat state at the actual reset boundary; test save/export afterward.
- **MEDIUM**, HTML click-only div controls: core cookie/menu actions lack native keyboard button semantics. Retrofit authored shell/action adapters without rewriting upstream UI wholesale.

## Safe iteration

Rights first. Retain full notice, save compatibility and intentional cheat. Export before altering shared `Game.SaveTo`; never silently erase normal-game saves. Patch local mod validation at the shared API, not caller-by-caller. No remote dependencies, promotional replacement menu or minigame rewrite.

## Verification

Actually run: main.js Git blob `node --check` **PASS**. Native **0**, screenshots **0**. Recommended: click/touch cookie, buy building, observe top-up, export/import/reload, perform both wipe confirmations and inspect cookies versus cookiesEarned after two seconds. Test whitespace URL rejection without fetching it, denied storage and malformed imports. [Playtest r5](../../audit_batches/playtest_r5.md) observed top-up after wipe; that is historical behavior, not a fresh failure verdict. Main owns full gate.

## Future outlook

Resolve explicit rehosting restriction immediately. Then local mod validation, cheat reset/save consistency and keyboard accessibility. Later test minigame save compatibility and long idle sessions. Defer additional mods, remote updates and cosmetic reskins.
