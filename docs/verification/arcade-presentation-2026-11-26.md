# Arcade presentation review, 26 November 2026

The entry audit read 141 HTML pages across 142 game projects. It excluded the
protected Character AI implementation. At baseline `82578aaf`, 27 pages omitted
the document language, seven omitted a mobile viewport and 35 declared a zoom
restriction. These are entry-level signals. An embedded game, its menus and
its controls still need separate testing.

All 27 wrappers now declare their language, including Indonesian for Stranded in Isekai. Chrome Dino's tab now
uses the game name. A 390 px Chromium comparison measured Chrome Dino's
layout viewport at 980 px and its canvas at 600 px before the mobile viewport
was applied. With the viewport applied, the page measured 390 px and the
canvas resized to 324 px. Duck Hunt's entry also fit the 390 px device
viewport. These two games received mobile viewport metadata.

An in-browser viewport trial also covered A Dark Room, Achtung die Kurve,
Bullet Hell, Cribbage and 10 Minutes Till Dawn. Their layouts retained
fixed-width content or overflow after setting the viewport. Those games need
individual layout and control changes. Zoom restrictions on older game
canvases merit a touch-input review that preserves intentional gestures.

The portal browser suite checked keyboard focus, descriptions, player counts
and action targets across 320, 390 and 1440 px widths in both themes. Game
sharing uses a normal local URL and has a selectable fallback when clipboard
access is unavailable.

For a fresh per-game entry inventory, run
`python3 -B scripts/audit_arcade_presentation.py --output <report.json>`.
Source-based checks in this report cover page language, viewport policy,
document title and visible canvas/frameset markup. They do not certify
screen-reader, colour contrast or touch compatibility across every game.

Keyboard and touch input should lead to the same actions, and mission text
should make its speaker identifiable. These informed the keyboard controls
and speaker-labelled campaign dialogue. [Xbox input guidelines](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107)
· [Xbox subtitle guidelines](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/104)
· [WCAG language of page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)
