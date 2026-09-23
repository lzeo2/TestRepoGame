## Batch 6

Street Fighter II | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: minimal EmulatorJS GBA wrapper; ROM (8,388,608 B) fetched 200, mgba core + 7z extractor 200, gate clean; 2p-versus claim matches EmulatorJS control settings; no custom chrome, no slop.
Advance Wars | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: zip valid (contains "Advance Wars (USA) (Rev 1).gba", testzip clean), EmulatorJS extracted it live (extractzip.js 200), gate clean.
Mario Kart Super Circuit | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: ROM 4,194,304 B fetched 200, gate clean; file named "mario-cart-super-circuit.gba" (typo 'cart') but reference and file match — works as-is.
Metroid Fusion | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: zip valid, extracted live, gate clean; same boilerplate wrapper as the rest of the GBA row.
Mega Man Zero | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: zip valid (Mega Man Zero USA/Europe), gate clean.
Kirby Amazing Mirror | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: 6.8MB zip valid + extracted, gate clean; "&" in filename URL-encodes fine.
Sonic Advance | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: zip valid (contains Sonic Advance USA), gate clean.
Helix Jump | functional OK | slop: minor | f=9 a=8 s=8 | keep
Note: full CrazyGames build, self-contained (VOODOO-H5SDK inlined, no external fetches, gate clean); slop = unreferenced crazygames-sdk-v1.js (41KB dead file — index.html/gameplay.js never load it; bundle only reads a pre-existing CrazyGames.CrazySDK global, guarded, 0 console errors).
Crush the Castle | functional OK | slop: none | f=9 a=8 s=9 | keep
Note: Ruffle self-hosted correctly — ruffle.js + c5c02c4e65c1c4423a97.wasm + SWF all 200, gate clean; only slop-adjacent detail is the "| Seraph" port branding in <title>.
Geometry Rash | functional OK | slop: minor | f=9 a=8 s=8 | keep
Note: Construct 2 export, every sprite/audio 200, gate clean (appmanifest.json/offline.appcache refs point at absent files but Chrome never fetched them → dead refs, harmless); "| Seraph" title branding only.
Poor Bunny | functional OK | slop: none | f=8 a=8 s=8 | fix
Note: gate FAIL (2 failed reqs) — bundle injects ./poki-sdk.js which doesn't ship (404); game still boots with 0 console errors, all Stencyl assets 200; fix = ship a local PokiSDK stub (pattern used by other builds) or strip the loader.
Poor Bunny Hacked | functional BROKEN(hack never takes effect) | slop: heavy | f=3 a=6 s=4 | remove
Note: "Poor Bunny.js" is md5-identical to base (646a2d19…); the inline hack hooks killActor/Box2D (0 hits in the bundle), scans for a window engine global that is never assigned, bumps a local _score into DOM score nodes a canvas game never renders, and "unlocks skins" via localStorage (bundle touches localStorage once, no skin keys) → invincibility/auto-collect/all-unlocks all inert; only the fixed "HACKED - Invincible + Auto-Collect" badge is visible = scam build, plus the same poki-sdk.js 404 gate FAIL.
Fireboy and Watergirl | functional OK | slop: minor | f=7 a=7 s=8 | fix
Note: gate FAIL (8 failed reqs) — missing json/{domains,internal,sitelock,contracted,special}.json, images/branding_logo_agame.png and a root-level /main.min.js; temple data/atlases/audio all 200 → levels play; catalog title mismatch: build is actually "Fireboy & Watergirl 2: Light Temple" (index title + game.json id "light").
Fireboy & Watergirl 4: Crystal Temple | functional OK | slop: none | f=9 a=8 s=9 | keep
Note: complete json/ config set present (the only F&W build that passes), every asset 200, gate clean, controls in-game (WASD/arrows).
Fireboy & Watergirl: Forest Temple | functional OK | slop: minor | f=7 a=7 s=8 | fix
Note: gate FAIL (10 failed reqs) — json/ dir is empty (5 config 404s) + branding_logo_agame.png + /main.min.js + menu assets TempleHallForest.jpg and GameNameForest.png missing (Crystal build ships all of these) → menu visibly degraded; temple/audio data all 200 → levels play.

Smoke gate: `== 11/15 games pass ==` (EXIT=1). FAILs: Poor Bunny + Poor Bunny Hacked (poki-sdk.js 404 ×2 each), Fireboy and Watergirl (8 failed reqs: 5 json configs + branding + /main.min.js), Fireboy & Watergirl: Forest Temple (10 failed reqs: 5 json configs + branding + /main.min.js + TempleHallForest.jpg + GameNameForest.png). All 11 other games: console_errors=0 failed_reqs=0.
