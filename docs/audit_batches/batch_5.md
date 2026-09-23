## Batch 5

Breakout Hacked | functional OK | slop: minor | scores f=7 a=6 s=6 | fix
Note: hack verified in source (score starts 999999, +1000/brick, +50000 + brick respawn when cleared); still ships dead VS project files (.sln/.vcxproj/.filters), custom <pwr> element, no in-page controls doc — same debt as base Breakout.
Snake Hacked | functional OK | slop: minor | scores f=9 a=8 s=8 | keep
Note: hack verified — collision gated behind `if (false)`, checkCollision() hard-returns false (god mode), wrap-around walls, score 999999 +1000/food; controls doc + mobile dpad present; minor cruft = repo files (LICENSE/README/screenshots) shipped in game dir.
Pokemon Unbound | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Note: minimal EmulatorJS wrapper (gba core, auto-start); menu/saves/keyboard+touch all come from EmulatorJS; smoke fetched ROM zip + core 200.
Pokemon Unbound Hacked | functional OK | slop: none | scores f=9 a=7 s=8 | keep
Note: ROM byte-identical to base (md5 51fef53e...), hack = runtime cheats, verified wired to real bundled EmulatorJS APIs (EJS_cheats parsed at emulator.js:304-314 → gameManager.setCheat(index, checked, code), 1s re-apply on 'start' event); 0 console errors while re-apply ran → no dead calls.
Pokemon Emerald | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Pokemon Emerald Hacked | functional OK | slop: none | scores f=9 a=7 s=8 | keep
Note: same pattern as Unbound Hacked — identical ROM (md5 605b89b6...), cheat hook verified against emulator.js/GameManager.js, not dead code.
Pokemon Fire Red | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Pokemon Fire Red Hacked | functional OK | slop: none | scores f=9 a=7 s=8 | keep
Note: identical ROM (md5 51901a6e...), same verified cheat wiring; Walk-Through-Walls code is a FireRed-compatible TWE protocol code.
Pokemon Ruby | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Pokemon Ruby Hacked | functional OK | slop: none | scores f=9 a=7 s=8 | keep
Note: identical ROM (md5 3e1b2065...), same verified cheat wiring (Ruby addresses differ from FireRed — correct per game).
Subway Surfers Hacked | functional OK | slop: minor | scores f=9 a=8 s=8 | keep
Note: judged as Unity wrapper per scope — provenance comment, XHR/fetch offline guards routing backends to json/null.json, loader+progress+controls doc ("Steer, jump and roll — swipe/drag or arrow keys"), all Build assets 200; hack wraps real gameInstance.SendMessage (coin/score val→999999, blocks crash/die/death methods, ScoreManager/SetCoins pulse) — wired to real Unity API, no console errors while active; method-name matching is runtime-dependent; badge = minor slop.
Crossy Road | functional OK | slop: minor | scores f=9 a=8 s=9 | keep
Note: full boot verified (bootstrap→asset-loader→three/game.min.js all 200, sprites/audio loaded); minor cruft = stray 1-byte `hi` file + unreferenced poki-sdk.js/poki-sdk-core-v2.234.2.js (216KB dead, never loaded by index.html).
Crossy Road Hacked | functional BROKEN(dead hack) | slop: minor | scores f=9 a=7 s=7 | remove
Note: scam build — scripts/ dirs byte-identical to Crossy Road; the hack hooks window.playerController/window.textScore, but game.min.js only ever touches module-scoped `y2N.default.playerController` / textScore and never assigns either on window (grep: 0 hits) → god mode + 999999 score never apply; you get the plain game plus a badge. Exact duplicate → remove.
Doodle Jump Hacked | functional OK | slop: minor | scores f=8 a=7 s=8 | keep
Note: hack verified against real structure — `var Doodle` global (main.js), 'Game' state registered, bundle has this.gameOver/this.player/this.score → gameOver no-op override, score forced 999999, fall-rescue all take effect; offline CloudAPI stub + controls hint (tilt/←→) present; slop = emoji badge "⚡HACKED⚡" and broken CSS `border-radius:8pxpointer-events:none;` (one declaration swallows the other, badge can intercept taps).
Dr. Mario | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Note: clean EmulatorJS GBA wrapper, site-branded title, ROM fetched 200 (filename spaces URL-encoded fine).

Smoke gate: `== 15/15 games pass ==` — every game ok, console_errors=0 failed_reqs=0.
