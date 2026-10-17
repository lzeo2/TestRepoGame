# Wings aircraft acceptance

## Scope

Repair the existing F-15 and F-35 integration following the reviewed gaps and
the operator's instruction to proceed. This checklist supplements the standing
aircraft quality contract and the Pi's subsequently committed v2 brief; it does
not claim that their acceptance gates have passed.
No game, weapon type, online service, or registration is added.

## Model and runtime requirements

- Study the original five selectable aircraft and their material conversion,
  pivot, store, afterburner, camera and weapon conventions before editing.
- Keep each jet recognizable, with its existing scale and coordinate convention:
  forward -Z, up +Y, identity root. The orchestrator reviews actual renders.
- Use a dark neutral body palette consistent with the original aircraft,
  approximately #1d1f20 to #2c2f30, with readable panel, glass and metal separation.
  Confirm the converted in-game appearance; raw material values are insufficient.
- Connect visible missile stores to the existing weapon slots and visibility
  mechanism. F-35 internal-bay presentation must use its bay anchors and respond
  to the existing weapon state. Static anchors alone do not satisfy this rule.
- Connect actual exhaust pivots to the existing afterburner mechanism. Exhaust
  must respond to throttle/boost without introducing a replacement renderer.
- Derive cockpit, weapon and exhaust transforms from the actual geometry.
  Preserve the original five aircraft and simulation mechanisms; the two jet
  loadouts follow the v2 brief and the recorded arcade tuning decision.
- Preserve deterministic stdlib generation, indexed geometry, finite attributes,
  original provenance, offline closure, and the documented per-model budgets.
  Do not raise the 1,200,000-byte ceiling or triangle bounds to fit the repair.

## Evidence required

1. The model checker passes against committed bytes and repeated generation.
2. Regression checks require resolvable stores/exhaust nodes and exercise their
   actual converted runtime behavior. They must not require empty feature lists.
3. Rebuild from the documented clean source pin and reviewed patch. Generated
   browser/test bundles are never edited by hand. Check clean-pin applicability.
4. Review rendered front, rear, side and cockpit views of both jets, including
   weapon and exhaust states. Record the host and distinguish a standard-Three
   model preview from Wings' native renderer.
5. Exercise native flight, boost, weapon fire, menu return and fresh restart on a
   supported renderer. Keep this acceptance open if the renderer cannot run.
6. Preserve historical failures and the fleet release hold. A fresh unchanged
   125-game gate is required before a separately authorized push.

CPU, fixture, geometry and documentation passes establish only their own checks.
They do not establish native gameplay, visual approval, rights or release status.
