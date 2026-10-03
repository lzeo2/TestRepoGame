# Saved finishes and mounted pursuit weapons

Owner explicitly requested customization and car-mounted weapons/countermeasures, including a smoke screen. This extends existing unregistered Slipstream Borough, not a new game or a new registration. Main implemented the change directly; no new worker delegation is claimed.

## Garage and controls

- Free body paint and wheel finish using native color inputs, saved separately for each owned car. Apply finish saves first; the real model changes on the next frame. Cosmetics do not alter stats.
- Buy/fit one **smoke screen** (150 cash) or **fictional EMP emitter** (250 cash) per owned car. Purchased kits remain owned; switching/removing one costs nothing. Native garage selector/button shows price or ownership. No default grant.
- Smoke: three charges per new pursuit, five seconds of following-cop disruption, ten-second cooldown. Cops behind within100m and3.5m lateral of the player's wake slow to35% of player top speed and track weakly; affected cops cannot advance containment. Traffic collision damage still applies.
- EMP: two charges per new pursuit, three seconds of nearby-cop slowdown, nine-second cooldown. Euclidean65m radius, target8% of player top speed, weak tracking and no containment from affected cops. Ahead-braking cannot override that slowdown.
- **Space / E or touch Deploy** uses a charge. Holding/repeated keydown does not auto-fire, cooldown blocks use, pause/hidden tab stops simulation/effect timers, transitions clear queued input. Racing has zero charges and hides Deploy.
- Free new-pursuit refills are a bounded arcade simplification, not an inventory economy or real equipment claim. Smoke/EMP are nonlethal fictional gameplay effects; no instructions for constructing or deploying real weapons. Neither pays rewards nor removes body damage.

## Core/save ABI

Source `37228a8`, containment correction `00605e2`. New exports: deeply frozen `GADGETS`, copied `customizeCar(profile,id,{paint,wheels})`, copied `fitGadget(profile,id,kind)`. Existing exports and mechanics retained.

Same scoped storage key `slipstream-borough-v1`; canonical **profile version2** adds `customizations` keyed only by owned car IDs. Each value exactly `{paint,wheels,gadget,gadgets}`; colors strict six-digit hex, selected kit none/smoke/emp, at most two distinct known purchased kits, mounted kit must be owned. Version1 migrates in memory to stock finishes/no kits through descriptor-safe validation. Loaded raw bytes remain the same-read comparison token until an explicit normal save. Unknown/accessor/bad fields reject; no origin-wide clear or atomicity/security guarantee.

Run freezes `{appearance:{paint,wheels},gadget,charges,deployments,gadgetTime,gadgetCooldown,gadgetHeld}`. Capacity/remaining/used/timers are validated; `stepRun` optionally accepts boolean `deploy` alongside the three existing inputs. Settlement additionally checks appearance/mounted kit against the current reserved profile. No ongoing run restored or refunded.

## Renderer ownership

Shared16-car factory/fleet/vendor bytes unchanged. Slipstream privately clones just the current body/wheel materials, disposes these clones on replacement/teardown and never changes cached shared materials/geometries. Original rear canisters/roof coil are viewer-owned meshes; twelve bounded instanced smoke puffs and a short-lived pulse ring reflect actual active run timers. No physics/fluids/electronics fidelity claim. Read-only detached snapshot includes actual model colors, mounted kit and effect visibility; no setters/grants.

## Executed verification

- `node --experimental-default-type=module scripts/test_slipstream_core.mjs`: **15/15 groups pass**, including migration/copy/hostile descriptors, purchases/ownership, charges/race disable, deterministic effects/cooldown/hold/expiry, collision damage, no gadget payout and ahead-cop containment. Funded/controller/owner-code fixtures remain explicitly synthetic, not native earning.
- `xvfb-run -a python3 -B scripts/test_slipstream_gadgets.py`: first source37228a8 **exit0/189.9259s**; final strengthened source00605e2 **exit0/205.6968s**, zero recorded errors/local-only requests. Ordinary starter race earned904 cash; body/wheel finish applied through native form, kit bought/mounted with earned funds, reload retained it, keyboard deployed smoke and touch deployed EMP with measured actual police slowdown. Pause froze effects; racing disabled use;320/390 no overflow and44px Deploy. No cheats/preterminal profile/state grants. Actual complete-campaign balancing/hardware/release remain unverified.
- Main opened all three final source [game captures](slipstream-gadget-previews/garage-smoke.jpg): [smoke](slipstream-gadget-previews/smoke-pursuit.jpg), [390 EMP](slipstream-gadget-previews/390-emp.jpg). They show actual customized car/mounts/effects, not photo-quality fleet artwork. External final scratch basename `slipstream-gadgets-l35mvhrw`; logs/result basenames `slipstream-gadgets-native-{1,2}`.

## Separate cockpit improvement

Showcase-only `2d6a5e0` adds original physical radio faces/tuner typography and softer dashboard finish. [Brindle cockpit](car-photo-previews/brindle-cockpit-radio.jpg), [Pip cockpit](car-photo-previews/pip-cockpit-radio.jpg), [390 cockpit](car-photo-previews/390-cockpit-radio.jpg). Main opened all three and will display an inline image instead of the previously unviewable link. This does not install driving cockpits in the live game.

Stub-canvas geometry/resource checks pass twice each: Pip29,166 triangles/26 meshes; Brindle29,378/35; each9 textures/983,040 base RGBA bytes. Real visual-only capture **exit0/83.9972s**, exact actual cockpit eyes, nonblank images, frozen source hashes, no recorded errors. External scratch `car-studies-visual-r6ki7qix`, ledger `car-cockpit-radio-visual`. Appearance remains stylized; the separate unchanged20s studio gate still has its previous first-frame failure and was not rerun or cleared by this longer capture. Hardware FPS, photorealism, full release and Garage reset holds remain separate.

No new game, catalog registration, downloaded asset, shared-factory replacement, publication or push.
