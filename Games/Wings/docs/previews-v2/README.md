# Aircraft repair previews

Captured 2026-10-17 against geometry `92e470f` and the source-built repair.
The orchestrator reviewed these before committing the final runtime milestone.

- `raw-standard-three-*`: isolated Three 0.186.0, hemisphere intensity 2,
  directional intensity 3, ACES/sRGB. Family models share lighting; each camera
  fits its own bounds. These are not converted Wings materials or flight.
- `f15-*`, `f35-*`: real Wings WebGPU rendering in Windows Edge on AMD/ANGLE,
  1280 x 800. Ordinary keyboard/mouse events, no simulation state grants.
  Both climb and cockpit cannon captures are unpaused flight, HP 450.

Both aircraft took off, climbed above 120 m, turned, switched cockpit/chase,
fired cannon projectiles, returned normally to the menu and started a fresh
session. F-15 reached 188 m/s and F-35 166 m/s during the short boost probe.
No page/console errors or external requests. Early initialization was slow;
dynamic resolution later reached approximately 54-60 fps in these brief samples.
This is not a performance benchmark. Headless pointer-lock acquisition failed;
keyboard fallback worked. Physical mouse capture, audio, missile targeting/fire,
Pi rendering and native load-time comparison remain unverified.

A separate ordinary-input dive reached the normal death state for both jets;
keys 6/7 then respawned the correct jet with HP 450, pause off and pointer lock
restored. The exact death cause was not event-proven; this is not a collision
cause assertion. Secondary hold/release produced no missile without a target,
so it does not establish missile acquisition or launch acceptance.

Model SHA-256:

- F-15: `5c1bf64dc21962dc822dc44edd91186aa4a6932034b06a405d3170518fc135bf`
- F-35: `ce19018414037e3cef949a99ae08a1d035b25fbd20601e1835c2426bc32db197`

The two worker harness failures were readiness assertions, before flight inputs:
first a mispositioned timeout option, then reading the HUD before its text filled.
The parent waited for actual HUD readiness and completed both flight probes.
Earlier failed captures and historical Pi shader failures remain in their dated
receipts; these passes do not rewrite those results.
