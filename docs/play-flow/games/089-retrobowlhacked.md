# Play flow: Retro Bowl Hacked (id 89, registered)

- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. `Games/RetroBowlHacked`, 35 files, 5592655 bytes. Doc: `docs/maintenance/games/089-retrobowlhacked.md` (not owned). CODE-REVIEW ONLY.

## Source inspected

- `Games/RetroBowlHacked/index.html` blob `71c5faa1e7e88f82a8a3678e3014282fa06f4fed` read completely, **and** read as a structured diff against `Games/RetroBowl/index.html` blob `05ed3791ec854efb401de6ae08c1b08d00533477`. The only wrapper deltas are:
  - `<title>Retro Bowl Hacked | Fan-hosted port</title>`
  - fixed `#hacked-badge` div ("HACKED - Unlimited Credits & Salary Cap"), CSS `#hacked-badge { position:fixed; top/right 10px; ... z-index:9999; pointer-events:none }`
  - shortened Poki-stub comment and an extra `console.log('[HACKED] Retro Bowl hacks loaded')` after `GameMaker_Init()`.
- `html5game/RetroBowl.js` here is 4122176 bytes (410 bytes larger than the base game) but **not inspected**: compiled GameMaker output. Whether the "unlimited credits / salary cap" hacks live in that compiled blob is **UNVERIFIED**; only the badge text asserts them. **Engine mechanics UNKNOWN.**

## Visible wrapper flow

1. Boot: `window load` -> `PokiSDK_loadState = 0`, `GameMaker_Init()`, then the console log above.
2. Offline Poki stub identical to `054-retrobowl`.
3. Start/input/core loop/score/win-lose/restart: **held, compiled engine.** No mechanic is inferred from the badge or the title.

## UI bloat: MILD (wrapper only)

- `#hacked-badge` is a persistent fixed decorative label overlapping the canvas corner (`z-index: 9999`, `pointer-events: none` so it cannot block input). It is a mod badge, not a HUD/menu - removable from a lean play view.
- Everything else identical to `054-retrobowl.md`.

## Popups/modals

No HTML modals in the wrapper. Engine-side dialogs UNKNOWN (same `div.gm4html5_login` CSS exists).

## Animation/simulation

Opaque (compiled). Not claimed.

## Findings

1. MEDIUM - provenance gap: the hack claim exists only in `#hacked-badge` text and a 410-byte size delta in the compiled blob; diffing or decompiling `html5game/RetroBowl.js` is needed to confirm. Root: `Games/RetroBowlHacked/html5game/RetroBowl.js`. Do not "fix" by editing the badge or the game file here (no game edits in this task).
2. LOW - `console.log('[HACKED] ...')` on every load is noise; optional removal, cosmetic.
3. LOW - badge overlaps canvas corner on narrow screens; if kept, move below the canvas rather than hiding game UI.

## Recommended playable view

Keep `#canvas` and the Poki stub; drop `#hacked-badge` from the play view (or reposition). Title card stays in the portal, not over the canvas.

## Validation status

CODE-REVIEW ONLY. Smallest check still needed: load the page, confirm `GameMaker_Init()` boots, and verify the claimed unlimited credits/salary cap in-game - and even then that is runtime observation, not proof of where the hack lives in the compiled blob.
