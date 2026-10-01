# Tag Relay: pinned source and frozen port

Delegation 33 integration only, 2026-10-02 +10:00, on `feat/overnight-games`.
Verified environment: `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`,
`PI_REASONING_LEVEL=high`. No Tag code/test edits or browser rerun in this phase.
This is an ingested local two-player game, not a self-made fallback.

## Source and permission

- Game: **2 Player Tag Game by Leo B / Hack Club**, pinned commit
  `1450c00a43c5ec09d2c4a8971763226ab447829f`.
- Source: https://github.com/hackclub/sprig/blob/1450c00a43c5ec09d2c4a8971763226ab447829f/games/2-Player-Tag.js
- Unchanged `Games/Tag Relay/original.js`: 9,480 bytes, SHA-256
  `0e77d6300c9bb205cec07df869f1a66b8ff3f0796077d97c43a12eab54222371`.
  Compared byte-for-byte with the collected pinned source.
- Full game MIT notice retained in `Games/Tag Relay/LICENSE`, copyright
  (c) 2023 Hack Club; matches the collected repository notice.
- Runtime: standalone compiled Sprig **1.0.3**, published gitHead
  `f2e175fba0020c8a6db964aaf884dc1f1365e26f`, distinct from the game pin.
- Runtime source: https://github.com/hackclub/sprig/tree/f2e175fba0020c8a6db964aaf884dc1f1365e26f/engine
- Archive: https://registry.npmjs.org/sprig/-/sprig-1.0.3.tgz
  SHA-1 `0f91216c13232878e3a0add579dac16ee344fab0` verified against collected bytes.
- Retained closure: 12 JavaScript modules, 41,260 upstream bytes. Full separate
  MIT notice in `vendor/sprig/LICENSE` matches the package notice.
  Ten modules remain exact; only `web/index.js` and `web/tune.js` are patched.
- All 14 inline arenas, five sprites, palette and two synthesized tunes retained.
  No separate asset exception appears in the source; independent bitmap-font
  or asset authorship beyond the retained notices is not claimed.
- Typography reuses the existing local Atkinson Hyperlegible and Bungee assets,
  with their shared notices under `assets/fonts/`; no new font download.

See `tag-source-search.md` for source-selection evidence and the actual
`Games/Tag Relay/CREDITS.md` for complete local modifications and attribution.

## Disclosed modifications

Responsive shell, Start/Pause/Restart, native labeled Red/Blue score and two
independent touch pads route through Sprig's eight normal keys. The original
1ms tick-count interval becomes an elapsed-time scheduler with explicit
7-second rounds and a disclosed 1.5-second break. Clear text before updates;
remove duplicate canvas scores only, retaining point/winner text. Guard absent
sprites and lock inactive/terminal input. Pause music/timers on hidden documents
and require explicit Resume; restart/unload clean up. The two runtime patches
allow a non-scheduling terminal render after RAF cleanup and cancel/mute tune
delays immediately on end. Panels/arena use 6px corners, buttons 4px; upstream
pixel art remains square. No editor, dynamic execution, remote load, backend,
network multiplayer or new dependency installation.

## Actual verification and limits

Delegation 25 reached its 20-minute implementation limit; delegation 29 reached
its 10-minute finishing limit **after required implementation checks passed**.
Paperwork/commit integration was unfinished. Further Tag implementation is
abandoned, not retried by delegation 33.

The complete preserved `tag-relay-qa/regression.log` records delegation 29's
`timeout 200s python3 -u scripts/test_tag_relay.py`, **exit 0**, on 2026-10-01:

```text
Normal errors: page/console=0, requestfailed/HTTP4xx=0, external=0
Known negative fixture ONLY: pageerror=1, consoleerror=3, requestfailed=1, HTTP4xx=1 (expected)
Tag Relay: 14 original arenas/assets/tunes unchanged; 127 legal chase moves; Red 7-6 and Blue 7-0; pause/visibility/restart/two-touch 320/390; one RAF, no terminal timers; 0 page/console/request errors; 3 screenshots under 500KB. Catalog not changed; full smoke NOT run.
```

The deliberate negative fixture is isolated from normal-game errors; no normal
failure is ignored. The three captures are `desktop-menu.png`,
`desktop-gameplay.png` and `mobile-gameplay.png`. Main reviewed earlier sprites;
fresh three-capture review belongs to Main, not this integration worker.

The complete preserved `tag-relay-qa/verification.log` records static exit 0:
15 JavaScript syntax passes, both full MIT notices matching pinned evidence,
30 resolved local references, zero runtime network/dynamic execution/personal
path/email findings, Python compilation, and **74,714 game bytes**.
Delegation 33 independently repeated the source/archive/license comparisons,
15 syntax checks, Python in-memory compilation and 30 local reference checks.
It verified the pre-registration catalog's 113 unique IDs/schema/tracked URLs
and that 223/224 were free. No heavy browser test was repeated.

Runnable focused regression: `python3 scripts/test_tag_relay.py` using the
existing Playwright/Chromium installation. This focused pass does not replace
`xvfb-run python3 scripts/smoke_test_games.py` over the final **115** entries.
Full gate has not yet run; writers remain active. No release approval or push.
