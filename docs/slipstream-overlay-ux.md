# Slipstream: window-filling scene and in-game menus

Owner asked that play occupy the whole window, with the garage and other UI as
menus over the game, and that the purpose be obvious. This continuation only
changes existing Slipstream225; no new games or catalog entries.

## Implementation

The actual `#viewport`/WebGL canvas fills the entire window in **garage, driving
and results**, not just a small panel or a partly full-height driving layout.
Garage and results are fixed, bounded, internally scrollable menus over the
rendered scene. HUD, controls, errors and Help remain in-game overlays. Nothing
launches a separate window: the existing portal `openGameUrl -> openGamePlayer`
already uses a same-tab iframe/fullscreen boundary, and its code was not changed.
Browser native fullscreen denial still cannot be forced; the game fills the
available current window/iframe independently of that permission.

Garage opens on every launch/reload as before. `Hide garage` leaves the car scene
visible and returns focus to its viewport; `Garage` reopens the menu and focuses
Start. Details retain all original upgrades, appearance, equipment, fleet and
save/radio actions. Native Help/reset dialogs and storage locks remain intact.
Changing mode shows a concise objective and changes the primary action to Start
city drive, Start pursuit or Start race. City explicitly says drive, Park, bank
cash/mileage, unlock cars; Cutup says reach the endpoint/evade police, abandonment
unpaid; Sprint says beat three rivals and complete the race. The live HUD states
what to do next, with a device-appropriate Gas/W prompt when City begins and a
real75m/6s chase goal. These are contextual game objectives, not reinstated
persistent control essays or recurring popups. Results no longer wrongly append
'Progress saved' after a failed save.

Desktop menus overlay the right side; portrait phone menus overlay the lower
part of the scene, with a visible Start button and internal scrolling. Garage
camera view offset frames the preview in the uncovered region, rather than
shrinking the canvas; driving clears it. Original camera orbit, collision proxy,
geometry/resources, mobile-UA-only buttons, actual modes, physics and profile
schema stay unchanged. Stats move into optional Performance details, preserving
that feature rather than crowding the initial action. Flat local UI, no new
packages, runtime fetches, OEM art, secrets or proxy changes.

## Verification

`test_slipstream_modes.py` now requires the canvas and viewport to match the whole
window at origin0 in all states, no root scrolling, visible Start within garage
menu bounds, hide/reopen keyboard focus, explicit mode goals, result overlay,
actual City/Cutup/Sprint play, earned Sprint terminal/retry/reload, one-time Help,
UA-only controls and genuine held touch on320/390/844layouts. All original20s
readiness/110sordinarySprint deadlines are unchanged. The existing pure city
geometry/exact-onedisposal check is also rerun; it is not visual proof.

[Focusednative receipts, reviewer findings and personally read actual screenshots](slipstream-overlay-previews/README.md) are retained after sourcefreeze atf6b91ba.
Fullmenu/mode/native **exit0/156.1349s**, ordinary1200mSprint51.2944wallseconds,
939earnedcash; portalrealnative **exit0/73.8587s**. BothHEADunchanged/errors[];
allgaragegoals320/390/844/both themes/Startabovefold, actualfullcanvasinallstates,
UA-onlycontrols/genuineheldtouch and keyboardfocus pass. FocusreturnsStarton
Garage; terminalheadingtakesprogrammaticfocus/blockedRetrydisabled. No ordinary
readiness/race deadlines changed. Main readall12actualframes (~600KBevidence).
This is not all116registered-gate, remote push/deployment, physical-phoneFPS,
whole campaign or CircuitWardanimation patch proof. The fullprepushgate is
recorded separately after capturedcompletion. **Currentfull116gateexit1/115pass:**
Slipstream passed, unchangedOvo hit PAGE: Page.goto: Timeout15000ms exceeded;
[complete receipt and status manifest](slipstream-overlay-previews/README.md#current-full116-gate-failed-no-push).
No push attempted; sparsebaseline restoredclean. Releaseblocked, no wait/filter
changes or guessedOvo-rootfix. The broader84/122source audit and
CircuitWard default-worker quota/model-route hold remain separate.
