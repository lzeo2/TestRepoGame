# CITISTEN day/night look API

`Games/Citisten3D/daynight.mjs` exports `createDayNight(scene)`; `createWorld`
already creates this as `world.dayNight`.

```js
world.dayNight.setPhase(.5); // noon / construction phase
world.dayNight.setPhase(0);  // midnight / siege look
// Systems interpolates its own transition progress into a continuously changing phase:
world.dayNight.setPhase(.5 + transitionProgress * .5);
```

Phase is a cyclic finite number: 0 midnight, .25 dawn, .5 noon, .75 dusk,
1 midnight. Negative and >1 values wrap; NaN/infinite values throw. The look
uses a smoothstep over the solar cosine, interpolating solid sky, ambient and
hemisphere colors plus warm sun/cool moon intensities. There is no autonomous
clock, phase progression, wave trigger or simulation state. A discontinuous
caller phase jump intentionally applies immediately; systems must provide
continuous phase values for a timed transition. `setPhase` returns daylight
blend 0..1, and `.phase` reads the wrapped input.

Day uses warm directional sun, ambient/hemisphere fill and an analytic sky SH
LightProbe. Night uses cool moonlight and warm, variably lit facade emission.
The probe is an analytic approximation, not captured reflection data or baked GI.
`lights` exposes `{ambient,hemisphere,sun,moon,probe}`. Sun/moon shadow casting
switches with their intensity; 2048px PCF maps use bias -.00015 and normal bias
.045m. `follow(camera)`, called by `world.render`, centres shadow coverage around
the camera with a 75..360m half-width. Far shadows are therefore bounded, not
whole-map cascades. World block/contact AO supplements this local coverage.
No downloaded environment, bloom or postprocessing. ACES tone mapping is in
world composition. Window emission does not cast point-light pools onto roads.
`dispose()` removes lights/targets and frees shadow maps. One world owns its sky.

Regression checks cover noon/midnight, wrapping, invalid phase and gradual
color/intensity changes. QA night/day frames are visual look evidence only,
not acceptance F zombie/wave behavior.
