<!-- maintenance-game: Games/Pacman -->
# Pacman maintenance

## Identity and status

Registered ID **160**, category `arcade`, entry `Games/Pacman/index.html`. Baseline `8c8a055`; 24 files, 330,423 bytes. A readable canvas engine and local audio are present. Local references support offline loading, but initialization/audio policy still needs browser verification.

## Implementation map

**Source review coverage:** read all HTML/inline CSS and wrapper code, and complete readable `pacman.js` including `Ghost`, `User`, `Map`, `Audio`, `PACMAN`, map/wall data and prototype helper. Modernizr's 11,642-byte minified implementation was not human-reviewed; its feature-gate interface was traced. Audio binaries were inventoried, not listened to or rights-certified.

The wrapper loads `pacman.js`, then `modernizr-1.5.min.js`. Canvas, storage and audio codec support gate `PACMAN.init(#pacman, './')`. Engine initialization creates the canvas, map, user and four ghosts, then serially loads six audio registrations. Only `loaded()` installs document keyboard listeners and the 30 FPS interval. Wrapper `startGame()` dispatches N independently of that callback.

`Pacman.User.move` consumes biscuits/pills and signals `completedLevel/eatenPill`; `Ghost.move` chooses random turns and handles tunnels. `PACMAN.mainDraw` advances actors, detects proximity collisions and awards eaten-ghost points. `mainLoop` switches WAITING, COUNTDOWN, PLAYING, PAUSE, EATEN_PAUSE and DYING.

## Gameplay and controls

Arrow keys set a queued direction. N resets the game to level 1 and three lives; P pauses/resumes; S toggles sound. Touch d-pad buttons dispatch document key events; Restart dispatches N. Pellets award 10, pills 50, and successive eaten ghosts `eatenCount * 50`. Crossing 10,000 awards one extra life. Consuming 182 items advances the level; exhausting lives returns to the N prompt rather than a separate DOM result screen.

The catalog mentions fruit, but the engine's own TODO says to add fruits, and no fruit mechanic is implemented in the reviewed flow. Do not reproduce the catalog's fruit claim in maintenance instructions. Sound can be blocked by browser autoplay even though files exist.

## State and persistence

The `PACMAN` closure owns state/tick/level/timer, map, user and ghosts. User closure owns lives, score and consumed count. Restart reuses the existing interval; calling `init` repeatedly would append canvases, ghosts and listeners, so do not use it for an in-page restart. The only persistent key is unnamespaced `soundDisabled`; its direct storage reads/writes are not guarded. There is no saved game or high-score key. Map cloning adds an enumerable `Object.prototype.clone`, a compatibility boundary for future scripts.

## Dependencies and provenance

Headers and [source record](../../catalog_parts/sources_3.md) identify Dale Harvey's `https://github.com/daleharvey/pacman`, revision `3acc5e2bb10e93c8f08eceb1562e1a16d672a1c6`. `LICENSE-WTFPL.txt` contains the WTFPL v2 terms; it is not evidence of independent rights clearance for every sound recording. The game ships paired MP3/OGG files. Runtime uses `opening_song`, `die`, `eatghost`, `eatpill` and `eating.short`; other recordings need consumer tracing before any deletion. No fresh upstream/network/license investigation occurred.

## Audit findings

- **HIGH, static:** `index.html`, `PACMAN.init(el, './'); startGame()`, versus `pacman.js` `loaded()`: the initial synthetic N precedes asynchronous audio completion and listener installation. Cold loads can finish at the N prompt rather than auto-start. Root fix: invoke startup from engine readiness, once, not an arbitrary timeout.
- **MEDIUM, static:** `pacman.js`, `soundDisabled/keyDown`: direct `localStorage` can throw despite an earlier feature probe. Root fix: one guarded preference accessor with an in-memory fallback; do not require storage to play.
- **MEDIUM, static evidence mismatch:** catalog description promises fruit but `User.move` has only biscuit/pill handling. Main should align catalog copy with implemented mechanics, not invent fruit in this audit.
- **MEDIUM, static logic:** `User.isMidSquare`, `rem > 3 || rem < 7`, is true for every ordinary remainder. If midpoint timing is intended, use a bounded conjunction and parenthesize the pellet/pill condition; test consumption/tunnel edges first.

## Safe iteration

Fix readiness where `loaded` installs listeners; retain N as the reusable reset path. Avoid Modernizr/vendor rewrites or sound deletion. Keep original maze drawing and source notices. Canvas accessibility improvements should expose score/lives text without replacing gameplay.

## Verification

Actually run: source inventory/catalog and JS syntax checks in [batch 65](../audits/games-65.md); **0 native runs**. [Historical P1a](../../audit_batches/playtest_p1a.md) saw changing canvas pixels and Restart, not cold-load readiness, fruit or full-level completion.

Recommended native steps: cold-cache offline load, wait for audio readiness, confirm automatic countdown, N reset during play/pause, P/S behavior, denied storage and autoplay, tunnel travel, life exhaustion and 182-item completion. `git show HEAD:Games/Pacman/pacman.js` reads source without materializing Games. Main handles any browser asset lease/full smoke gate.

## Future outlook

Week 1: readiness and preference resilience. Week 2: DOM score/lives announcements, mobile d-pad overlap and reduced-motion pill flashing. Later: measure frame pacing and resize/DPI rendering before engine modernization. Sound provenance remains a rights prerequisite; fruit and new ghost AI are deferred gameplay changes, not refurbishment defaults.
