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

Day uses warm directional sun, soft ambient and hemisphere. Night keeps dark
blue ambient, subdued hemisphere and cool directional moon so silhouettes stay
visible. No gradients, environment downloads, shadows, bloom or postprocessing.
`lights` exposes `{ambient,hemisphere,sun,moon}` for diagnostics. `dispose()`
removes lights. One world owns its scene background.

Regression checks cover noon/midnight, wrapping, invalid phase and gradual
color/intensity changes. QA night/day frames are visual look evidence only,
not acceptance F zombie/wave behavior.
