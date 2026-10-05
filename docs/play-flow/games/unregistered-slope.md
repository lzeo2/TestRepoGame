# Play flow: Slope (unregistered)

- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Directory `Games/Slope`, 1 file, 2720 bytes, `id: null`, `registered: false`. Inventory doc: `docs/maintenance/games/unregistered-slope.md` (not owned here).
- Status: CODE-REVIEW ONLY, no browser run by this worker.

## Source inspected

- `Games/Slope/index.html` blob `18bd69cd4a41e949a02aca48d77a0d8fd6d5088f` read completely (single static page, no script at all).
- `<title>Slope — Offline Unavailable</title>`; body is a `role="alert"` `.card` with `.icon` (ski emoji), `h1` "Slope is unavailable offline", one explanatory paragraph, and a single `a.btn.primary` "Back to Arcade" pointing at `../../index.html`.

## Flow (from source)

There is no game in this directory. Boot -> start -> input -> loop -> score -> win/lose -> restart are ALL **absent by design**: the page states the original Slope build is hosted online and is permanently unavailable offline here. The only interaction is the back link.

- Visible wrapper: this static notice page.
- Engine mechanics: **UNKNOWN / not present** - no engine, no canvas, no script is shipped. Nothing may be inferred about the real Slope game's rules, controls or progression from this file.

## UI bloat: NONE (for what it is)

Persistent content is the alert card only: `h1`, one paragraph, one button. No gradients, no popups, no modals, no decorative animation (the stylesheet even forces `animation/transition: none` under `prefers-reduced-motion`). The card is a genuine status message, not a game menu.

## Popups/modals

None.

## Animation vs simulation

Not applicable: no loop, no RAF, no timers in source.

## Findings

1. INFO - the page is an intentional offline placeholder, not a broken port. No fix.
2. LOW - emoji `.icon` is decorative; safe to drop in a leaner view. Optional.
3. No game-side defects can exist here because no game logic ships.

No high-severity findings.

## Recommended playable view

This game has no playable view. Keep the status card as-is (it already matches the "one message + one action" pattern). If an operator later supplies an offline Slope build, this document must be rewritten from that source.

## Validation status

CODE-REVIEW ONLY. Smallest browser check: open `Games/Slope/index.html`, confirm the notice renders and the "Back to Arcade" link resolves to the portal. No gameplay check is possible or claimed.
