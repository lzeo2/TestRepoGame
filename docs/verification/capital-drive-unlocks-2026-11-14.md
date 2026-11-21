# Capital Drive unlock and cue verification

14 November 2026, Australia/Sydney. Continuing owner-authorized Capital Drive245
and standing push/merge-all order. No new game was added, ingested or registered.
Catalog remains134; maintenance covers140 projects, including six unregistered.
The [unlock contract](../capital-drive-unlock-contract.md) records API ownership,
mechanics, deterministic distribution, budgets and reproducible commands.

## Current result

The common mini-game HUD shows full key sequences, completed/current tiles, a
large current-key prompt and the real response-time bar. Indoor scoring and
vehicle locks supply that data directly; UI does not award progress. Scooter
locks require four cues; unfamiliar parked/occupied cars require eight tighter
cues. Occupied drivers first stop. Cars already driven stay unlocked for return.
E cancels; P/Esc pauses. Incorrect/late/held/chord input, elapsed time, stale events
and invalid final target conditions cannot claim a vehicle.

Lemons now have56 physical assets across33 road-derived points in ten areas.
Singles/pairs avoid motor lanes, buildings, known entrances, water/restricted or
sensitive areas. These are authored source-road estimates, not actual live Lime
fleet positions. The nearest24 within180m render in at most five instance draws;
nearest eight phone offers remain bounded. The original six IDs remain valid.
Hacking has no hire fee and uses an exact completed-session one-use permit. Theft
uses the existing witnessed offence system and Free roam remains unbanked.

Pause's optional collapsed developer input uses the existing guarded/capped
wallet and save. Its configured input is not advertised here or in game help.
The actual form was tested for masked/cleared input, invalid/repeat behavior,
reload, unchanged progression and sandbox denial. No new save schema/wallet.

## Current commands and native evidence

- `python3 -B scripts/check_capital_drive.py`: **126/126 commands PASS**. Includes45module syntax checks,40suite syntax checks,40pure suites and diff check.
- `python3 -B scripts/test_capital_theft_browser.py --output <fresh-external-directory>`: **60 normal-input checks PASS**,101.76seconds. Covers physical distributed fleet, nearby phone admission, four visible scooter cues, cancellation/movement lock, zero-charge selected-asset theft, WASD/brake/end, eight visible car cues, no time-only claim, missed-cue failure, E cancellation/retry and final real car claim. No page/console/request/HTTP errors or external runtime attempts.
- Focused developer-entry browser: **27 checks PASS**,102.05seconds, earlier in this source run. It uses the actual form/save, not a production state setter or an earned mission completion. No errors/failed/external requests.
- After the final copy-only HUD cleanup, syntax, production scooter-controller authority and diff checks PASS. It removes duplicated instructions/count progress; timing/scoring/claim logic is unchanged.
- Catalog134unique integer IDs/required fields/Git-backed URLs, maintenance140documents/134registered+6unregistered, sitemap134game URLs+portal: checked separately after source commits.

Final vehicle-browser report SHA256:
`5daab9496e93ed5fddc8897cf4efd86dd944fe31961293f6e77843a491fc35c7`.
Focused developer browser report:
`0d26cae40022d2535a1fb9e10eb5a38dd53421abd6f5e0f407b30aaba40b37a3`.
Artifacts/reports/screenshots remain outside the repository/runtime payload.

## Failures retained and corrected

M15's first form test omitted the existing campaign payload from its expected
save. It passed the first10checks before this harness assertion failed. The
corrected check includes campaign and verifies reload without changing runtime.

M19 attempt1 failed after12checks because its selector expected a strong child
inside the cue, whereas the cue element itself is strong. Attempt2 passed29checks
through the complete scooter flow and car elapsed-time denial, then a Stop click
raced the deliberately short car timeout. The corrected harness observes actual
missed-cue failure before normal retry, rather than weakening the lock mechanics.

Root's next run passed32checks, then separately read snapshot and DOM while a
one-second cue expired. Its retained report hash is
`c7c041abf5a3edd8004885821ed76f898614d803e035884985bbe6cc773c1095`.
The final harness observes the actual current DOM/snapshot cue together and uses
ordinary keys immediately. A screenshot consumes real software-render time, so
it captures, cancels with E and starts a fresh real attempt before testing all
eight keys. It never extends a response window, changes clocks or grants a claim.

M20 read-only review also reproduced prior-car re-entry requiring another theft
challenge, despite the simulator treating it as a previously driven car. A red
actual-simulation fixture confirmed the missing unlocked descriptor; root fixed
the descriptor/admission and M21 covers parked/occupied B theft followed by
instant return to A without another offence or displaced driver. Cancel copy
now correctly names E. Root's scooter test executes production admission/update
functions against real modules, including old-cancel retry ownership and final
reach/sight/mode/recovery gates.

## Milestones, review and limits

M14 `e24aac5d`, root `b1db39b6`, M15 `7e0c135c`: guarded Pause entry and its actual
form regression. M16 `24c7f9ab`: shared challenges/interior cue data. M17
`efd24afb`: car takeover/tests. M18 `9d95e771`: distributed fleet/view/permits.
M19 `e2136e17`: native vehicle suite. M21 `ae5786d1`: prior-car return fixture.
Root `c3123f02` integrates controls/HUD/final claim authority; `9f577889` corrects
native observation timing; `5b10882b` removes duplicated HUD copy/count display.
M20 review made no source edits. All worker commits used explicit owned paths and
exclusive staging windows; workers did not push.

Root reviewed actual desktop/390px key-cue frames, the roadside pair, riding and
car sequence. Keys/current highlight are readable and the action controls fit.
The final small copy cleanup removes the duplicate full prompt/count bar from
these earlier captures. Ordinary environment art remains stylized and terrain/
source geography is unchanged. The screenshots do not prove photorealism, all
public footpath accessibility, exact current operator positions or all-gameplay
correctness. No real N100/native GPU FPS or touch riding was measured.

Tracked game bytes grew about22KB from the previous merged release; workspace
retains about28GiB free. No installed packages, node_modules, imagery or persistent
servers. Protected Character AI, disabled proxy, portal bundle and shared car
factory remain untouched. Original sparse selection is restored after shipping.
The unchanged historical fleet123/133 certificate-failure HOLD remains separately
disclosed under the owner's continuing targeted push/merge order. No new fleet-wide
pass is claimed.
