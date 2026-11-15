# Capital Drive: guided controls and interface work

15 November 2026, continuation after PR26. This changes existing game245 only.
The [manual](maintenance/games/245-capital-drive.md) and
[verification receipt](verification/capital-drive-tutorial-ui-2026-11-15.md)
record the inspected source and evidence. No new map data, assets, physics
engine, external service or career-save format is introduced.

## Guided controls

`tutorial.js` observes controller facts and owns nine small lessons. It has no
DOM, storage, input, timer, player movement, cash or mission access. The controller
supplies the same world clock and real poses already used by gameplay. A lesson
advances from observed play, not from a decorative Next button or elapsed waiting.

| Lesson | Required observation |
| --- | --- |
| Look around | A fresh actual camera-drag serial. |
| Take a short walk | At least2m of plausible actual foot movement. In a car, the instruction first explains E stop/exit. |
| Open your phone | A fresh successful Phone opening. |
| Get into a car | Actual manual vehicle mode, excluding bus/Yoober passengers. |
| Drive a little | At least10m of plausible vehicle motion at3m/s or above. |
| Come to a stop | Actual vehicle speed at most0.6m/s. |
| Choose a route | A fresh successful user Set route action with a connected route. Automatic job routes cannot credit it. |
| Find the shops | A fresh successful Shops opening. |
| Find something to do | A fresh successful Jobs/Campaign opening. |

Movement anchors are reset on mode changes, pause/resume and implausible jumps.
Entry offsets, teleporting, stale serials, invalid/zero dt, recovery, interior
rooms, activities and cutscenes cannot stand in for real walking/driving. Supplied
dt is capped. Menus genuinely pause the game, so `observeMenu(ctx, menu)` accepts
only the named current menu lesson after that actual successful user action.
It supplies no elapsed time and cannot credit movement or a different lesson.
Ordinary pause remains frozen; unrelated menu changes cannot leak movement credit.

The first fresh career defaults Guided controls on. Existing careers can opt in
on the start panel or use Help/Pause to replay. Skip is always available in the
coach; Done dismisses completion without resetting it. The strict independent
`capital-drive-tutorial-v1` preference stores only version/status/index, capped
at256serialized characters. It is separate from career progress, money, character
checkpoints, downloads and quality settings. Corrupt/denied preferences do not
stop play. Saved active lessons resume with fresh observation baselines rather
than restoring a world pose. Mode changes suspend the observer and preserve its
lesson. Replay is unavailable during recovery, an active ride/activity or indoors.

Guided controls use the existing protected-attack gate so looking around cannot
accidentally punch a bystander. The current weapon/ammo is not rewritten; ending
or skipping the guide returns normal attack eligibility. Police, collisions,
vehicle condition, health and ordinary world rules continue. There is no tutorial
cash, invulnerability, teleport, automatic mission completion or reward replay.

## Interface and focus

The start panel keeps mode descriptions and a clear Start game action, with the
long control list moved into Controls & help. Help works before starting, via
the desktop header, F1 or Pause, with native expandable topics for movement,
transport, jobs/interiors, combat/police and modes/performance. Native dialogs
retain Escape/Tab behavior; opening them clears held world input. The tutorial
coach is a non-modal region with polite stage announcements and never captures
movement keys or advances the world itself. Menus, recovery and active activities
hide it until normal play resumes.

Map Set route now returns to play after a successful route and immediately
refreshes guidance. No connected route leaves the map available with its reason.
Landmark routes start at the actual player focus, including on foot, rather than
the parked car. Planning a route never changes the player's physical pose.

Mobile header actions have at least44px targets. Shops, garage, sound and help
remain reachable through Pause when their header shortcuts are hidden. Credits
have a usable target, and normal hints/toasts are separated from the minimap and
player status. Mobile guided play temporarily focuses the lower HUD on its coach,
keeps the enter/exit touch action and restores the ordinary map after the guide.
Light mode uses darker focus/progress/star colours while retaining source/world
art. Existing camera, phone, garage and service authority remain unchanged.

## Activity presentation and measured limits

`activity-ui.js` owns only the existing panel's presentation. The controller still
drains every real activity/work event and checks its plan/station/session before
the wallet or campaign sees an outcome. Moving that rendering must not skip the
event drain, paid completion, interruption or replacement-session safeguards.

The adapter caches twelve panel nodes and the mini buttons once. Unchanged text,
classes, hidden flags, attributes and progress values cause no DOM writes. Cue
tiles are created only when the sequence changes and reused for current-index
updates. Active timing/progress stays tied to the real activity snapshot. Leaving
a room clears retained visual controls; disposal stops further writes. Empty
state/sequence values are shared rather than recreated on inactive frames.

The regression covers3600unchanged renders with zero additional DOM writes,
queries or element creation, alongside active cue/hold/grip, workout prices,
car/scooter sequences and terminal states. This is a DOM-work bound, not zero
JavaScript allocation or a whole-device FPS guarantee. Baseline cloud profiling
still identifies software graphics as the larger cost. Paired actual profile
results and any failures belong in the dated receipt, not an inferred N100 claim.

## Reproduce

```sh
node scripts/test_capital_tutorial.mjs
node scripts/test_capital_tutorial_controller.mjs
node scripts/test_capital_activity_ui.mjs
node scripts/test_capital_gym_equipment.mjs
python3 -B scripts/build_capital_cache.py --write
python3 -B scripts/check_capital_drive.py
timeout 660s python3 -B scripts/test_capital_tutorial_browser.py --capture --output <fresh-external-directory>
python3 -B scripts/profile_capital_drive.py --root <exact-source-export> --mode 3d --quality performance --seconds 8 --output <fresh-external-profile-directory>
```

Existing non-tutorial native tests explicitly uncheck Guided controls through
normal UI before Start. Their original assertions and click/tap inputs remain.
The profiler does the same to compare ordinary play with the pre-guide baseline.
Use a fresh external directory for every browser/profile attempt, keep failures,
and close all servers/browsers. Software WebGL is not target-hardware acceptance.
