# Slipstream reverse, rendering cadence and unbanked sandbox

## Scope

Existing game225 only; **no new game build**. The owner requested reverse, low-speed choppiness investigation and a sandbox to compare cars/handling. Explicit Astra car-continuation authorization retained. Separate owner request registers existing Foldwild preview226; see [its scope](foldwild-catalog-registration.md). No model/fleet/vendor/showroom/storage/world/clock/proxy/Character AI source changed here.

## Changes and boundaries

- Previous city speed clamped to nonnegative. Core now permits signed City/Sandbox speed down to-6m/s: Brake first reaches zero, continued hold reverses; Gas brakes backward motion before accelerating forward. Neutral drag converges to zero without crossing it. Absolute speed controls containment; signed yaw backs the car naturally. Reverse collisions retain damage/cooldown/armor. Highway is deliberately forward-only.
- Previous renderer consumed raw60Hz poses/wheel deltas at every RAF. It now interpolates compatible previous/current snapshots using the existing accumulator remainder, including NPCs and shortest-angle headings; reverse wheel angle follows signed rendered travel. New run/mode/collision/status guards prevent blending across discontinuities. Physics cadence remains unchanged. Synthetic60/120Hz schedules plus real UI proof cover this implementation, **not owner-hardware frame rate or a proven sole cause of all choppiness**.
- Native Sandbox mode exposes all16 stock cars, live car switching, steering strength.25..2, press-in response2..12/s, per-car defaults. Settings are visit-only. No NPCs/police/gadgets/payout/progression. It never reserves, settles or saves a career run. Existing core validation/strict banked modes reject its handling override/settlement. Career save errors remain locked; unbanked testing is still allowed. The existing240-active-second run bound ends/restarts the test without rewards.
- Map treats Sandbox as the actual finite city, not highway. Map/settings disclosures remain native, keyboard-accessible and mutually collapse when opened. Phone menus scroll internally; movement targets stay44px and UA-only. Help explains reverse and sandbox; optional Auto gas clears on test-car swap/respawn.

## Genuine delegation

Actual assistant records independently parsed from retained outside-repository logs; invocation requested high thinking. All records exclusively `openai-codex-responses / openai-codex / gpt-6-astra`:

| Delegate | Owned paths | Commit | Exit/seconds | Actual records |
| --- | --- | --- | --- | --- |
|25|core.js, core export test, reverse/sandbox test|2ad5cd3|0/277.6490418979665|48|
|26|view.js, city-render test|59d2e90|0/169.51487199007533|36|
|27|independent source-only review document|335df7a|0/117.95960582303815|27|

Anonymous own-path commits verified. Reviewer found no actionable runtime issue in bounded paths; inventory pending was accurate and is Main-owned. [Full source-only review](slipstream-sandbox-review.md). No label alone is model provenance; none of these delegates supplies native certification. Main integration is `a5d7808` and independently reruns/owns native tests.

## Main checks

Source-only: clock,15core/9world/5traffic/all16-upgrade steering, actual-controller input, new all16 reverse/sandbox/negative trust-boundary cases, north-up map including sandbox, synthetic60/120Hz render/camera/NPC/wheels/resource guards; cached16/Patrol/two26-study cycles and module syntax pass. Stationary city/traffic fixtures now use neutral input because held Brake intentionally reverses; the stationary contact fixture explicitly has speed0. Assertions are retained, not weakened. Private implementation bytes unchanged.

Fresh ordinary desktop/mobile checks, unchanged game runtime `a5d7808`, source hashes frozen, zero reported errors/local-only/no state grants:

| Probe | Exit/seconds | Scope |
| --- | --- | --- |
|Sandbox initial|0/126.95723182207439|all16, keyboard/held touch reverse, tuning/defaults, career bytes untouched, negative corrupt-save fixture|
|Sandbox stronger final|0/141.118523904006|adds ordinary banked City reverse/real reservation and park once, visible launch CTA;320/390/844 bounds|
|Modes|0/231.39576159208082|City/Cutup/Sprint; ordinary1200m finish65.13985157804564s/939cash; pause/Help/cameras/reload/held phone input|
|Recovery|0/107.19823634403292|real bump/unpaid restart/boundary wreck, countdown/Help freeze/once-only bank/same-mode fresh reservation/map|
|Caught|0/64.63249539793469|actual Cutup arrest3 with HP remaining, caught label/countdown/same-mode respawn/once-only payout|
|Portal225|0/71.46190898003988|search/Arcade/Info/desktop Enter/390 genuine Play/fullscreen/fresh garage and4traffic|

Readiness20s, Sprint110s, modes240s, recovery120s, caught90s deadlines unchanged. Corrupt bytes are a labeled negative fixture, never positive saved-progress evidence. Separate Foldwild preview failures/passes remain in its ledger. [Actual receipts, images and visual judgment](slipstream-sandbox-previews/README.md). Full117 registered smoke and main transport are separate fresh receipts, not inherited116 passes.

## Remaining limits

Visit-only tuning is not a permanent career balance change; note values before leaving/reloading. All16 sandbox selection is not earned all16 career acquisition. Actual owner-device FPS/low-speed comfort, natural city escape/full fleet/equipment/campaign, broader noncooperating-tab storage safety and hosting remain unverified. Heavy parked studies are not installed as live cars. Contact meshes may overlap; cosmetic discs/interpolation are not physical collision separation. Foldwild M2/inspection/campaign/rights/device holds remain. Scope: existing-game modifications plus existing-game registration226; no build/register pair for a newly built game exists in this run.
