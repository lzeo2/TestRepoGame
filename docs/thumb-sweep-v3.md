# Fresh thumbnail sweep v3

## Result and scope

**Update: [v3.1 manual continuation](#v31-manual-capture-continuation) attempted
all 52 holds, now including bounded retries: 26 refreshed, 26 still needs-manual.
Combined fresh total: 101/127. Latest retry results are appended below.
Final portal visual verification passed 4/4 desktop/mobile theme views; no push.**
The original v3 result below remains historical.

**Partial image refresh, complete catalog traversal: 75 fresh captures accepted,
52 need manual capture.** The actual catalog contains **127**, not 128, registered
games. All 127 tracked entry URLs were visited in 26 catalog-order batches of at
most five. No game was added, removed, rebuilt or registered. No catalog title,
description, game source, protected Character AI source, proxy or Netlify policy
changed. No push or publication; no full-fleet gameplay smoke was run.

Starting source commit: `5739372876bcfc07090f8aeb299e40094af60156`.
The current game trees match every recorded attempt's source tree. Full entry
blob IDs, source tree IDs, native actions, output SHA-256 hashes, sizes and
per-game automation times are in [the machine-readable receipt](thumb-sweep-v3.json).
Source hashes on rejected rows identify the attempted game, **not** the provenance
of its retained old image. The earlier [honest recovery](maintenance/audits/thumbs-sweep-20261021.md)
and [shipping receipt](maintenance/audits/thumbs-ship-20261021.md) remain historical.

## Capture method and acceptance

- Reused the old capture helper's alias resolution, HTTP-200 and image guards.
  Added `scripts/capture_thumb_sweep_v3.py`, serving exact tracked HEAD game blobs
  by object ID, including sparse-excluded game/emulator dependencies. No checkout
  expansion, asset downloads, installs, browser downloads or game-state injection.
- System Chromium only, explicitly pinned to `/usr/bin/chromium`; one browser,
  sequential pages, browser profiles/candidates/contact sheets in RAM. Browser
  and HTTP server close after each five-game batch or single-game retry. No
  sibling `chrome-linux/chrome` was active at the batch guards.
- Real 1280x720, device scale 1, native keyboard/pointer/button interaction.
  No mocked art, DOM hiding, altered game state, replacement canvas, patched
  clocks, compositing or promotional frames. Accepted output is the full viewport,
  optimized progressive JPEG quality 75, not an upscale of the previous thumbnail.
  Spline Ride is its existing running spline demo; Character Alsen is its actual
  chat interface; text/board games retain their real opening/in-progress boards.
- Initial and post-input contact sheets were visually reviewed. Loaders, title
  screens, selection menus, paused/help dialogs, blank frames and unusable
  contrast were rejected. Each game's automation was bounded below 120 seconds,
  including retries; some deterministic failures were stopped earlier. The
  recorded maximum is 106.51 seconds. This is not a full gameplay/rights/hardware
  acceptance test. Existing hacked scores/labels came from source, not grants.
- Portal art is selected in `assets/portal-ux.js`, not an image field in
  `games.json`: explicit `THUMBS` aliases, otherwise the lowercase alphanumeric
  title slug under `assets/thumbs/*.jpg`. Five freshly captured hacked variants
  now have their own aliases/files instead of borrowing base-game art.
- The same image is used in both portal themes; standalone game content does not
  inherit the portal's theme. Both portal themes were freshly checked at 1280x720
  and 390x844. No recoloring or second invented version of a game image.
- Failed games retain their old bytes and aliases, or their existing fallback if
  no old JPG existed. Thus **48 old mapped images remain unrefreshed** and **four
  cards still have no real image**: Asteroids, Duck Hunt, Balatro and Wings. Do not
  mistake 123 loading JPGs for 123 fresh accepted captures.

## Verification and known holds

Actual targeted output:

```text
CATALOG: 127 unique entries; schema and tracked URLs PASS
PROMOTED 75 real 1280x720 JPEGs; 3817333 bytes
PASS: retry record preservation, URL guards, sparse HEAD blob identity, genuine missing-file HTTP 404
thumbnail guard self-test: PASS (local path, HTTP 200, aliases, duplicate, blank)
Inventory: 132 games, 127 registered; shared runtime separate.
PASS: 132 game documents cover 127 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

`node --check assets/portal-ux.js` and owned `git diff --check` passed. Inventory
refresh was run deliberately; `docs/maintenance/inventory.json` and its index
were already current and remained byte-identical because no game source/catalog
changed. No fabricated inventory-only change was made. The old guard self-test's
Snake Hacked assertion initially failed after the intentional alias split; it
was updated to the new dedicated file and then passed. The new tool's retry
report preservation was corrected and regression-covered before final reporting;
early discarded diagnostics were recaptured, with earlier probe time conservatively
restored from command logs. No rejected frame was promoted by those fixes.

All four portal visits returned **127 cards, 123 loaded images, zero broken image
elements, four stable SVG/initial fallbacks, no horizontal overflow, no pageerrors
and no external requests**. Each new context logged the four expected missing-JPG
404s listed above. This is **not** zero-console/resource-error acceptance.
Desktop/mobile light/dark screenshots were visually reviewed: readable cards,
expected native art/cropping, no added portal layout layer. The first proof
screenshots were mid-scroll and were superseded by settled native header-scroll
captures, not presented as polished evidence.

- [Desktop light](thumb-sweep-v3/portal-desktop-light.jpg)
- [Desktop dark](thumb-sweep-v3/portal-desktop-dark.jpg)
- [Mobile light](thumb-sweep-v3/portal-mobile-light.jpg)
- [Mobile dark](thumb-sweep-v3/portal-mobile-dark.jpg)

Known exclusions are per-game below. In particular, unavailable WebGPU prevented
Blackout/Getaway gameplay; Wings never reached reviewed flight; Asteroids' nearly
black line art was not repaired or cosmetically brightened; Duck Hunt stayed
blank; Balatro reached deck selection but not gameplay. Existing external game
requests were blocked for this local run and recorded by host in the JSON receipt,
not enabled as a workaround. A good screenshot is not offline closure or licensing
clearance. Full-fleet smoke/release acceptance remains a separate gate before any
future push.

Runnable regression and recapture examples (existing Pillow/Playwright required):

```sh
python3 -B scripts/capture_thumb_sweep_v3.py --self-test
python3 -B scripts/capture_game_thumbs.py --self-test
TMPDIR=/dev/shm python3 -B scripts/capture_thumb_sweep_v3.py --batch 1
# Retry one catalog index only within its remaining cumulative time budget:
TMPDIR=/dev/shm python3 -B scripts/capture_thumb_sweep_v3.py --game 31 --steps '[["click",565,275],["wait",1700]]'
python3 -B scripts/check_maintenance_docs.py
```

Candidates remain unreviewed until a person accepts them. The tool never copies
candidates to runtime art automatically. Keep rejected old images unchanged.

## Per-game table

Rows use catalog order, five per batch (last batch has two). Source is the full
Git game-tree hash. Bytes are the **currently mapped output's** size; zero means
no old image exists and the portal retains its fallback. `captured` means fresh,
reviewed real content; `needs-manual` is an explicit failed capture, not a pass.

### Batch 01

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 001 / 4 | Soccer Random | `b00005521705672b93fe395a19497a348681f8c3` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/soccerrandom.jpg` | 90028 |
| 002 / 5 | Basket Random | `e83d1b6466f22f1aaa8cfda179a62b62523beefc` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/basketrandom.jpg` | 72970 |
| 003 / 6 | Volley Random | `1b2a39915173f89c1e3e475e7417d65eb9b71eb2` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/volleyrandom.jpg` | 76731 |
| 004 / 7 | Ovo | `7537015dec8f9de72493860ce3ade0678322bb7d` | needs-manual (old retained): Black frame after native Play; no reviewed gameplay. | `assets/thumbs/ovo.jpg` | 6396 |
| 005 / 8 | Run 3 | `c638de581d899015f8dc994d048480ffc620d0cb` | needs-manual (old retained): Warning triangle/black canvas after starfield. | `assets/thumbs/run3.jpg` | 9401 |

### Batch 02

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 006 / 9 | Snake | `e6255960e969a21c68aed5e2011818f368186bdc` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/snake.jpg` | 34584 |
| 007 / 10 | Chrome Dino | `3c4821a4f53bc3ff86d519e1cbabe8408a54dd04` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/chromedino.jpg` | 11263 |
| 008 / 11 | Breakout | `d92938a06aca4948510315a27bc9e6a7c351660c` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/breakout.jpg` | 19614 |
| 009 / 14 | Character Alsen | `b7b7e60e98c11b6ccdebbf8f480a072b8b6f2017` | captured: Actual Character Alsen chat interface; protected source unchanged. | `assets/thumbs/characteralsen.jpg` | 22122 |
| 010 / 47 | Gladihoppers | `79d02b868f2f8c674218bf3bb80ff4a4c6416cd2` | needs-manual (old retained): Screenshot timeout; no reviewed gameplay. | `assets/thumbs/gladihoppers.jpg` | 8940 |

### Batch 03

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 011 / 48 | Burrito Bison | `40104c6a47a5fe3357895acf0ff01e815c8758af` | needs-manual (old retained): Kongregate splash after loader/click attempts. | `assets/thumbs/burritobison.jpg` | 11710 |
| 012 / 49 | BitLife | `384f98c2a9ea30e2b344442a66ddbc66558c4f4f` | needs-manual (old retained): Unity splash and text-capture timeout. | `assets/thumbs/bitlife.jpg` | 9645 |
| 013 / 50 | Subway Surfers | `bbaac3f3fd9a32b4bfa13652d533caff66197463` | needs-manual (old retained): Loading-tip screen after wait/start attempt. | `assets/thumbs/subwaysurfers.jpg` | 6871 |
| 014 / 51 | A Dark Room | `786f193f75080abf09f0cccfe29989a8b8c903e0` | captured: Real text gameplay after lighting the fire. | `assets/thumbs/adarkroom.jpg` | 16851 |
| 015 / 52 | Stranded In Isekai | `974a4526694e905b8d46cdd689ce5abad10b0f88` | needs-manual (old retained): Title screen remained after Space. | `assets/thumbs/strandedinisekai.jpg` | 18261 |

### Batch 04

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 016 / 53 | Papa's Pizzeria | `14163f7e2c7d4127d239a245f6a70d599546a0f3` | needs-manual (old retained): Ruffle loader/ad frame, not gameplay. | `assets/thumbs/papaspizzeria.jpg` | 11627 |
| 017 / 54 | Retro Bowl | `795337be7c34d74e43321ed81675656cfbd7102a` | needs-manual (old retained): Welcome/Continue screen, not on-field play. | `assets/thumbs/retrobowl.jpg` | 14481 |
| 018 / 55 | Super Hot | `a9f18481f280b347030e8334e1e1db17308bdffe` | needs-manual (old retained): Blank blue/gray canvas. | `assets/thumbs/superhot.jpg` | 11927 |
| 019 / 56 | 10 Minutes Till Dawn | `97d5765581456deb9016318fb6e39d3bde23eb59` | needs-manual (old retained): Character/weapon selection, not gameplay; automation stopped at 106.51s. | `assets/thumbs/10minutestilldawn.jpg` | 7250 |
| 020 / 57 | Fleeing the Complex | `a3e1197af988071408383e9bc29822fe335d181b` | needs-manual (old retained): Ruffle loading/blank stage. | `assets/thumbs/fleeingthecomplex.jpg` | 12566 |

### Batch 05

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 021 / 58 | Infiltrating the Airship | `e2ddb6653374297d379f04c2d9691e37d5445499` | needs-manual (old retained): Ruffle screenshot timeout. | `assets/thumbs/infiltratingtheairship.jpg` | 8763 |
| 022 / 59 | Baldi's Basics | `dc5ef4aec8afc4b63eb5a3dfbac5ea9b3df4e592` | needs-manual (old retained): Unity splash, not gameplay. | `assets/thumbs/baldisbasics.jpg` | 13170 |
| 023 / 60 | Temple Run 2 | `6b268ecb866a2abd8699512d0d2dcc612bb2d16b` | needs-manual (old retained): Intro fly-through, no reviewed running gameplay. | `assets/thumbs/templerun2.jpg` | 20305 |
| 024 / 62 | Cut the Rope | `268f2e93f6dbdd7376419fffed0f2db38f43ec9c` | needs-manual (old retained): Screenshot timeout. | `assets/thumbs/cuttherope.jpg` | 8081 |
| 025 / 63 | Fancy Pants Adventure 3 | `bb348cbf61cd50b7ae272f5e18810431f6c212fe` | needs-manual (old retained): Screenshot timeout. | `assets/thumbs/fancypantsadventure3.jpg` | 6092 |

### Batch 06

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 026 / 64 | Vex 7 | `e2c09b22a2bf16498d43309c801dab277b7f9873` | needs-manual (old retained): Kizi branding/loading wrapper. | `assets/thumbs/vex7.jpg` | 8080 |
| 027 / 66 | Geometry Dash Lite | `6f81c65619ca390d6fc0413c219ffea4d81cbd7f` | needs-manual (old retained): Black canvas after level selection. | `assets/thumbs/geometrydashlite.jpg` | 9235 |
| 028 / 79 | Cookie Clicker | `f1c5ddab8563ad6d0f397d8dcb97f5115be736ab` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/cookieclicker.jpg` | 122884 |
| 029 / 80 | Bloons TD | `cb803cd16c4bd542e64699192fffef5363f7a51b` | needs-manual (old retained): Bloons 1-4 launcher, not a game round. | `assets/thumbs/bloonstd.jpg` | 17353 |
| 030 / 81 | Drift Boss | `f637b2fb141ed65613ab4008a5921202830df82f` | needs-manual (old retained): Blank Drift Boss frame. | `assets/thumbs/driftboss.jpg` | 12561 |

### Batch 07

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 031 / 83 | Doodle Jump | `1f3fd8163b03155224ae7c11ef3cb24e33762909` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/doodlejump.jpg` | 66149 |
| 032 / 84 | Chess | `51d9d0b76913dffa4b20c3e876976c74151ecd03` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/chess.jpg` | 65304 |
| 033 / 86 | Jetpack Joyride | `43a828ea99eceb6e068a036496a7a6bc2e6b0c40` | needs-manual (old retained): Jetpack loading splash remained. | `assets/thumbs/jetpackjoyride.jpg` | 11247 |
| 034 / 107 | Jetpack Joyride Hacked | `c2060fe57873c07d5b5662e642e9b254fcfd7c39` | needs-manual (old retained): Hacked Jetpack loading splash. | `assets/thumbs/jetpackjoyride.jpg` | 11247 |
| 035 / 87 | Doge Miner | `76cfddcf17d7ae17d38bf04bd41797a946ea5c8e` | needs-manual (old retained): Doge Miner loading modal. | `assets/thumbs/dogeminer.jpg` | 12708 |

### Batch 08

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 036 / 89 | Retro Bowl Hacked | `b6c70229b7f6d03fc5cb2e39f45b0097f9483726` | needs-manual (old retained): Welcome/Continue screen, not on-field play. | `assets/thumbs/retrobowl.jpg` | 14481 |
| 037 / 90 | Cookie Clicker Hacked | `afd7ea33352143af7e774198ad5805e8c6528a81` | needs-manual (old retained): Cookie interaction timed out; no accepted frame. | `assets/thumbs/cookieclickerhacked.jpg` | 26596 |
| 038 / 94 | Breakout Hacked | `9af0b4d09951eeaedbfd559799bdb3184aa7ac47` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/breakouthacked.jpg` | 21763 |
| 039 / 95 | Snake Hacked | `1f4c0b5060fc34369c88f745510cebccffd626dc` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/snakehacked.jpg` | 36843 |
| 040 / 111 | Subway Surfers Hacked | `103206d71b6f880a020631c9e94287073d31cf54` | needs-manual (old retained): Subway loading-tip screen. | `assets/thumbs/subwaysurfers.jpg` | 6871 |

### Batch 09

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 041 / 109 | Doodle Jump Hacked | `b0c33933be00b64722b92cb7e1bd2dae20621e3e` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/doodlejumphacked.jpg` | 67242 |
| 042 / 114 | Dr. Mario | `565580456ccfa823b7d6552b2134280244c0b301` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/drmario.jpg` | 116397 |
| 043 / 115 | Street Fighter II | `0d9d78034ffa2bf9edd649b74db5819c57b1364b` | needs-manual (old retained): Emulator title/intro, no bout. | `assets/thumbs/streetfighter2.jpg` | 15246 |
| 044 / 116 | Advance Wars | `dc9a072f593cdfbed3e9060368f725c5d8984e49` | needs-manual (old retained): Emulator intro map, not gameplay. | `assets/thumbs/advancewars.jpg` | 14851 |
| 045 / 117 | Mario Kart Super Circuit | `f03642879ffe8348d10d6fcbb5f8746b21f058fd` | needs-manual (old retained): Emulator game/class selection, no race. | `assets/thumbs/mariokartsupercircuit.jpg` | 8150 |

### Batch 10

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 046 / 118 | Metroid Fusion | `94eb95065484723e6770979e01e119c2a3e97206` | needs-manual (old retained): Emulator loading/decompression. | `assets/thumbs/metroidfusion.jpg` | 13032 |
| 047 / 119 | Mega Man Zero | `9d77bde88f229da6646fe2e545417970e41f9016` | needs-manual (old retained): Emulator publisher intro. | `assets/thumbs/megamanzero.jpg` | 12905 |
| 048 / 120 | Kirby Amazing Mirror | `bc8bd736c48ea4a72a4f7ca9412f0e7ca1ea6147` | needs-manual (old retained): Emulator title/Game Start screen. | `assets/thumbs/kirbyamazingmirror.jpg` | 17867 |
| 049 / 121 | Sonic Advance | `a0a64bcb0a651dfeb14fed5555351a3f088acf5f` | needs-manual (old retained): Emulator SEGA intro. | `assets/thumbs/sonicadvance.jpg` | 18689 |
| 050 / 123 | Crush the Castle | `1dc3561e1947c1d97842affd4c5c53cd53e450b3` | needs-manual (old retained): Ruffle unsupported-content warning; no game round. | `assets/thumbs/crushthecastle.jpg` | 14318 |

### Batch 11

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 051 / 127 | Fireboy and Watergirl | `9fd3ac244615e2da3968dcb07714bde0f23dd88a` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/fireboyandwatergirl.jpg` | 93369 |
| 052 / 128 | Fireboy & Watergirl 4: Crystal Temple | `ec2ec37d83ae2433c3736f40e846c67c2c667e5e` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/fireboywatergirl4crystaltemple.jpg` | 74370 |
| 053 / 129 | Fireboy & Watergirl: Forest Temple | `8feaa5e64a1ad714c41b34ece87b7881b127ebb9` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/fireboywatergirlforesttemple.jpg` | 77793 |
| 054 / 131 | Fireboy and Watergirl Hacked (Light Temple) | `68e32fc83ede60bc267bda51b0e007c4de7ba57b` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/fireboyandwatergirlhackedlighttemple.jpg` | 95242 |
| 055 / 132 | Fireboy and Watergirl Forest Temple Hacked | `8700380d0c7fd787ab5a0eddda34eb1816e64818` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/fireboyandwatergirlforesttemplehacked.jpg` | 79705 |

### Batch 12

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 056 / 133 | Fireboy and Watergirl Crystal Temple Hacked | `934260698477af011e1cfc5ac0eebbb9bb8c69d5` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/fireboyandwatergirlcrystaltemplehacked.jpg` | 76301 |
| 057 / 136 | Merge Cats Defender | `526b3d1f65cfc05058f08c44012ab5d31adaa1cb` | needs-manual (old retained): Loader remained at 100%. | `assets/thumbs/mergecatsdefender.jpg` | 5403 |
| 058 / 137 | Merge Cats Defender Hacked | `ca6ce240bd29396fc02a7716ff7cee8711070179` | needs-manual (old retained): Hacked loader remained at 100%. | `assets/thumbs/mergecatsdefender.jpg` | 5403 |
| 059 / 149 | Archery | `337adf0cf988802bb965c9baece20ca52cba76f7` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/archery.jpg` | 35758 |
| 060 / 152 | Free Throw | `2526d0748627bb383396392e554963fe7a6424f3` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/freethrow.jpg` | 25305 |

### Batch 13

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 061 / 154 | Backgammon | `f460abdf972600bb28009793ae329aeccfc8bb36` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/backgammon.jpg` | 47116 |
| 062 / 160 | Pacman | `67a6bb3ef44c819e426a0175a5beb25377c3c1b1` | needs-manual (old retained): Waiting/countdown overlay, not active maze play. | `assets/thumbs/pacman.jpg` | 8266 |
| 063 / 161 | Qix | `784859f4e394846342ddf3c61b55741c191057f9` | needs-manual (old retained): JIX prototype: mostly empty field, player clipped at bottom. | `assets/thumbs/qix.jpg` | 6672 |
| 064 / 162 | Joust | `6a246c3aa4d9cddf1188d885741fe8306dfb888f` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/joust.jpg` | 24974 |
| 065 / 163 | Tron Light Cycles | `c6fc42e4c69d2f08ccb3dd4efbf5f837d502dfb5` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/tronlightcycles.jpg` | 23064 |

### Batch 14

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 066 / 169 | Puzzle 15 | `f8fde128da13b37da272434a260f605c05d15392` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/puzzle15.jpg` | 37971 |
| 067 / 170 | Peg Solitaire | `cd0d0227aaff4755394b2c5fcd7b2d427411b5e3` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/pegsolitaire.jpg` | 46481 |
| 068 / 171 | Checkers | `d60f09dc70012d9d37f531dfc9c10eb5b19b9bdf` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/checkers.jpg` | 50671 |
| 069 / 172 | Reversi | `51130a9f1e19f2ef4537e84c9d2fd5d7f38f8d04` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/reversi.jpg` | 39846 |
| 070 / 174 | Mastermind | `098359f6f11a3797feadfe132449331f1cb97531` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/mastermind.jpg` | 24428 |

### Batch 15

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 071 / 175 | Nim | `639b664b392cd5a96944083314fe033852b14e91` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/nim.jpg` | 24600 |
| 072 / 176 | Dots and Boxes | `1660c96b049939a4f74239f364a01132730faa9d` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/dotsandboxes.jpg` | 29012 |
| 073 / 177 | Ultimate Tic-Tac-Toe | `a18914606aa3674a19ddf1007c5650e7258ebd55` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/ultimatetictactoe.jpg` | 38671 |
| 074 / 178 | Klondike Solitaire | `c530d22ef1580459ce6451c31f89174cadb8560b` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/klondikesolitaire.jpg` | 50925 |
| 075 / 179 | FreeCell | `a2a8ac0943a24db6aa7aab1bc0afb5e16e3b8e66` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/freecell.jpg` | 72466 |

### Batch 16

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 076 / 180 | Blackjack | `acb26ef0848bb4b1e61116fda02145b755cdc12d` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/blackjack.jpg` | 43468 |
| 077 / 181 | Video Poker | `071206edc4e390b86736464e91cf233649ff2082` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/videopoker.jpg` | 31991 |
| 078 / 182 | Yahtzee | `b0e74fe8c751fd0e398f2bc552614be4b01f01c9` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/yahtzee.jpg` | 52161 |
| 079 / 184 | Go Fish | `21e7929e494a1b33a373af6bfefebc3d7c7ef83d` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/gofish.jpg` | 35289 |
| 080 / 185 | War | `790a59724e2b6a1564e22515d47f501f00cb4803` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/war.jpg` | 21485 |

### Batch 17

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 081 / 186 | Word Search | `09bb2a5e936f9afec38d5f5a4d6e38226cf97d44` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/wordsearch.jpg` | 40373 |
| 082 / 188 | Word Ladder | `daf15181f4cf21bc1c2938b17ecc1ca6a59681f5` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/wordladder.jpg` | 16986 |
| 083 / 190 | Word Scramble | `984233d9881fee517f6c4f229de1f7669004a975` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/wordscramble.jpg` | 37753 |
| 084 / 191 | Darts 501 | `c2ad1634e9008386ce729649d78dc4adf49a18bf` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/darts501.jpg` | 72797 |
| 085 / 193 | Mahjong Lite | `a55d5a23626ef1cd4382201b9a2a933c532ec0a9` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/mahjonglite.jpg` | 72239 |

### Batch 18

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 086 / 195 | Sokoban | `0c53a92cca82d0699f72dfd62866c265e5c64558` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/sokoban.jpg` | 65542 |
| 087 / 196 | Tower of Hanoi | `896353c14df82a0f083020b0b3f9d1b7afe6b173` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/towerofhanoi.jpg` | 35289 |
| 088 / 197 | Nonogram | `0dfd87eea4b13a47d9e07022eaca424b3f93a912` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/nonogram.jpg` | 52899 |
| 089 / 198 | Battleship | `fbf6ed8957bd858c0dc945c7b33dca5d66d3e7b2` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/battleship.jpg` | 61025 |
| 090 / 199 | Boggle | `fc594a30136bb7b9869a90e32c2c6ab76239dff9` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/boggle.jpg` | 28155 |

### Batch 19

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 091 / 200 | Achtung die Kurve | `09034393b86e572ca8a026edea0da38bf395a1af` | needs-manual (old retained): Player-setup form, no round. | `assets/thumbs/achtungdiekurve.jpg` | 15829 |
| 092 / 201 | Dominoes | `1b77394a86d79b164e0c88070daee242383f0800` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/dominoes.jpg` | 75414 |
| 093 / 202 | Mini Golf | `46522acc07c2552597e4cbf18fa8f588611e6aa0` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/minigolf.jpg` | 24453 |
| 094 / 203 | Bowling | `632ff0ee3f4d7f56121178b10beb6a2101c2bdd9` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/bowling.jpg` | 38910 |
| 095 / 204 | Hearts Classic | `7a88aac85017a94e4dcff90249a67f49a61a66a8` | needs-manual (old retained): Cards/styles did not render coherently. | `assets/thumbs/heartsclassic.jpg` | 4837 |

### Batch 20

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 096 / 205 | Spider Solitaire | `bd00db346e97c8607c702cc04d7c6f81845154dd` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/spidersolitaire.jpg` | 87140 |
| 097 / 206 | SameGame | `56e7f282878ee93ecd7b18dce3908115e5f4586a` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/samegame.jpg` | 44166 |
| 098 / 207 | Tower Defense | `f1718201f7b0a1b53a5ec6b531d3795ce843a4af` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/towerdefense.jpg` | 42566 |
| 099 / 208 | JavaScript Racer | `95876b276b9d852769d749eeafd8eb25fa000758` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/javascriptracer.jpg` | 90735 |
| 100 / 209 | Rhythm | `50fa69aecfe8359bce1f634e4d35fd7cc7f0cc51` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/rhythm.jpg` | 25880 |

### Batch 21

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 101 / 210 | Bullet Hell | `d5893fbdbfedccc7ad8555102a79c53ea950ef1e` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/bullethell.jpg` | 36510 |
| 102 / 211 | Cribbage | `37fa459dae3a2c15e262fee14658f60331d1a099` | needs-manual (old retained): Lowest-card selection remained, not a hand. | `assets/thumbs/cribbage.jpg` | 18203 |
| 103 / 212 | Crossword | `9dcb87b1001a7e3df3060679e63852ac3583692e` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/crossword.jpg` | 40184 |
| 104 / 213 | Gomoku | `3efa208764af1085b1077c8ea22f14b63fe36349` | needs-manual (old retained): Setup panel/empty board, no reviewed match. | `assets/thumbs/gomoku.jpg` | 10447 |
| 105 / 214 | Mancala | `5261d028095e461b5688ad355dc1b5e4faf8402e` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/mancala.jpg` | 58282 |

### Batch 22

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 106 / 215 | Asteroids | `a4d0f3152372e758bf0c2ebb9d4d0921d72c7915` | needs-manual (SVG fallback): Nearly black line art; rejected unreadable capture, no cosmetic source change. | `assets/thumbs/asteroids.jpg` | 0 |
| 107 / 216 | Frogger | `5a3dcd59f3586948d8996a28d087a36d56db3bfb` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/frogger.jpg` | 27392 |
| 108 / 217 | Missile Command | `279682cb53d3fefa5bacd50c1cc90df3ee226c95` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/missilecommand.jpg` | 19478 |
| 109 / 218 | Lunar Lander | `b253bc45208780f9850c89ef7399c6c6e5b2ef04` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/lunarlander.jpg` | 9645 |
| 110 / 219 | Space Invaders | `da59e72186970c1623b2af498314c4f0cca45f8e` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/spaceinvaders.jpg` | 102905 |

### Batch 23

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 111 / 220 | Duck Hunt | `8b74fe11c695bf41e705ac469c7c57bd38adbf24` | needs-manual (SVG fallback): Blank black frame. | `assets/thumbs/duckhunt.jpg` | 0 |
| 112 / 221 | Balatro | `fa914c914e512cf5ed8057d903657675b7bdb5e0` | needs-manual (SVG fallback): GBA deck selection reached, not active hand; stopped at 105.04s. | `assets/thumbs/balatro.jpg` | 0 |
| 113 / 222 | Circuit Ward | `1c97386eb7e3def3f7e22b8cd44bfd9bff506acc` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/circuitward.jpg` | 56544 |
| 114 / 223 | Tag Relay | `3914f47817c56afce779f7035489c3a3b72027b3` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/tagrelay.jpg` | 27121 |
| 115 / 224 | Spline Ride | `9447a675ebc437197e0b4369bb587662cde62461` | captured: Running existing spline demo in native Orbit view. | `assets/thumbs/splineride.jpg` | 40149 |

### Batch 24

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 116 / 225 | Slipstream Borough: Police Chase (Preview) | `794a8ca9eba92af4876c4091eebd4ef585181074` | needs-manual (old retained): Help/paused dialog blocked native drive capture. | `assets/thumbs/slipstreamboroughpolicechasepreview.jpg` | 14976 |
| 117 / 226 | Foldwild: Open-World RPG (Preview) | `d11a1e3a026c7a49119eebfb68ce2e8986410e18` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/foldwildopenworldrpgpreview.jpg` | 68379 |
| 118 / 227 | Steal a Footballer for Your Team | `96a7a23ef4534fa300f4b147581b6943aa17924e` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/stealafootballerforyourteam.jpg` | 86479 |
| 119 / 229 | Night Shift | `1f2875b3021e14b25763af988e257744e413d1e8` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/nightshift.jpg` | 32063 |
| 120 / 228 | Borough Run | `15fb5633a873ec57bfd2828e89abf8e5031920e0` | needs-manual (old retained): Start/busted overlay; no reviewed unobstructed play. | `assets/thumbs/boroughrun.jpg` | 8724 |

### Batch 25

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 121 / 230 | Blackout | `1d3e8212bdb6f3bd2a0ac25249df7340e2120d32` | needs-manual (old retained): No WebGPU adapter available after Start bot match. | `assets/thumbs/blackout.jpg` | 8561 |
| 122 / 231 | Getaway | `0ce7d8a50b6be7ac71c479ff74c7f5586bfcb7df` | needs-manual (old retained): No WebGPU adapter available. | `assets/thumbs/getaway.jpg` | 4905 |
| 123 / 232 | Wings | `f8b4f06e6dd62100e6d24ccbbdda7fb431a4d297` | needs-manual (SVG fallback): Flight menu then screenshot timeout; no reviewed flight. | `assets/thumbs/wings.jpg` | 0 |
| 124 / 233 | Server Survival | `12480ad53c9f869388cc3585affc0cd8e0eb317f` | needs-manual (old retained): Native start/tutorial/tool interaction timed out. | `assets/thumbs/serversurvival.jpg` | 16198 |
| 125 / 234 | Astray | `cace297ecb1a6a24ec81ad155cde3acf01edbe3e` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/astray.jpg` | 63467 |

### Batch 26

| Index / ID | Game | Source tree | Capture status | Output file | Bytes |
| --- | --- | --- | --- | --- | ---: |
| 126 / 235 | Below the Obvious | `faeeeab1eb4c34a203a5c252ce1e5e348175eaa4` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/belowtheobvious.jpg` | 62586 |
| 127 / 240 | JANKOLOCK | `b15cff44b576881444a20faf39f054621ee2ccdf` | captured: Native gameplay/board visually reviewed. | `assets/thumbs/jankolock.jpg` | 80620 |

## Milestones and storage

- `84381e6`: test: add fresh five-game thumbnail capture batches
- `18aced7`: feat: refresh first gameplay thumbnail batches at 1280x720
- `6e0981f`: feat: refresh gameplay thumbnails for sweep rows 61-90
- `4f7daad`: feat: refresh gameplay thumbnails for sweep rows 91-127
- `72e3ab1`: feat: refresh gameplay thumbnails for sweep rows 1-60
- `fa4912e`: feat: map dedicated variant captures and guard bounded retries

The receipt commit follows these milestones; see Git history.
Initial root free space: **3,028,447,232 bytes**. At receipt generation: **3,004,395,520 bytes**. Browser scratch/contact sheets were RAM-backed; no sparse changes or deletions outside the repository. No guard waiver was needed. Filesystem-wide delta is not exclusive per-process accounting. Final exact storage and clean-status checks are reported at handoff.

## v3.1 manual-capture continuation

### Batch 1: weakest/fallback cards

**0 accepted, 5 still needs-manual; 47 of the original 52 await this continuation.**
The v3 table above is historical and unchanged. This section records new attempts,
not automatic acceptance or a replacement full-game gate. Receipt:
[thumb-sweep-v3.1.json](thumb-sweep-v3.1.json).

Read all five current maintenance pages before attempting them and confirmed the
Git inventory was current before this continuation. Used
`scripts/capture_thumb_manual.py`, the existing immutable-HEAD blob server and
pinned `/usr/bin/chromium`. One browser, sequential fresh contexts, full
1280x720 viewport; only native mouse/keyboard input. No game code/state/clock
changes, remote assets, sparse expansion, browser download or catalog edits.
Browser and server closed after these five. Each game had a hard 180s deadline
including review/idle time; Balatro exhausted it, others stopped earlier.
Candidates were visually inspected; no rejected bytes replaced old art/fallbacks.

| ID | Game | v3.1 status | Reason |
| --- | --- | --- | --- |
| 221 | Balatro | needs-manual, fallback retained | Z selects A: Play, Down, Z starts deck, Z selects Small Blind. Reached one dealt card, but subsequent complete-hand screenshots repeatedly timed out; 180s deadline reached. |
| 220 | Duck Hunt | needs-manual, fallback retained | Black blank canvas after click/P; known missing renderer chunks remain a source blocker. |
| 215 | Asteroids | needs-manual, fallback retained | Native thrust/fire and pause/resume attempted. Black-on-near-black source vector art remains unreadable; no fabricated brightening. |
| 204 | Hearts Classic | needs-manual, old art retained | Incoherent white page with missing cards/styles, unchanged after native New Game. |
| 136 | Merge Cats Defender | needs-manual, old art retained | Loader stuck at 98% after waits, click and Enter; never reached battlefield. |

The earlier interrupted continuation reached Ovo gameplay but its unpromoted RAM
candidate was gone after recovery; no permanent image change or new acceptance
is claimed for that attempt. Its frame must be recaptured. The earlier Run 3
and Gladihoppers failures remain holds. Wings remains unattempted here; coordinate
with the separate flight-capture worker before using another browser slot.

### Storage interruption and verification

Latest operator recovery was followed by a fresh **3,295,723,520 bytes free**
reading. At batch close this had fallen to **2,156,474,368 bytes**, only
**8,990,720 bytes above the 2 GiB floor** (filesystem-wide decrease
**1,139,249,152 bytes**, not exclusive capture accounting). All browser/candidate
scratch was RAM-backed; there were zero thumbnail writes. Active backup staging
`rsync` was observed. Stopped before another batch, saved only this small safe
receipt, and filed ticket `pi-215950-1792754988896-e6f7da46`. No waiver granted
or used; awaiting sustained operator recovery rather than polling disk.

`--refresh` printed `Inventory: 132 games, 127 registered; shared runtime separate.`
and left the inventory/index byte-identical; the combined refresh/check command
then timed out at 30s, so that command is not claimed as a completed checker pass.
A subsequent standalone checker completed with
`PASS: 132 game documents cover 127 registered + 5 unregistered games; Git inventory current.`
The manual-session self-test also passed its 180s monotonic deadline check.
No full-fleet smoke, publication or push; no game added or removed.

### Batch 2: resumed after operator storage recovery

**4 accepted / 5 attempted.** Running continuation: **4 captured, 6 needs-manual,
42 not yet attempted.** [Native actions, source hashes and image receipt](thumb-sweep-v3.1/batch-02.json).
CDP `Page.captureScreenshot` now uses the same browser session, no extra slot.
Read each manual before play; immutable HEAD source and 180s deadline unchanged.
All accepted frames visually reviewed at 1280x720 before replacing mapped JPGs.
Ovo's original monochrome game was not recolored; the other accepted frames have
real colored boards/scene content. Geometry Dash's missing player/death-only
frames were rejected. Browser/server released after five games. Free space at
close: **3,084,365,824 bytes**. No catalog or game-source edits.

| ID | Game | v3.1 status | Native route / reason |
| --- | --- | --- | --- |
| 160 | Pacman | captured | Wait for audio readiness, N, arrows. Active maze, ghosts, score 20, no countdown. |
| 213 | Gomoku | captured | Select native two-player mode; seven alternating moves visible on board. |
| 7 | Ovo | captured | Play, right arrow, Up jump. Visible level-one player/platforms and running timer; original monochrome art. |
| 233 | Server Survival | captured | Start Survival, Skip Tutorial, place firewall, Play. Real grid/service and reduced budget, no overlay. |
| 66 | Geometry Dash Lite | needs-manual, old art retained | Stereo Madness scenery/progress rendered but player absent between death explosions after native Space/click. No representative player frame accepted. |

### Batch 3: native controls recovered from manuals

**5 accepted / 5 attempted.** Running continuation: **9 captured, 6 needs-manual,
37 not yet attempted.** [Actions/source/output receipt](thumb-sweep-v3.1/batch-03.json).
Fresh manual-first native play, same pinned browser and 180s limit. Browser/server
closed after five. Free space **3,037,093,888 bytes** before promotion. No game or
catalog changes. Qix remains the real incomplete JIX prototype, not the catalog's
claimed territory game; showing its actual visible trail does not fix those
mechanics or close its maintenance hold. Cookie currency/HACKED label are native
source behavior, not injected progress.

| ID | Game | v3.1 status | Native route |
| --- | --- | --- | --- |
| 52 | Stranded In Isekai | captured | Held Space, arrows, dialogue advances; village player, scene and HUD. |
| 90 | Cookie Clicker Hacked | captured | Cookie clicks and native building purchases; real running cookie/building scene. |
| 211 | Cribbage | captured | Pick low card, accept, wait for full deal, select two crib discards; real hand and peg board. |
| 200 | Achtung die Kurve | captured | Type two player names, native key-pair selection, Start, steer both colored curves. |
| 161 | Qix | captured | Native arrows trace a visible path with the player inside the field; original JIX prototype. |

### Batch 4: emulator gameplay, not title art

**4 accepted / 5 attempted.** Running continuation: **13 captured, 7 needs-manual,
32 not yet attempted.** [Actions/source/output receipt](thumb-sweep-v3.1/batch-04.json).
Read all five manuals; native Enter/Z/X/arrows only. No ROM, emulator settings,
save-state, timing or progress injection. CDP captured the real full viewport.
Game/ROM rights holds remain unchanged. Browser/server released after five;
free space **3,031,678,976 bytes** before promotion.

| ID | Game | v3.1 status | Native route / reason |
| --- | --- | --- | --- |
| 121 | Sonic Advance | captured | Enter/Z through title/character menus; move/jump in Neo Green Hill with live HUD. |
| 120 | Kirby Amazing Mirror | captured | File 1/start, X exits copy tutorial, move/jump; Kirby team and gameplay HUD visible. |
| 117 | Mario Kart Super Circuit | captured | 50cc/Mushroom Cup via Z; held Z accelerates during live lap-one Peach Circuit race. |
| 115 | Street Fighter II | captured | Arcade/Normal/Ryu via native keys; moving/attacking in live Ryu versus T.Hawk bout. |
| 116 | Advance Wars | needs-manual, old art retained | Name confirmed and Field Training reached, but lengthy intro dialogue did not reach a playable turn within the 180s allowance. |

### Batch 5: driving cards and source-blocked loaders

**2 accepted / 5 attempted.** Running continuation: **15 captured, 10 needs-manual,
27 not yet attempted.** [Actions/source/output receipt](thumb-sweep-v3.1/batch-05.json).
Manuals read, native clicks/keys only, same real viewport and deadline; five-game
browser/server released. Free space **3,028,369,408 bytes** before promotion.
Drift Boss is actual interactive driving training, not a main-menu/promotional
car frame or evidence of an endless-run completion. The snapshot shows a live
steered car with the game's original tutorial instructions. No text was hidden.

| ID | Game | v3.1 status | Native route / reason |
| --- | --- | --- | --- |
| 225 | Slipstream Borough preview | captured | Start, Got it, click scene for focus, hold Up. Unobstructed city driving and changing distance/speed HUD. |
| 228 | Borough Run | needs-manual, old art retained | Play/Start, E and Up reached start/busted overlays, not reviewed unobstructed driving; known overlay stylesheet hold remains. |
| 87 | Doge Miner | needs-manual, old art retained | Loading modal persists; Start remains hidden after waits/click/Enter. Known main.js parser blocker unchanged. |
| 81 | Drift Boss | captured | Click Play, continue booster guidance, Start Drift, held/released Space; live steering tutorial car on original track. |
| 80 | Bloons TD | needs-manual, old art retained | Native hub link to BTD4, skip intro, New Game, beginner/Easy. New-tower popup persisted during placement/start attempts, no active-wave capture. Other three hub children not claimed playable. |

### Batch 6: Flash movies

**1 accepted / 5 attempted.** Running continuation: **16 captured, 14 needs-manual,
22 not yet attempted.** [Actions/source/output receipt](thumb-sweep-v3.1/batch-06.json).
Manuals read; native input only. Heavy movies remained serial. Five-game
browser/server closed; free space **2,836,684,800 bytes** before promotion.
Fancy Pants preserves its original mostly grey hand-drawn room, blue bed and
orange pants; no recoloring or compositing. Its active player movement/jump
frame passed the image guard and visual review, unlike the rejected loaders.

| ID | Game | v3.1 status | Native route / reason |
| --- | --- | --- | --- |
| 53 | Papa's Pizzeria | needs-manual, old art retained | Continue, Start, save slot/name and station guidance reached restaurant opening, but no order or pizza-making moment before remaining budget ran out. |
| 57 | Fleeing the Complex | needs-manual, old art retained | Loader only about quarter-full after waits/click/Enter; no branching choice reached in bounded attempt. |
| 58 | Infiltrating the Airship | needs-manual, old art retained | Operation setup preloader advanced slowly; no actual infiltration choice reached after waits/click/Enter. |
| 63 | Fancy Pants Adventure 3 | captured | Click/keys past loader, Up advances intro dialogue, arrows/S move/jump in the actual starting room. |
| 123 | Crush the Castle | needs-manual, old art retained | Native Run anyway acknowledged compatibility warning; subsequent click/Space produced black frame, not siege gameplay. |

### Batch 7: puzzle/platformer and hacked cats

**3 accepted / 5 attempted.** Running continuation: **19 captured, 16 needs-manual,
17 not yet attempted.** [Actions/source/output receipt](thumb-sweep-v3.1/batch-07.json).
Manual-first native play and 180s cap unchanged. Browser/server closed after five;
free space **2,834,513,920 bytes** before promotion. Vex's preliminary finish text
said it had not reached play; final visual review corrected that because the
last candidate really shows the player, hub platforms, coin and running HUD.
The receipt preserves the preliminary note and explicit review correction.

| ID | Game | v3.1 status | Native route / reason |
| --- | --- | --- | --- |
| 8 | Run 3 | needs-manual, old art retained | Click/Enter/Space left warning triangle on black canvas; boot still fails. |
| 62 | Cut the Rope | captured | Native Play/intro skip; actual level-one candy, rope, stars and Om Nom board. Click attempted, no solved-level claim. |
| 60 | Temple Run 2 | needs-manual, old art retained | Imangi/dots loader remained after waits/click/Space; no running scene. |
| 64 | Vex 7 | captured | Wrapper Play, game Play, native right/jump. Final frame reached real playable hub with player/platforms/HUD. |
| 137 | Merge Cats Defender Hacked | captured | Stage 1, squad Start, deploy Boxing cat. Wave-one enemies and cat visible. Source cheat badge/currency preserved. |

Only an image-path alias changed in `assets/portal-ux.js`: hacked cats now maps
to `assets/thumbs/mergecatsdefenderhacked.jpg`, avoiding mislabeling the base game
with the native HACKED badge. Base cats art remains untouched. `games.json`
unchanged. Alias regression and `node --check assets/portal-ux.js` pass; portal
maintenance guide updated. No game source or rendered game state changed.

### Batch 8: Unity gameplay via CDP

**3 accepted / 5 attempted.** Running continuation: **22 captured, 18 needs-manual,
12 not yet attempted.** [Actions/source/output receipt](thumb-sweep-v3.1/batch-08.json).
Five manuals read; same pinned single Chromium/real viewport/native controls,
180s hard cap. CDP succeeded where older Playwright screenshots had timed out.
Browser/server closed after five. Free space **2,831,757,312 bytes** before promotion.
Original dark palette in Dawn and portrait pillarboxing in BitLife were retained,
not brightened, cropped or stretched. Gladihoppers is active movement training,
not a claim to a completed fight/career.

| ID | Game | v3.1 status | Native route / reason |
| --- | --- | --- | --- |
| 56 | 10 Minutes Till Dawn | captured | Play, default Shana/Revolver, Play, movement/click; real survival player/enemies/HUD and countdown. |
| 49 | BitLife | captured | New Life, Age; generated character's life events and changing stats, no splash/menu. |
| 47 | Gladihoppers | captured | Trainer check/Enter/Space and WASD attempt; active movement-training arena with gladiator, trainer modal closed. |
| 48 | Burrito Bison | needs-manual, old art retained | Reached ring launch tutorial through native Start/intro clicks, but did not perform the required pull/release gesture before budget ran out. No launch/distance capture accepted. |
| 59 | Baldi's Basics | needs-manual, old art retained | Warning/Start reached mode panel, but upper game content clipped above viewport and bottom half empty; no visually sane play capture. |

### Batch 9: runner gameplay and first Super Hot encounter

**3 accepted / 5 attempted.** Running continuation: **25 captured, 20 needs-manual,
7 not yet attempted.** [Actions/source/output receipt](thumb-sweep-v3.1/batch-09.json).
Manuals read; same 180s hard deadline/native-only input/single pinned Chromium.
Browser/server closed after five. Free space **2,829,807,616 bytes** before
promotion. Subway's delay exhausted its deadline; no retry extends that budget.
No advertising consent was granted, backend enabled or game state injected.

| ID | Game | v3.1 status | Native route / reason |
| --- | --- | --- | --- |
| 50 | Subway Surfers | needs-manual, old art retained | Loaded to birth selector and advertising-consent prompt, not a run, before the 180s deadline. |
| 111 | Subway Surfers Hacked | needs-manual, old art retained | Birth selector then blocking advertising-consent prompt; unchecked OK did not continue. No ad consent enabled. |
| 86 | Jetpack Joyride | captured | Wait for local decoding, center-click start, Space; real player, scrolling hazards/coins and 266m HUD. |
| 107 | Jetpack Joyride Hacked | captured | Same native route; live 315m scene with original HACKED badge. No claim that unlimited coins/invincibility work. |
| 55 | Super Hot | captured | Native click/W/Space progressed encounter; red enemy shattering against cubes, crosshair, no title text. |

The hacked Jetpack image gets its own `jetpackjoyridehacked.jpg` image-path alias,
not the normal variant's new capture. Alias regression and JS syntax passed;
portal manual updated. `games.json`, game sources and safety policies unchanged.

### Batch 10: remaining football/GBA/Blackout holds

**0 accepted / 5 attempted.** Running continuation: **25 captured, 25 needs-manual,
2 not yet attempted.** [Actions/source/output receipt](thumb-sweep-v3.1/batch-10.json).
Read all manuals; native-only input, no movie/save-state skips or renderer mocks.
Browser/server closed, including an early session release after normal Retro Bowl.
Future native mouse clicks now hold down for 250ms, rather than a zero-duration
press that polling canvas engines may miss. Hacked Retro Bowl still resisted,
so missing click duration is not asserted as its proven root cause. Completed
games were not retried past their 180s budget. Free space **2,828,009,472 bytes**
at batch close; no art changed.

| ID | Game | v3.1 status | Reason |
| --- | --- | --- | --- |
| 54 | Retro Bowl | needs-manual, old art retained | Welcome/Continue did not advance with native clicks/Enter; polling-input limitation possible, cause unproven. |
| 89 | Retro Bowl Hacked | needs-manual, old art retained | Same Welcome/Continue hold after longer clicks and keys; no on-field play. |
| 119 | Mega Man Zero | needs-manual, old art retained | Native Enter/Z progressed long opening dialogue to Zero's awakening cutscene, but no controllable gameplay before hard deadline. |
| 118 | Metroid Fusion | needs-manual, old art retained | Native title/file/start keys reached narrated space introduction, not controllable Samus play. |
| 230 | Blackout | needs-manual, old art retained | Native Start bot match reports `No WebGPU adapter is available on this device.` |

### Batch 11: remaining renderer-dependent cards

**0 accepted / 2 attempted. Final continuation: 25 captured, 27 needs-manual;
all original 52 attempted.** [Actions/source/output receipt](thumb-sweep-v3.1/batch-11.json).
Both manuals read. No sibling downloaded/system Chromium was active before the
session; one browser and one heavy game at a time. Browser/server closed after
two. Free space **2,827,595,776 bytes** at close. Old art/fallbacks unchanged.

| ID | Game | v3.1 status | Reason |
| --- | --- | --- | --- |
| 231 | Getaway | needs-manual, old art retained | Boot reports no WebGPU adapter. Native disclosure/restart attempt did not produce driving; restart click timed out. |
| 232 | Wings | needs-manual, SVG fallback retained | Native Solo flight failed closed: `Unsupported renderer (webgl2, low): First scene draw timed out`. No visible flight or mocked renderer frame accepted. |

### v3.1 final outcome

Across v3 plus this continuation, **100 of 127 games now have accepted fresh
captures; 27 still need manual capture**. The four original SVG fallbacks remain:
Asteroids, Duck Hunt, Balatro and Wings. No title/menu/loader/error image was
promoted to fill those gaps. Accepted training frames are playable scene input,
not a claim of full-game acceptance. Existing source, offline, rights, hardware
and release holds remain; no game was added, ingested or self-made in this work.

Each of the 52 rows has its source-tree hash, native actions, timing, errors and
candidate hashes in the receipts linked above. Accepted rows include final
runtime output hashes; rejected rows preserve old bytes/fallbacks. The original
v3 JSON/table remains historical. Two variant image aliases alone changed in
the authored portal layer; no `games.json` or game-source edits, push or full
fleet smoke. Final verification/storage/commit summary follows below.

### Final verification and initial storage interruption

Actual completed commands:

```text
python3 -B scripts/check_thumb_manual_receipts.py
PASS: 52 attempts, 25 accepted 1280x720 JPEGs, 27 retained images/fallbacks; current source hashes and all 127 catalog URLs unchanged.
Max recorded duration: 180.02s (180s input deadline plus receipt bookkeeping).
python3 -B scripts/capture_thumb_manual.py --self-test
PASS: monotonic 180s deadline and uncaught budget exception
python3 -B scripts/capture_thumb_sweep_v3.py --self-test
PASS: retry record preservation, URL guards, sparse HEAD blob identity, genuine missing-file HTTP 404
python3 -B scripts/capture_game_thumbs.py --self-test
thumbnail guard self-test: PASS (local path, HTTP 200, aliases, duplicate, blank)
python3 -B scripts/check_maintenance_docs.py --refresh
Inventory: 132 games, 127 registered; shared runtime separate.
python3 -B scripts/check_maintenance_docs.py
PASS: 132 game documents cover 127 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

JS syntax and final owned whitespace checks passed. Refreshed inventory/index
remain byte-identical because no game source/catalog changed. Direct Git diff
confirms `games.json` and **all `Games/` source bytes unchanged**. Sparse selection
remains `assets`, `docs`, `scripts`; no checkout expansion/install/download.
The 25 accepted runtime JPGs total **2,174,174 bytes**, including two dedicated
variant files. They are the retained reviewed screenshots; no extra artwork or
old-image transformation was substituted. Rejected art/fallback hashes match v3.

Fresh portal-only desktop/mobile light/dark alias proof was attempted after the
capture/receipt checks. It stopped at the initial disk guard **before launching
Chromium or its server**:

```text
RuntimeError: storage STOP: 1858351104 bytes free, below 2147483648
```

At that checkpoint portal visual/alias browser verification was **HELD**, not
passed; no new portal screenshots existed. The completed recovery proof below
supersedes only this portal hold, not the 27 per-game capture holds. Earlier v3
screenshots remain historical. All owned capture browsers/servers were confirmed
closed. No full-fleet smoke/release gate or push.

Earlier capture-resume free space: **3,278,110,720 bytes**; blocked pre-proof reading:
**1,858,351,104 bytes**; shared-filesystem decrease **1,419,759,616 bytes**.
This is not exclusive capture disk accounting. No waiver used; no outside-repo
deletion. Stopped captures/growth and filed ticket
`pi-215950-1792769692209-5a601105` for sustained recovery. Only safe final
receipt/docs/checker cleanup committed after the guard. No capacity polling.

Continuation milestones (all local, no push):

| Commit | Scope |
| --- | --- |
| `21c97b0` | Bounded native manual capture helper |
| `19b7087`, `3d6901a` | Batch 1 failures/storage receipt and completed maintenance check |
| `b3260be` | Same-session CDP screenshots |
| `7434241` | Batch 2: four images |
| `1f32748` | Batch 3: five images |
| `043bdaa` | Batch 4: four images |
| `19757eb` | Batch 5: two images |
| `1ec8f7a` | Batch 6: one image |
| `43c5600` | Batch 7: three images, dedicated hacked-cats alias |
| `40ffd1f` | Batch 8: three images |
| `30057c4` | Batch 9: three images, dedicated hacked-Jetpack alias |
| `c2b570d` | Batch 10: native click duration and five holds |
| `38765cf` | Batch 11: final two renderer holds |
| `3377abf` | Read-only 52-row receipt/source/image regression |

Final docs/cleanup commit `8500ea7` follows this table. No games added, registered
or removed, and no ingestion or self-made build commits in this run.

### Final portal sanity proof after storage recovery

Operator escalation batch 77 restored storage. Fresh entry reading:
**2,417,848,320 bytes free**, above the normal 2 GiB guard. No below-floor waiver
was used. The focused portal probe tested source `8500ea7` with the existing
Git-backed server, pinned `/usr/bin/chromium`, fresh contexts and RAM-backed
browser/screenshot scratch. Native theme/search controls showed both pairs of
normal/hacked cards; eager image loading was used only to check portal asset
coverage. No game was relaunched, recaptured or changed. Browser and server closed
in `finally`; no owned Chromium remained afterward.

Actual output:

```text
desktop light PASS 127 cards,123 images,4 fallbacks; both aliases200/1280x720; no overflow/pageerrors/external
desktop dark PASS 127 cards,123 images,4 fallbacks; both aliases200/1280x720; no overflow/pageerrors/external
mobile light PASS 127 cards,123 images,4 fallbacks; both aliases200/1280x720; no overflow/pageerrors/external
mobile dark PASS 127 cards,123 images,4 fallbacks; both aliases200/1280x720; no overflow/pageerrors/external
```

**4/4 cases passed; all eight fresh screenshots visually reviewed.** The two
new aliases resolve to their own 1280x720 JPGs, not the base game's image. Normal
Merge Cats still shows its deliberately retained old loader art: that game remains
needs-manual, not a newly accepted capture. Both themes have readable titles and
controls; mobile crops are the existing shelf treatment, with no page overflow.
No recoloring, replacement art or layout changes were introduced by this proof.

All cases had zero broken image elements, zero page errors and zero external
requests. Each recorded the four expected missing-JPG 404s for Asteroids, Duck
Hunt, Balatro and Wings, then retained their fallbacks. This is not a claim of
zero console/resource errors or full-fleet gameplay/release acceptance.

[Machine receipt and screenshot hashes](thumb-sweep-v3.1/portal/results.json).

| View | Jetpack pair | Merge Cats pair |
| --- | --- | --- |
| Desktop light, 1280x720 | [Screenshot](thumb-sweep-v3.1/portal/desktop-light-jetpack.jpg) | [Screenshot](thumb-sweep-v3.1/portal/desktop-light-cats.jpg) |
| Desktop dark, 1280x720 | [Screenshot](thumb-sweep-v3.1/portal/desktop-dark-jetpack.jpg) | [Screenshot](thumb-sweep-v3.1/portal/desktop-dark-cats.jpg) |
| Mobile light, 390x844 | [Screenshot](thumb-sweep-v3.1/portal/mobile-light-jetpack.jpg) | [Screenshot](thumb-sweep-v3.1/portal/mobile-light-cats.jpg) |
| Mobile dark, 390x844 | [Screenshot](thumb-sweep-v3.1/portal/mobile-dark-jetpack.jpg) | [Screenshot](thumb-sweep-v3.1/portal/mobile-dark-cats.jpg) |

The 52-game outcome remains **25 refreshed / 27 needs-manual**, combined with v3
**100/127 fresh accepted captures**. This follow-up changes documentation/evidence
only. No game/catalog/runtime changes, dependency installation, outside-repo
deletion, full-fleet smoke or push. Previous storage ticket
`pi-215950-1792769692209-5a601105` is superseded by the operator recovery and this
completed proof. The 52-row receipt check, maintenance refresh/check and JS syntax
check passed again. Screenshot validation printed
`PASS: four portal cases and eight screenshot dimensions/hashes`.
The inventory remains source-current and byte-identical; final storage and clean
Git status are reported at handoff.

### Operator-resumed bounded retries: batch 1

The operator supplied raw CDP screenshot guidance and a headed Xvfb fallback.
Retries preserve the **same cumulative 180s/game budget**, not a new allowance.
The tool now loads and updates a RAM budget ledger, sets a fractional remaining
`ITIMER_REAL` deadline, and captures via native `Page.captureScreenshot` with
`format: jpeg`, `quality: 80`, `captureBeyondViewport: false`. This batch used
headed `/usr/bin/chromium` under Xvfb, retaining the existing software-GL flags.
No game state, save, renderer or source was patched. Browser/server released at
five games. Fresh resume free space **2,980,159,488 bytes**; batch-close free
space **2,979,667,968 bytes**. No waiver or outside-repo deletion.

**1 accepted / 5 retried; latest total 26 refreshed, 26 needs-manual.**
[Chained timing/source/image receipt](thumb-sweep-v3.1/retry-01.json).

| ID | Game | Prior / retry / cumulative seconds | Latest status |
| --- | --- | --- | --- |
| 54 | Retro Bowl | 121.56 / 58.44 / 180.00 | needs-manual: Welcome still did not reach field before deadline |
| 89 | Retro Bowl Hacked | 108.04 / 9.35 / 117.39 | needs-manual: New Career setup reached, no field |
| 136 | Merge Cats Defender | 138.04 / 32.28 / 170.32 | captured: native Play, Stage 1, Start and Boxing deployment; Wave 1 HUD, deployed unit and enemy entering |
| 66 | Geometry Dash Lite | 95.00 / 32.63 / 127.63 | needs-manual: level scenery but absent player again |
| 232 | Wings | 98.83 / 49.11 / 147.94 | needs-manual: headed Low WebGL2 still fails first scene draw |

Only `assets/thumbs/mergecatsdefender.jpg` was replaced after visual/image-guard
acceptance; hacked cats keeps its dedicated image. The earlier portal proof at
`8500ea7` remains a dated proof of the prior base image, not evidence that this
new capture was already browser-reviewed there. The read-only receipt checker
now validates retry timing chains and the latest output for each of the same 52
games. Actual output:

```text
PASS: 52 games, 57 attempts, 26 accepted 1280x720 JPEGs, 26 retained images/fallbacks; cumulative budgets, current source hashes and all 127 catalog URLs unchanged.
```

### Operator-resumed bounded retries: batch 2

Five bounded openings (three for hacked Retro Bowl, one per Henry movie) used the
same headed/raw-CDP setup. Browser/server released after five; **no images
promoted**. [Complete timing chain](thumb-sweep-v3.1/retry-02.json).
Hacked Retro Bowl reached New Career and home management, then Get Ready/Kick Off,
but never a reviewed active-player match. Its final short opening stopped at
uniform selection. Countdown/setup frames were rejected, not called gameplay.
The two Henry movies remained in their animated preloaders, not branching choices.

| ID | Attempt seconds | Cumulative seconds | Latest status |
| --- | ---: | ---: | --- |
| 89 | 25.12 | 142.51 | needs-manual, management/tutorial only |
| 89 | 17.67 | 160.18 | needs-manual, Get Ready/Kick Off only |
| 89 | 15.55 | 175.73 | needs-manual, uniform selection only |
| 58 | 92.25 | 172.88 | needs-manual, operation setup loader |
| 57 | 27.57 | 149.28 | needs-manual, preloader |

Total remains **26 refreshed / 26 needs-manual**. Checker passes **52 games,
62 attempts**, chained cumulative budgets and current source/output hashes.
Free space at batch close: **2,978,430,976 bytes**. No game/catalog edits or push.

### Operator-resumed bounded retries: batch 3 and disposition

[Five final headed attempts](thumb-sweep-v3.1/retry-03.json), browser/server
released after five; **no replacements**. Rejected frames were visually reviewed.

| ID | Game | Retry / cumulative seconds | Latest hold |
| --- | --- | --- | --- |
| 60 | Temple Run 2 | 48.46 / 171.98 | title/Take the Idol loader at 99%, not running |
| 80 | Bloons TD | 22.45 / 175.50 | BTD2 Ninja Kiwi boot logo, not an active round |
| 123 | Crush the Castle | 17.63 / 57.80 | black canvas after native Ruffle start controls |
| 59 | Baldi's Basics | 18.69 / 169.66 | vertically clipped Unity splash, not classroom gameplay |
| 228 | Borough Run | 14.96 / 40.54 | Start overlay still covers the dimmed playfield; missing guessed `#play` selector was not retried, visible Start/Equip inputs did not clear overlay |

Free space at batch close: **2,982,760,448 bytes**. Remaining original holds
were not pointlessly rebooted for a screenshot-method change:

- **Budget/intro limits:** 221, 50, 111 and 119 exhausted their original 180s
  allowance; 116 and 53 have about 4s and 6s left; 48 and 118 have about 18s and
  24s, shorter than their observed cold boot plus launch/introduction path.
- **Existing source/content failures:** 220 missing renderer chunks, 204 absent
  cards/incoherent stylesheet, 87 main-script parse blocker, 8 boot failure;
  215 retains unreadable black-on-near-black original art, with recoloring banned.
- **Host capability:** 230 and 231 report no WebGPU adapter. A different screenshot
  transport cannot supply a renderer. No flags, sources or renderer checks were
  weakened to manufacture gameplay.

This resume made **15 bounded openings across 12 previously held games**, not a
fresh 180s allowance per opening. One new capture (136), 11 retried games still
held, and the other 15 original holds preserved for the reasons above. Latest
outcome: **26/52 refreshed, 26/52 held; combined v3/v3.1 101/127 fresh accepted
captures**. No games added, registered or source-patched. The later checker also
rejects negative retry time, reopening an exhausted budget and any intermediate
retry above 180.15s including receipt bookkeeping.

### Fresh portal proof after normal-cats capture

Tested source **`67fdec7`**, pinned `/usr/bin/chromium`, bounded server/browser
closed normally. [Receipt](thumb-sweep-v3.1/retry-portal/results.json) records the
new base image SHA-256 and all four cases. All four screenshots were visually
reviewed: normal and hacked variants are distinct, the new deployed cat remains
visible at card scale, text/buttons remain legible, and mobile layout does not
overflow. No new dependencies, remote loads, source or catalog changes.

| View | Current cats pair |
| --- | --- |
| Desktop light, 1280x720 | [Screenshot](thumb-sweep-v3.1/retry-portal/desktop-light-cats.jpg) |
| Desktop dark, 1280x720 | [Screenshot](thumb-sweep-v3.1/retry-portal/desktop-dark-cats.jpg) |
| Mobile light, 390x844 | [Screenshot](thumb-sweep-v3.1/retry-portal/mobile-light-cats.jpg) |
| Mobile dark, 390x844 | [Screenshot](thumb-sweep-v3.1/retry-portal/mobile-dark-cats.jpg) |

**4/4 PASS:** 127 catalog cards, 123 loaded images, four known image fallbacks,
zero broken image elements, overflow, page errors or external requests. Dedicated
hacked aliases still resolve to 1280x720 images. Expected four thumbnail 404s
remain asteroids, duckhunt, balatro and wings. Validation printed:

```text
PASS: four current portal cases and screenshot hashes/dimensions; new base image hash matches.
```

The receipt regression passes **52 games, 67 attempts, 26 accepted, 26 retained**;
maintenance refresh/check passes **132 documents, 127 registered + 5 unregistered**,
with inventory/index unchanged. Capture-helper self-tests, JS syntax and whitespace
checks pass. These are thumbnail/portal checks, not full-fleet gameplay or release
acceptance. No games added (ingested or self-made), registration, full-fleet smoke,
publication or push. All 15 additional openings and remaining holds are documented
above; storage stayed above the normal 2,147,483,648-byte floor without a waiver.
Proof-copy free space was **2,992,181,248 bytes**; final Git state/storage follows
in handoff. Earlier historical reports and rejected art remain intact except for
the one accepted normal-cats replacement.

### Storage-recovered resume: retry batch 4

Operator requested capture resumption after disk recovery. Measured free space
**3,281,108,992 bytes** before work and **3,280,850,944 bytes** after the batch.
No backup tarballs/bundles, installs or source changes. The existing RAM ledger
matched all committed latest cumulative times before use. Headed system Chromium
under Xvfb retained software-GL flags and raw CDP screenshot settings. Five games,
browser/server closed; **no accepted replacements**. [Receipt](thumb-sweep-v3.1/retry-04.json).

| ID | Game | Prior / retry / cumulative seconds | Visual review |
| --- | --- | --- | --- |
| 215 | Asteroids | 20.79 / 11.33 / 32.12 | black vectors remain unreadable on near-black background; no recoloring |
| 204 | Hearts Classic | 25.45 / 19.84 / 45.29 | New Game intercepted by settings layer; native Back succeeds, but scattered bare ranks on white remain unusable |
| 220 | Duck Hunt | 18.74 / 6.54 / 25.28 | black canvas; `Loading chunk 369 failed` |
| 87 | Doge Miner | 50.86 / 14.88 / 65.74 | `Invalid or unexpected token`; intro loader, no mining |
| 8 | Run 3 | 24.22 / 15.28 / 39.50 | starfield/bootstrap, not runner/tunnel gameplay; no page error yet, bounded follow-up warranted |

All five images were visually reviewed and rejected. Totals remain **26 refreshed,
26 held, 101/127 accepted fresh overall**. Receipt regression passes **52 games,
72 attempts**, preserving original output hashes for every held game. Remaining
budgets were not reset by the storage-resume order. The earlier portal proof
still applies to unchanged runtime images; this batch does not establish another
portal or full-fleet gameplay pass.

### Run 3 bounded follow-up and capture-only closure

[Retry batch 5](thumb-sweep-v3.1/retry-05.json) contains **one opening**, not a
fresh time allowance: **39.50 prior + 85.75 retry = 125.25 cumulative seconds**.
The initially promising starfield becomes a warning triangle on black. Current
browser error confirms the historical startup failure:

```text
Unexpected non-whitespace character after JSON at position 152 (line 2 column 1)
```

Native Enter/click/Space did not reach a tunnel or runner. Clicking the warning
then inspecting the body returned `Locator.inner_text: Timeout 2000ms exceeded`
while waiting for `body`. This is an inspection timeout, not proof of a repaired
engine or a second gameplay state. The warning frame was visually reviewed and
rejected; old image unchanged. Browser/server closed normally. No JSON, CSS,
script, renderer or save mutation was used.

Hermes advice ticket **`pi-215950-1792775198907-6d2ed920`** recommends closing the
best-effort capture scope and preserving needs-manual. Advice is not operator
approval for source repair, hardware provisioning, replacement art or resetting
per-game budgets. Repeated disk-only recovery orders do not resolve the now
reproduced source/layout/contrast failures, absent adapter or spent cold-boot
allowances. Further work needs an explicit operator scope decision, not another
blind capture loop.

This storage-resume order added **six openings, zero accepted replacements**.
Latest receipt check: **52 games, 73 attempts, 26 accepted, 26 retained**;
combined fresh total remains **101/127**. All runtime images/catalog/game sources
are unchanged by these six attempts, so the existing four-case portal proof
remains dated evidence for those same bytes, not a newly executed gate. No games
added, source repair, backups, full-fleet smoke, publication or push. Free space
before closing bookkeeping: **3,280,424,960 bytes**, above the normal floor; no
waiver used. Final checks/commit/storage are reported in handoff.

### Answered disposition: closed, no capture restart

The operator confirmed the answered disposition (`reply_ts: 1792775259310`)
and explicitly prohibited further captures. Best-effort capture scope is closed;
all 26 remaining `needs-manual` outcomes are preserved. Source/hardware repair,
replacement art and fresh time allowances remain separate operator decisions.

The original headless attempts and resumed headed/raw-CDP attempts both failed
to produce acceptable gameplay for these five games. Their two-mode failure
notes are retained above and in the original/retry receipts, including the headed
Run 3 warning triangle, JSON error and `Locator.inner_text` timeout waiting for
`body`. No further browser run was made to complete this disposition.

Counts below cover only the storage-resume openings in `retry-04.json` and
`retry-05.json`; cumulative seconds include each game's earlier attempts.

| ID | Game | Resume open count | Resume consumed seconds | Cumulative seconds |
| --- | --- | ---: | ---: | ---: |
| 215 | Asteroids | 1 | 11.33 | 32.12 |
| 204 | Hearts Classic | 1 | 19.84 | 45.29 |
| 220 | Duck Hunt | 1 | 6.54 | 25.28 |
| 87 | Doge Miner | 1 | 14.88 | 65.74 |
| 8 | Run 3 | 2 | 101.03 | 125.25 |

**Total: six opens, 153.62 consumed seconds, zero replacements.** These times
remain spent, not reset. Documentation/check bookkeeping only; no new captures,
runtime changes, backups, games, publication or push. The disposition's operator
decision request is relayed verbatim in handoff; work stops pending that decision.
