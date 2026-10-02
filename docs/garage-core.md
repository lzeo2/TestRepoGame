# Garage Borough core: task 100 frozen handoff

## Scope and provenance

Source baseline: `a48a386`. Core/suite source commit: `83ce902`.
Author identity: Anonymous Arcade Worker <>. Original implementation under the
explicit two-game exception in `car-arcade-plan.md`, not an ingested-game claim.
Owned paths only: `Games/Garage Borough/core.js`,
`scripts/test_garage_core.mjs`, and this report/command log (`garage-core.md`).
No catalog, renderer, helper, model, vendor, manual or inventory edits; no
installation, download, checkout expansion, server, registration or push.

Read the complete plan, AGENTS, quality rules, ponytail skill and maintenance
entry guide. Inspected the real local `assets/car-arcade/fleet.js` and
`storage.js` before integration. The only runtime dependency is the real
fleet's frozen `BY_ID`; no replacement fleet fixture was created. Fleet was
available for the first regression run and subsequently committed by its
worker at `a8edf08`. Shared storage is not imported by this pure core.

## Frozen public API

All functions are synchronous, pure copied transactions: retain the returned
state on success. Invalid state, identity, funds, capacity, action or timestep
throws `Error`; catch and display `error.message` in the controller. Failed
transactions leave the original completely unchanged. Frozen inputs work.
No DOM, storage, RNG, network, wall-clock calls, debug setters or cheat exports.

| Export | Arguments and result |
| --- | --- |
| `freshBusiness()` | New canonical state, cash800, one bay, no inventory/staff, initial compact buyer |
| `validateBusiness(state)` | Detached canonical state; throws on invalid input |
| `tickBusiness(state, dt)` | Copied next state, finite numeric dt0..0.05 only |
| `buyStock(state, carId)` | Deduct acquisition; append condition45 stock with new numeric UID |
| `restoreCar(state, uid)` | Deduct repair cost; add25 condition capped100 |
| `sellCar(state, uid, customerUid)` | Require both identities/style/condition match; consume both, pay, increment sales/reputation |
| `wholesaleCar(state, uid)` | Consume stock, pay bounded wholesale; no sales/reputation |
| `hireStaff(state)` | Pay current staff-dependent cost, increment staff |
| `expandGarage(state)` | Pay current bay-dependent cost, increment bays |
| `continueBusiness(state)` | Only from won; return playing with achieved retained; no reward |

There are exactly these ten exports. The UI must not mutate state to perform
management actions. Restart uses a new `freshBusiness()` after UI consent.
Save through the shared helper under `garage-borough-v1`, passing
`validateBusiness`; there is no second serialization format.

## Canonical state and identity

Top-level keys exactly:

```text
version: 1
cash: integer 0..1e9
inventory: [{uid, carId, condition}]
bays: integer 1..4
staff: integer 0..3
reputation: integer 0..1e9, equals sales
sales: integer 0..1e9
elapsed: active seconds 0..1e9, microsecond precision
rentClock: elapsed modulo120
customerClock: elapsed modulo15
customers: [{uid, style, minCondition, expiresAt}]
nextUid: integer 2..1e9
status: playing | won | closed
achieved: boolean, exactly sales >=10
```

Inventory capacity is **2*bays**, at most8. `carId` must be a real fleet ID,
condition is integer0..100. No separate mutable style on inventory: look up
`BY_ID[item.carId].style`. Customer styles are compact/sport/utility/touring,
minimum condition integer70..90, expiry strictly after elapsed and at most45
seconds ahead. There are at most3 customers.

Both collections share one monotonic numeric UID space: every UID is positive,
unique across both arrays and less than `nextUid`. Initial buyer UID1 expires
at45 and demands compact/70; nextUid starts2. Allocation never wraps or
reuses consumed identities. At allocator exhaustion purchases reject and
new customer arrivals stop, rather than silently reusing IDs.

Validation checks prototypes and own property descriptors before reading
fields, including array elements. It rejects getters/setters, unknown/missing
keys, symbols, inherited records, null-prototype records, subclassed/sparse/
overlong arrays, unknown/oversized car IDs, duplicate identities, nonfinite/
fractional/out-of-range resources, negative zero and inconsistent timers or
milestones. Output is detached plain data in fixed key order, suitable for
JSON serialization. Storage's independent128KiB raw limit applies before
JSON parsing. Validation is schema checking, not tamper-proof local savings:
a user who edits valid client state or replays an old save can undo history.
One-shot payout protection applies to the latest state, not arbitrary old
snapshots or competing noncooperating writers.

## Economy, time and deterministic demand

- Acquisition: `max(200, floor(fleetPrice*0.5))`.
- Repair: `max(50, floor(acquisition*0.15))`, +25 capped100; full cars reject.
- Customer sale: `max(500, floor(acquisition*(100+condition)/100))`.
- Wholesale: `min(acquisition, max(floor(acquisition*0.5), floor(acquisition*condition/100)))`.
  Available regardless of customer matches. Never exceeds acquisition, even
  with free staff repairs; it cannot create a profitable buy/wholesale loop.
- Hire: `300+250*currentStaff`, max3. Expand: `800*currentBays`, max4.
- Cash always integer, capped1e9 after payouts. No negative cash or grants.
- Rent: every120 active seconds, `150+50*currentStaff`. Exact funds can pay;
  insufficient funds close without overdrawing or selling assets implicitly.
- Staff: each global3-active-second boundary supplies one condition point
  per currently hired worker, allocated to the first damaged inventory item.
  Multiple workers may restore one car. Excess points are discarded when all
  stock is full; idle labor never accumulates. Hires join the next global
  boundary, not a private per-worker timer. Rent failure precedes restoration.
- Ticks use integer microseconds internally (dt rounded to nearest microsecond)
  to avoid accumulated rent/cadence drift. No wall-clock catch-up or offline
  income. UI must stop ticking while paused/hidden. Time beyond the finite
  elapsed cap rejects instead of wrapping. Zero dt makes no progress.
- Expired buyers leave first. Each15-active-second boundary can append one
  buyer if fewer than3 remain. Odd arrivals cycle compact/sport/utility/touring;
  even arrivals choose inventory styles round-robin when stocked, otherwise
  follow the same style cycle. Stock-targeted buyers require70; others cycle
  70/80/90. Each arrival lasts45 active seconds, bounded by the elapsed cap.
  Buyer identities are allocated even though they do not pay until matched.
- Tenth matched sale sets achieved and won exactly once. Won/closed ticks
  return detached unchanged data and all economic actions reject. Continue
  only leaves won, gives no cash, and prevents future repeated milestone stops.
  Wholesale never counts toward victory. Closed requires restart via UI.

## Verification and command evidence

Source has233 lines/9716 bytes; regression has271 lines/13345 bytes.
Commands were run with the actual sibling fleet present, no dependencies added.

```text
node --experimental-default-type=module scripts/test_garage_core.mjs
11 checks passed; 16 fleet records; simulated API progression {"sales":11,"cash":3250,"activeSeconds":270}
Synthetic fixture checks and API simulation only: NOT native-input or campaign balance acceptance.
exit 0

node --experimental-default-type=module --check 'Games/Garage Borough/core.js'
exit 0
node --experimental-default-type=module --check scripts/test_garage_core.mjs
exit 0

git diff --check
exit 0
```

The11 checks cover the fresh buy/repair/sale conservation path, frozen input,
consumed stock/customer replay rejection, all16 economic formulas, style/
condition mismatch, wholesale50..100% limits, recovery from an unaffordable
Parcel repair, capacity/staff/bay costs and denials, actual staff progress/
cap/idle discard, deterministic stocked demand and expiry, rent and unpaid
closure, invalid dt, ten-sale win/reload/continue, cash cap, UID exhaustion,
detached copies and hostile descriptors/identities/resources. Synthetic
fixtures are explicitly labeled in the suite. The eleven-sale policy uses
normal public actions and bounded ticks but is still an API simulation, not
natural keyboard/touch evidence or full fleet economy balancing.

Read-only catalog/schema/Git-URL audit printed:
`PASS: 115 catalog entries; unique IDs, schema keys and tracked URLs` (exit0).
Core external-load/DOM/storage grep returned exit1: no matching loads or APIs.

`python3 -B scripts/check_maintenance_docs.py` passed before source was staged:
`PASS: 120 game documents cover 115 registered + 5 unregistered games; Git inventory current.`
After committing the new core it correctly failed (exit1):
`AssertionError: Inventory stale: inspect changes, then run --refresh.`
This is an explicit integration hold, not an acceptance pass. Main owns the
new maintenance manual/inventory refresh; this worker must not change them.

Storage before work:2337857536 free bytes. After source/report commit:
2336432128 free bytes; shared-workspace growth1425408 bytes, below30MB and
both readings above2e9 free. Concurrent workers also write in this workspace;
this is not an isolated attribution of their storage use. No sparse expansion.

## Remaining holds and ownership

Fleet/model source commit is now `a8edf08`; renderer/storage integration remains held.
No native browser play, screenshots, touch/keyboard, UI error feedback, model
visual review, device FPS, campaign-wide balance, registration or full-catalog
browser gate is claimed. No push. Originality is an authored-source statement,
not a legal guarantee about all generic vehicle designs.

At source handoff, untracked sibling work belonged to tasks98/99:
`assets/car-arcade/fleet.js`, `assets/car-arcade/models.js`,
`scripts/test_car_arcade_models.mjs`, `Games/Slipstream Borough/`, and
`scripts/test_slipstream_core.mjs`. These were neither edited nor staged here.
Final status after the report commit listed only the two task99 sibling paths
(`Games/Slipstream Borough/` and `scripts/test_slipstream_core.mjs`); all owned
paths were committed. This report is the bounded command/evidence log; no
separate scratch log. `git diff --no-index --check /dev/null` on the new report
returned1 for a differing new file with no whitespace diagnostics; normal
`git diff --check` returned0.
