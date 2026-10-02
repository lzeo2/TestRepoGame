# Achtung die Kurve: maintenance manual

<!-- maintenance-game: Games/AchtungDieKurve -->

## Identity and status

Registered ID 200, category `arcade`, featured `false`. Entry: `Games/AchtungDieKurve/index.html` ([open source](../../../Games/AchtungDieKurve/index.html)). Source baseline `8c8a055`; 6 tracked files, 28,652 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected entry, stylesheet, wrapper `javascripts/script.js`, and named methods in the small `adk.minified.js` through bounded source views. The latter is compressed upstream engine code, not an authored wrapper; reading its named methods is not behavioral certification. Bootstrap loads the engine before the wrapper. `new Game('canvas', leftColumn.clientWidth, leftColumn.clientHeight, false)` sets a fixed backing canvas. `Engine.draw` advances lines and `hitTest` uses canvas pixel alpha plus bounds; `PlayerManager` owns engine participants.

The wrapper binds `#playerNameInput`, `#playerControlsSelect`, `#addPlayerButton`, `#startGame`, `#playerList`, and `#canvas`. `addPlayer` allocates a key pair, `activateControls` builds `keysInUse`, and `processCurrentDirections` forwards held turns. `handleRoundEnd` updates standings, draws ranking text, and calls `game.restart` after 2.5 seconds. No asset loader or remote runtime dependency is needed.

## Gameplay and controls

Add two to four players; names must exceed two characters, despite the variable name `minimalPlayerNameLength = 2`. Four available pairs are Left/Right, A/S, G/H, K/L. Start begins moving curves; contact with trails or border eliminates a player. Engine session wins become wrapper points. Four touch zones steer only the first two active participants, not all four. Removal is a hover-visible span, not a keyboard button. Rounds restart automatically; reload is the full session reset.

## State and persistence

`players`, `keysInUse`, `currentDirections`, `scoreList`, and `gameStarted` are wrapper memory only. Engine players hold wins, alive/canceled flags, coordinates and hole timers. There is no save key. Engine `start` guards its 100 Hz interval and `stop` clears it, while wrapper `startCurrentDirectionsProcess` installs a separate 100 Hz interval with no clear path. `Player.calculateNextHole` writes `holeTimoutID`, but `resetTimeout` clears `holeTimeoutID`; the spelling mismatch prevents intended cancellation.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/stravid/achtung-die-kurve, revision `de0d347ee4c0a87c1928e7b339c771991a080dd8`. Shipped `LICENSE` inspected: MIT. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- HIGH, `javascripts/script.js::updatePlayerList`: player names from `#playerNameInput` are concatenated into `innerHTML`. Local input can become executable markup in the portal origin. Recommended reproduction: enter harmless `<b>name</b>` and observe formatting, then test inert escaping. Minimal fix: create list nodes and assign name with `textContent`; retain numeric IDs and color separately. No remote attacker path established.
- MEDIUM, `adk.minified.js::Player.resetTimeout/calculateNextHole`: inconsistent timer property leaves old callbacks alive. Fix at the shared timer owner, with a restart/cancel check, not per caller.
- MEDIUM, `index.html` head and `stylesheets/style.css::#rightColumn`: no viewport metadata or narrow-screen reflow. Native phone layout remains unverified.

## Safe iteration

Patch name rendering in the wrapper first; do not replace pixel-collision gameplay. For compressed engine fixes, recover the pinned readable upstream source rather than hand-editing unrelated minified logic. Keep the two-player touch ceiling visible. Preserve MIT notices. Any reset change must reconcile wrapper lists with engine IDs, especially after removal/re-addition.

## Verification

Recommended native sequence: add two named players, verify both key pairs, eliminate one, observe score and automatic new round, remove/re-add a participant, then test two-finger zone steering. Measure interval count across rounds and blur a held key. Include a narrow portrait screenshot and keyboard-only player removal check.

Actually run: Git blob inventory and `node --check` via standard input for 2 external/inline script units, 2/2 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/AchtungDieKurve/javascripts/adk.minified.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: safe name DOM and timer identity. Week 2: native removal buttons, focus labels, viewport and touch layout. Later: blur/visibility reset for held directions and resize handling only after round continuity tests. Do not add online multiplayer or change scoring as a refurbishment shortcut.
