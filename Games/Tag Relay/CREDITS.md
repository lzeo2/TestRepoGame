# Tag Relay credits

Adapted from **2 Player Tag Game by Leo B / Hack Club (MIT)**.
This is an ingested game, not an original AI-built game.

- Game: https://github.com/hackclub/sprig/blob/1450c00a43c5ec09d2c4a8971763226ab447829f/games/2-Player-Tag.js
- Game revision: `1450c00a43c5ec09d2c4a8971763226ab447829f`.
- Author header: Leo B; title: 2 Player Tag Game; addedOn: 2025-11-04.
- Game license: MIT, Copyright (c) 2023 Hack Club. See `LICENSE`.
- Unchanged pinned source: `original.js`, 9,480 bytes, SHA-256 `0e77d6300c9bb205cec07df869f1a66b8ff3f0796077d97c43a12eab54222371`.
- Runtime: standalone Sprig **1.0.3**, published gitHead `f2e175fba0020c8a6db964aaf884dc1f1365e26f` (not the game revision).
- Runtime source: https://github.com/hackclub/sprig/tree/f2e175fba0020c8a6db964aaf884dc1f1365e26f/engine
- Runtime archive: https://registry.npmjs.org/sprig/-/sprig-1.0.3.tgz
- Runtime license: separate MIT, Copyright (c) 2023 Hack Club. See `vendor/sprig/LICENSE`.

All 14 maps, five inline sprite bitmaps, the original color palette, and both synthesized tunes are retained. The repository MIT license covers the distributed source; there is no separate asset exception in the game file. Independent asset/font authorship beyond the provided notices is not claimed.

## Local modifications

- New responsive cream/blue shell titled Tag Relay, start/pause/restart, live score/result text, focusable canvas, and independent touch pads using Sprig's normal eight-key input path.
- Replaced the broken 1ms tick-count interval with one owned elapsed-time scheduler: 7-second rounds and 1.5-second breaks. Seven seconds follows the source's comment that desired seconds are multiplied by 100, but is an explicit timing repair, not a measured original duration. The source's 500-tick break was inconsistent; 1.5 seconds is the port's disclosed interround default.
- Clear engine text before each update; remove only the duplicate constructed canvas score text in favor of the labeled HTML Red/Blue score. Preserve point/winner text and Sprig's general text API. Check active/paused state before looking up sprites and guard missing sprites; lock terminal input; stop timers and music on pause, match completion, restart, and page exit.
- Shell panels, fieldsets, and arena outer corners use 6px radii; buttons use 4px. Internal upstream pixel art remains square.
- Hidden documents pause and require explicit Resume. Time hidden or paused does not score.
- Two small Sprig runtime patches: an explicit non-scheduling render for the terminal screen after RAF cleanup, and immediate cancellation/muting of tune delays on `end()` instead of leaving pending sleep timers.
- Local shell fonts reuse the portal's Atkinson Hyperlegible and Bungee assets under `../../assets/fonts/`; upstream pixel art and bitmap text are not recolored.

No Sprig website/editor, Babel, eval, new Function, backend, network multiplayer, room system, or remote runtime load is included. Local two-player play only. Registration and full-portal smoke/release approval belong to Main.
