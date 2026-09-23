## Batch 2
A Dark Room | functional OK | slop: none | scores f=9 a=8 s=10 | keep
Stranded In Isekai | functional OK | slop: none | scores f=8 a=6 s=9 | keep
Papa's Pizzeria | functional OK | slop: none | scores f=9 a=8 s=9 | keep
Retro Bowl | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Super Hot | functional OK | slop: none | scores f=8 a=6 s=9 | keep
10 Minutes Till Dawn | functional OK | slop: minor | scores f=8 a=6 s=8 | keep
  note: wrapper cruft only — invalid `background: ;` declaration and a `JSON.parse("")` try/catch scale hack; invisible to players.
Fleeing the Complex | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Infiltrating the Airship | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Baldi's Basics | functional OK | slop: none | scores f=9 a=8 s=9 | keep
Temple Run 2 | functional OK | slop: none | scores f=9 a=8 s=9 | keep
Fruit Ninja | functional OK | slop: minor | scores f=8 a=7 s=8 | keep
  note: leftover seraph cruft — dead `../../images/ico.ico` favicon ref (404) and "| Seraph" in the title.
Fruit Ninja Hacked | functional BROKEN(advertised hacks are dead code) | slop: heavy | scores f=4 a=6 s=4 | fix
  note: index.html patches `Phaser.Scene.prototype.notifyBombHit/loseLife/update`, but all three are own methods of `class MainScene extends Phaser.Scene` in main.bundle.js (bundles byte-identical to Fruit Ninja) — patches are fully shadowed, so no bomb immunity, no life immunity, no 999999 score; only the "HACKED" badge shows. 23MB vendors bundle duplicated for nothing.
Cut the Rope | functional BROKEN(smoke gate: intro_1024.mp4 net::ERR_ABORTED) | slop: minor | scores f=6 a=8 s=7 | fix
  note: gate FAIL — game's own video code sets `video.src`/`load()` then removes/reloads `#vid` mid-stream, aborting the mp4 (file exists, menu and all assets load; likely trivial to silence). Also dead `../../storage/js/cloak.js` + `../../images/ico.ico` refs (404).
Fancy Pants Adventure 3 | functional OK | slop: minor | scores f=9 a=7 s=7 | keep
  note: dead seraph leftovers — `../../storage/js/cloak.js` 404 and a "CDN" fallback to nonexistent `../../storage/ruffle/ruffle.js` (primary local ruffle loads fine).
Vex 7 | functional OK | slop: minor | scores f=8 a=7 s=7 | keep
  note: leftover archive junk in dir (`ahrefs_*` site-verification file, `@source.txt`) plus dead cloak.js/ico.ico refs; GameDistribution/analytics calls answered by local json/null.js stubs — gate clean.
