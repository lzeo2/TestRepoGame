# CITISTEN dark-default UI receipt

## Change and scope

Fresh/no-choice UI is dark, including when the browser/OS prefers light.
The component already defaulted to dark in JavaScript; this change closes the
pre-module shell and automatic focus gaps rather than adding a theme system.

- Preview HTML declares dark canvas, native colour scheme and UI root before
  CSS/modules finish. No theme-switch script or delayed reveal is needed.
- Existing near-black/foam/accent palette and 4px panel radii are unchanged.
- Menu/loss static headings take initial focus with `tabindex=-1` and
  `autofocus`, without an outline. Interactive keyboard focus remains visible.
- Light is still a native button action. A deliberately saved light preference
  remains an accessibility opt-in; fresh contexts have no saved preference.
- Shared focus QA handles the non-tabbed heading's DOM position before sending
  native Tab, avoiding a hardcoded Tab-count workaround.

No simulation, world mesh, camera maths, game entry, catalog, runtime import or
third-party dependency changed. Preview/fixtures are not an integrated game.
A future integrated HTML entry must mirror the dark pre-module shell; this
receipt does not claim first-paint proof for a nonexistent game entry.

## Cache-cold dark first, then light

Runner: `docs/citisten-design/check-dark-default.py` (143 lines).
Evidence: `docs/maintenance/audits/citisten-QA/dark-default/`.

Each of five new browser contexts starts with emulated **light OS preference**,
empty local storage, HTTP cache disabled and service workers blocked. The
harness never writes a dark theme before the default shot. It opens the actual
UI preview, uses native mode/tool controls plus labelled UI state fixtures,
captures default dark, then clicks the actual Light button once and captures
the same screen. No light screenshot was recoloured into a default-dark shot.

Files: `J-dark-default-<screen>-<theme>.png`, ten raw Chromium screenshots:

| Screen | Themes |
| --- | --- |
| menu | default dark / native light toggle |
| toolbar | default dark / native light toggle |
| hud, including toast | default dark / native light toggle |
| night-alert, including toast/HP | default dark / native light toggle |
| gameover | default dark / native light toggle |

`J-dark-default-results.json` records source hashes, panel/text/radius/focus
snapshots, ordered shots and response logs. **359** pre-default-capture RAF
samples remained dark, with no focused modal button rings. Initial menu/loss
focus is the static title with outline `none`. A subsequent native keyboard
check still sees a visible control focus indicator.

Observed: five complete screen pairs, **16** process-ownership checks,
**45 local HTTP 200 responses**, no failed requests, console/page errors or
external requests. Dark panels are `#242927`, foam text `#f5f2e9`; light panels
are `#faf7ee`, text `#20251f`; all observed panel radii are 4px with no shadows.
Snapshots were inspected, but reviewer acceptance is not assigned by this lane.
World independently replayed the saved JSON/source hashes offline: all three
hashes, five ordered pairs, 359 dark frame samples, 45 recorded responses and
ten PNGs matched. That replay used no jsdom/dependency or new browser and is
not a separate fresh-paint or acceptance claim.

## Full copy/accessibility recheck

In the same reserved, bounded slot, the full `Games/Citisten3D/ui-qa.py` suite
then ran in a separate system Chromium process, after the cold proof closed.
It passed all copy, group-selection ARIA, keyboard, touch-size, toast lifecycle,
layout and flat-style checks across dark/light at 1440/390/320 widths.
Its **36 screenshots**, **10 collages** and **37** ownership checks are in
`docs/maintenance/audits/citisten-QA/copy-pass/`. This completes the final
selected-state assertion left pending by source milestone `57a3a7f`.

Actual combined stdout in `dark-default/DARK-run.txt`:

```text
DARK DEFAULT CHECK PASS: 5 cache-cold default-dark screens, 5 native light-toggle proofs; no boot button rings; zero errors/external requests
UI CHECK PASS: 36 fixture screenshots, 10 collages; 3 viewports, 2 themes; zero console/page/network errors
```

Reproduce only in an explicitly reserved slot:

```sh
timeout 120 bash -c 'python3 -B docs/citisten-design/check-dark-default.py && python3 -B Games/Citisten3D/ui-qa.py'
```

Owned browser/driver/server resources closed and `ps` was clear. The slot was
explicitly released to Trivia, then world. No more UI browser runs requested.
System Chromium only, no browser download; per-image byte/process guards held.

## Commit and remaining gates

Milestone subject: `fix: citisten: dark-default-ui`. Git previously exited 128
because an external linked-admin `index.lock` existed; the pre-commit maintenance
checker also refused uncommitted source. UI left the lock untouched. The
operator subsequently cleared it, world committed its own paths as `37db2ac`,
and explicitly released the serialized Git slot to UI. No alternate-index
bypass or UI deletion of admin files was used.

Tickets `pi-85825-1792656847299-da9947db` and
`pi-31413-1792656684902-540247cf` retain the historical incident; operationally
the lock blocker is resolved. Canonical inventory refresh follows this UI
source commit and is owned by world. No push or registration was attempted.
Whole-game/reviewer/device gates remain.

## Files, LOC and storage

Authored runtime changes: `Games/Citisten3D/ui-preview.html`, `ui.mjs`, `ui.css`.
Regression changes: `Games/Citisten3D/ui-qa.py` (330 lines), plus the 143-line
cold-proof script and linked UI/copy receipts. The four UI/preview runtime files
total 370 lines. World-owned source/artifacts were committed separately as
`37db2ac`; this milestone stages only explicit UI-owned paths. No new runtime
assets; ten new proof PNGs total 312,301 bytes.

Root free before dark work: 2,753,892,352 bytes; after combined QA:
2,748,796,928 bytes (shared-host delta -5,095,424). Full-copy recheck alone:
2,748,850,176 to 2,748,796,928 (-53,248). Other lanes were active; these are not
UI-exclusive consumption. All writes stayed above the guard; no waiver needed.
