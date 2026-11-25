# Capital Drive homes, traffic and training

## Playing the update

Buy one of the four new everyday cars at Crescent garage, or watch for them
in traffic. In an owned home, press **T → Safehouses** to improve the bed or
stock the pantry. Press **T → Training** to see which skills a player or
crew can afford. Both tracks explain the prerequisite and effect before
purchase. Prices, earnings and all eight skills are in the
[game manual](../maintenance/games/245-capital-drive.md).

[Vehicle gallery](arcade-capital-2026-11-26/fleet.webp) · [Inside Milo’s safehouse](arcade-capital-2026-11-26/safehouse.webp) · [Player training after a purchase](arcade-capital-2026-11-26/training.webp)

## What the measurements cover

- The vehicle gallery renders the same garage meshes the game loads. Each
  new model uses seven source meshes and 6,492–6,564 triangles. The traffic
  renderer reuses templates and retains its 56-vehicle capacity. The number
  of models eligible for traffic rises from nine to thirteen. With all
  thirteen models present at close range its maximum is 53 draws, up from
  37. Actual draw counts depend on the mix and distances.
  A 40-car test now marks 3,320 scalar values for repeat upload per update,
  down from 49,672 when the 13-model pool dirtied whole buffers. The first
  allocation is still full size. Empty batches upload nothing.
- Across twelve real house plans, entering a house produced one merged mesh
  with 1,420–2,120 triangles and 134,184–198,224 bytes of geometry. Upgrading
  the bed or pantry updates colours in the existing buffer. Leaving the
  house releases the geometry. Re-entry recreates it from the plan and
  saved improvements. These are CPU-side geometry buffer sizes.
- The integration test completes a parcel job and a campaign introduction
  through their game controllers. It verifies that retries cannot award
  duplicate points, a later crew can claim its own credit, and the
  companion present at mission completion still gets credit if the next
  simulation step dismisses them. Career training survives a save/reload.
- The site and game browser tests use Chromium. The game uses software
  WebGL on the cloud device. Hardware frame time on the Intel N100 remains
  unmeasured.

## Browser checks

In a fresh Campaign profile, the test started as Milo, left his car, followed
the mission guide to his home, then cancelled the mission before making
purchases. The $450 bed and $180 pantry brought his $1,000 starter balance
to $370. Both improvements and all three meals survived reopening the game.
The Player and Crew tabs showed their prerequisites and disabled unaffordable
skills. All 11 assertions passed with zero page errors. The session loaded
build `560e63659260` and reloaded `057ab10fa2c9`.

## Reproducing the checks

Run from the repository root. Choose a fresh external output directory for
each browser run.

```sh
node scripts/test_capital_domestic_view.mjs
node scripts/test_capital_home_upgrades.mjs
node scripts/test_capital_vehicle_variety.mjs
node scripts/test_capital_traffic_view.mjs
node scripts/test_capital_training_integration.mjs
node scripts/test_capital_city_training_ui.mjs
python3 -B scripts/check_capital_drive.py
python3 -B scripts/test_portal_discovery.py
python3 -B scripts/test_capital_home_training_browser.py --help
python3 -B scripts/test_capital_cache_browser.py --scenario build --output <fresh-directory>
```

The [repository review](arcade-repository-review-2026-11-26.md) includes the
portal measurements and the primary sources used for accessibility, domestic
visual references and rendering decisions.
