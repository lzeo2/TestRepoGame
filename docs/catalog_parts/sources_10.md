# Catalog part 10: provenance

Batch 10: two games **ingested** from permissively-licensed open-source
repositories (GPL-3.0 + MIT; LICENSE file shipped in each game folder), three
games **built in-house** because no genuine permissively-licensed offline
candidate met the repo rules. No third-party art, audio files or fonts are
bundled; every visual is flat CSS/canvas drawn by the shipped code, all audio
is synthesized locally, nothing is fetched at runtime.

## Penalty Shootout (Games/PenaltyShootout/) - built in-house

- **Reason:** no genuine permissively-licensed browser penalty-shootout game
  was found. MIT hits were pygame/C++/C# desktop projects or empty repos with
  a LICENSE file only.
- **Implementation:** best-of-5 soccer shootout vs AI: aim tiers plus an
  oscillating power meter, keeper dive AI, sudden death if level after five,
  and you also go in goal. Flat colors, single file, offline-first.

## Archery (Games/Archery/) - ingested

- **Repo:** https://github.com/bibhuticoder/archery-master
- **License:** GPL-3.0 (LICENSE shipped in the game folder, full GPL text)
- **Commit:** 107cbc9b8ff84f3ee53bfac43e26cf5d4b30a78e
- **Taken:** bow/string bezier draw, arrow flight physics (gravity, drag),
  drag-to-draw power (10..100), concentric-ellipse ring target with zone
  scoring, moving target, stuck-arrow trail rendering, power bar, and the
  mouse-position / angle / ellipse hit-test utilities.
- **Modifications:** inlined from 7 files into one; Babel boilerplate removed;
  wind per shot; fixed 10-arrow round with a 15-point win target; start and
  end screens with documented controls; pointer events (touch + mouse) and
  keyboard aiming added; console.log spam removed; score/arrows/wind moved to
  a DOM HUD; target rings scaled up for the fixed 640x500 canvas.

## Mini Golf (Games/MiniGolf/) - built in-house

- **Reason:** no genuine permissively-licensed browser mini-golf game was
  found; MIT search hits were Unity/C projects, and canvas hits had no
  license at all.
- **Implementation:** 6 hand-authored holes, wall + bumper + sand physics,
  stroke counter, par scoring, win by matching or beating par. Flat colors,
  single file, offline-first.

## Curling (Games/Curling/) - built in-house

- **Reason:** no permissively-licensed browser curling game exists; every
  GitHub hit was unlicensed or GPL-3.0 coursework.
- **Implementation:** slide stones down the ice with sweeping-adjusted
  friction, stone-on-stone collisions, curl as stones slow, closest-to-button
  counting per end, three ends vs AI with sudden death if level. Flat colors,
  single file, offline-first.

## Free Throw (Games/FreeThrow/) - ingested

- **Repo:** https://github.com/jeremymartinezq/Basketball-game
- **License:** MIT (LICENSE shipped in the game folder), Copyright (c) 2025
  jeremymartinezq
- **Commit:** 2bf12dc1f9c29c9e2be2b538076d2f2033103d32
- **Taken:** oscillating power meter with green release zone, aim offsets,
  shot physics with release-quality accuracy, 24-second shot clock, DOM ball
  animation, and the score/shots/game-over flow.
- **Modifications:** 10-shot round with a 12-point win target, start screen
  with documented controls, rim bounce physics, flat colors (gradients
  removed), sentence-case labels, 44px touch targets, 360px-safe layout,
  touch preventDefault handling, and a restart key. Single file,
  offline-first, no trackers.
