# Foldwild core v2: delegation 48 checkpoint

Provider/model printed at startup: `openai-codex / gpt-6.1-sol`.
Owned paths only: `Games/Foldwild/script.js`,
`scripts/test_foldwild_core_v2.py`, and this report.
No catalog, asset, vendor, license, proxy, sparse-selection or other-worker edits.
No new game, registration, push or publication.

## Integrated foundation

- Five-route locks/spawns and legacy Iven credit consume the actual v2 world ABI.
- Collision-safe, camera-relative 4 m/s movement and graph-routed nearby buttons;
  three nearest POIs, held multi-contact movement, pause/modal cleanup and recenter.
- One core RAF; low presentation is capped at a 30 Hz target, standard at 60 Hz.
  Elapsed-time movement is independent of that presentation cap. These are targets,
  not hardware performance certification.
- Native Field Kit/NPC services: bounded one-item buy/sell, visible prices/stock,
  owned accessories, recovery items, one-shot fiber collection/delivery, class
  selection and saved archivist name/skin/coat/backpack. Hairstyle controls withheld.
- Pathfinder adds one fiber per pickup; active Quartermaster adds five Marks per
  delivery. Battle receives the active class and enables derived synergy.
- Wild individual profiles are seeded; capture retains individual/cosmetic fields.
  Wild victory/capture and first-trial Marks rewards are bounded and paid once;
  flee/loss pays no Marks. Camp heals and supplies at least four free kites.
- UID-based team/favorites/accessories and discovered-only ledger search/filter;
  unseen cards disclose only their number. Keep-one and three-member party guards.
- Saved quality/motion/appearance/economy and continue/reset/corrupt-save protection;
  read-only deep-frozen snapshot getter, no state grants or mutable debug controls.

## Actual verification

The world module was inspected after commit `7297756`: exports include
`REGION_LAYOUTS`, `movePosition`, `routeTo`, `unlockedRegion`; `freshGame` returns
version 2. Battle v2 is commit `a2ab6c5`. Main resolved the cross-module supply-key
mismatch in `2400d6d`: transactions now accept canonical `0:supply-1` claims.
No mocked modules or fabricated positive saves were used.

Commands executed:

```sh
node --experimental-default-type=module --check Games/Foldwild/script.js
# PASS: entry syntax
python3 -B scripts/test_foldwild_core_v2.py
# PASS: M1 native starter, merchant trades, accessory/ledger, appearance,
# supply/contract/class, save/continue, movement, wild battle, touch and
# corrupt-save protection
```

The bounded native command used `timeout 180`, port 8798 and a real Chromium
WebGL/SwiftShader browser; server/browser cleanup is in `finally`. All three completed
runs exited 0, including the final entry revision. Final recorded output:

```json
{
  "normal_loop": {
    "marks": 99,
    "encounterIndex": 1,
    "activeClass": "quartermaster",
    "savedAccessory": "badge",
    "claimedSupplies": ["0:supply-1"]
  },
  "errors": [], "failed_requests": [],
  "external_requests": [], "http_errors": [],
  "screenshot_bytes": 235883,
  "storage_delta": 73728
}
```

Normal actions: seeded Cindupp start; merchant kite buy (12), patch sale (6),
badge buy (20); equip/favorite by UID; change coat; continue with unchanged saved
bytes; walk open lanes beyond the old bounds; route to/collect fiber; deliver at
counter; choose Quartermaster at mentor; meet a wild individual; press ability 1,
Wait, flee without reward; use a recovery patch; save/continue again. Mobile proof
uses real held touch contacts, diagonal combination, release and pause. A separate
negative corrupt-save fixture only checks cancel preserves its bytes.

Existing pure checks ran with `node --experimental-default-type=module`:
`test_foldwild_data`, `battle`, `battle_v2`, `economy`, `builds`, `regions`, `world`,
and `save_v2` (all `.mjs`), each exited 0 with PASS output. Data check reported
80 unchanged tracked/local model SHA matches, 50 actions and hidden null. Region
check reported 73 POI + 15 wild routes and 185 collision-safe segments. Catalog
schema/unique IDs/115 tracked URLs and Python in-memory syntax checks passed.
`git diff --check` passed. Entry remains below 820 lines, not a new UI framework.

## Captures and held gates

Native captures are written by the check to the temporary `foldwild-core-v2`
output directory: `desktop-world.jpg`, `desktop-shop.jpg`, `desktop-ledger.jpg`,
`desktop-battle.jpg`, `mobile-world.jpg`. Each is below 300 KB. Main owns subjective
visual review; these are actual gameplay captures, not concept renderings.
Disk remained 2.4 GB free. The final native run's shared-disk delta was 73,728 bytes;
that number is not an exclusive accounting of concurrent workers' storage.

This proves the specified small M1 loop, not a completed campaign. Native capture,
class combat balance, all five trials/rewards/legacy credit, full asset/control QA,
advanced model ledger/release/evolution presentation, pending-battle persistence,
15 authored tasks/final expedition, frontier and optional horror integration remain
for subsequent bounded work. Optional hidden species is unchanged/null. No N100
or Chrome OS device was available; draw buffers/frame counts do not certify it.
The full registered-catalog smoke/release gate was not run by this worker and
cannot be replaced by these targeted native/pure checks. No push is authorized.
