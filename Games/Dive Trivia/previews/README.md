# Dive Trivia v2 previews

Captured 2026-10-23 with the system Chromium through normal click/fill/Enter input.
No game-state, score or clock grants. The daily key is the actual UTC day, so
rerunning on another date can change the questions and preview scores.

| Preview | Evidence |
| --- | --- |
| [01: typo accepted, desktop dark](01-typo-accepted-desktop-dark.png) | Close spelling of Kiwifruit, 85 points instead of tier-5's 100 |
| [02: reef median, desktop dark](02-reef-median-desktop-dark.png) | Completed 475-point / 4,750 m daily beats the fixed 315-point benchmark |
| [03: already answered, desktop light](03-already-answered-desktop-light.png) | Repeated typo rejected after reload; answer form stays open |
| [04: dive log, desktop light](04-dive-log-desktop-light.png) | Persisted best depth, one-day completion streak, tier chart and dated result |
| [05: typo accepted, mobile dark](05-typo-accepted-mobile-dark.png) | Different accepted answer in the same seed, also penalized one tier |
| [06: dive log, mobile light](06-dive-log-mobile-light.png) | Same persisted history after abandoning/reloading the second run |

Desktop captures are 1366x1000 viewport images. Mobile captures are the actual
workbench element at a 390x844 viewport, excluding the pre-existing tall ocean
above gameplay. They are not fabricated mobile full-page captures. All six were
visually reviewed for text wrapping, controls, hints and chart readability.

Reproduce only when the shared browser slot is free and disk has at least 2 GiB:

```sh
node scripts/test_dive_trivia.mjs
python3 -B scripts/test_dive_trivia_v2.py
```

The browser runner pins `/usr/bin/chromium`, refuses an occupied slot, uses one
browser, blocks external requests/sockets, and has a 110-second work deadline.
It shuts down the browser and HTTP server on success/failure. No installation or
browser download is used. Seven rounds complete with the network disabled after
local assets/fonts load. It additionally verifies immediate persistence for an
abandoned answer, canonical repeat hints, empty history, corrupt/blocked storage
and in-memory reuse checks when writes fail. Both themes at desktop/mobile and
320px wrapping are exercised; it writes exactly these six PNG names.

Final run output:

```text
PASS seven offline normal-input daily rounds, typo penalty and reef median
PASS reload persistence, already-used retry hint and completed-daily log
PASS desktop/mobile in both themes; six feature previews
PASS malformed/blocked storage, zero browser errors/external requests/failed loads
Browser/server closed; slot released; elapsed 54.004s
```

One prior final-style attempt failed with `Locator.press: Timeout 8000ms exceeded`
while waiting for `#answer`. Its browser/server closed. The unchanged retry above
passed; the transient cause is not proven. Unused masthead-caption CSS rules were
removed afterward without changing rendered elements. No test filtering or clock
changes were used to turn the failure into a pass.

These are focused offline-solo feature previews, not fleet smoke, physical-device,
real-opponent, cold-offline-install or release acceptance. No games were added;
this remains the existing original project. No push or publication.
