# Original Three node fog/daylight consumer

`weather-view.mjs` implements an original consumer for the existing original weather DTO. It imports only `weather.mjs`; actual Three 0.186.0 and TSL are injected. Three's local `src/nodes/fog/Fog.js` was read for its public `fog(color, factor)` API, not copied as a Wings shader. No retained Wings source/shader, generated bundle, art or new dependency is used. Upstream game/model rights remain held; reported GPT asset creation/scoped permission does not clear upstream code.

## Handoff API

```js
const view = createWeatherView(THREE, TSL, { scene, sun, ambient, sampleDaylight });
view.applyEnvironment(frame);
view.stats();
view.dispose();
```

`scene` is a real `THREE.Scene` in the host's shared world frame. `sun` and `ambient` are distinct real lights with finite initial intensities. Both must already descend from that actual scene, directly or through groups. A nearer different Scene in the parent chain is a different owner, even if nested under this scene. Constructor ancestry validation happens before fog installation or lease acquisition. `sampleDaylight(simulationMs)` is a trusted **pure** callback returning exactly `{sunIntensity, ambientIntensity, fogColor:[r,g,b]}`: intensities 0..1000 and linear RGB 0..1. The callback is called on valid-frame application, not used as a timer or sampled from current light values. Do not let it mutate scene/lights/ownership.

The returned API is frozen. One WeakMap lease owns each scene; a second owner is rejected before changing the scene/lights. One fog node and four uniforms (composed base density, sea density, falloff and linear fog color) are allocated per instance. Applications update those same nodes in place, not graphs/materials. `stats()` returns frozen scalar diagnostics, not mutable uniform or authority handles.

`applyEnvironment` accepts the actual four-field environment/publication DTO: `{simulationMs, weather, visibility, minimumTransmittance}`. It validates the entire weather sample, metadata density/wind/preferences, composed density and daylight return before the first uniform/light write. Missing/unknown fields, nonfinite/out-of-range numbers, mismatched sample time and malformed callbacks reject while preserving the preceding valid adapter state. It also rejects after disposal, an external replacement of its owned scene fog, or either light being reparented/detached from its scene. A guard covers the **entire** application transaction (validation, callback and commit); nested application rejects before a second daylight callback or any nested writes. A `finally` releases the guard on every error, so a later valid application can proceed. The authority's `visualTransmittance` API supplies the shared density validation bounds; that validator call is not presented as a GPU parity test.

The installed graph uses **`frame.visibility`**, including base fog, never the weather-only `.weather.visibility`. Fresh daylight intensities are multiplied exactly once by `.weather.atmosphere.sunScale/ambientScale`. Daylight fog color is used directly; there is no invented palette, cumulative attenuation or weather reset of a moving sun. A zero daylight intensity stays zero at night. Reapplying an equal/frozen paused frame changes no physical light/fog value. Restart-time frames are accepted without adding a second clock.

## Exact world-ray optical definition

The factor passed to `TSL.fog(colorUniform, factor)` is `1 - transmittance`. Endpoints are actual `cameraPosition` and fragment `positionWorld`, with +Y height and Euclidean ray length, not view-Z/squared fog.

```text
rho(y) = fogBase + fogSea * exp(-max(y,0) * fogFalloff)
lo = min(cameraY, fragmentY); hi = max(cameraY, fragmentY); dy = hi-lo
under = max(0, min(hi,0)-lo)
start = max(0,lo); span = max(0,hi-start)
above = exp(-start*falloff) * (1-exp(-span*falloff)) / falloff
mean = dy < 1e-8 ? exp(-max(0,(lo+hi)/2)*falloff) : (under+above)/dy
factor = 1-exp(-rayLength*(fogBase+fogSea*mean))
```

This is the same sea-level-crossing integral as the original `weather.visualTransmittance`, including equal-height and fully underwater rays. The graph uses TSL `Fn`, actual uniforms/world accessors and safe denominators. Both exponential differences use the fifth-order `x-x^2/2+x^3/6-x^4/24+x^5/120` for nonnegative `x < .01`; polynomial input is capped at .01 even in the unselected large-ray branch. The near-zero height denominator is capped independently, so the unused crossing branch remains finite. The final factor is clamped to [0,1]. There is no constant-density linear or squared-fog substitution.

## Ownership and lifecycle

Construction captures the prior fog node and light intensities but changes only `scene.fogNode`. Invalid constructor inputs reject before installing a graph/lease. Disposal is idempotent, releases the scene lease and disposes only its owned root fog node. It restores the prior scene fog only if the scene still references this adapter's node. Each light is restored only if it still belongs to the original scene AND its current intensity still equals that adapter's last write; external light changes are preserved. Lights reparented to another scene or detached after binding are never restored by the old owner. Application checks both ancestry chains before validation/callback work and again before committing, so ownership loss cannot write foreign lights. Lights never written by this adapter are not rewritten on dispose. No caller scene, light, material, mesh or texture is disposed. External fog replacement is preserved, and the old owner cannot apply another frame after that conflict.

The parent may return `{parent:scene, applyEnvironment:view.applyEnvironment, dispose:view.dispose, presentation:...}` from its presentation factory once its once-only lifecycle hook is in place. This file does not edit composition/session code or claim that hook exists. Multiple clients need distinct scenes/leases, not two adapters that fight over one scene.

## Verification boundary and remaining host work

Actual local commands completed by this owner:

```sh
node --check Games/Wings/authoring/weather/weather-view.mjs
```

The separate test owner owns `weather-view-check.mjs`; this owner ran the full independent check unchanged after the bounded correction: **7/7 CPU groups PASS**, including reentry rejection before a second callback, later valid recovery, real FC composed density, independent CPU quadrature, stable uniforms and real GLSL/WGSL MeshBasicNodeMaterial graph generation. These are generated graphs, not GPU compilation, shader numerical parity or native pixels.

Additional in-memory actual-Three probes pass wrong-scene constructor atomicity (no fog install/lease poisoning), grouped descendants, cross-scene reparent/detach rejection before callback/writes, preservation of lights now belonging elsewhere and nested-scene ownership. Earlier unparented-light ad-hoc construction examples are superseded by this explicit ancestry contract. No independent test file was edited or weakened by this owner; the test owner may add further ancestry regressions separately.

This consumer is for native Three WebGPURenderer/node-material scene fog. Custom shader/material pipelines or materials with fog disabled still require explicit host wiring. GPU compilation, pixel parity and actual scene/native performance remain unverified. Rain particles, cloud rendering, legacy lightning coexistence, wind/flight forces, sun orientation and whole-game atmosphere integration remain unintegrated host work. No clock/RAF, randomness, particle/lightning/wind implementation, browser, build, install, served replacement or push is part of this lane.
