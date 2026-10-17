# Aircraft repair study

## Baseline and interfaces

Studied source pin `bf5f6277e38ee52e9bfa4ae4a01337b46175c181` with the current
port patch, original selectable models and renderer. The committed v2 brief and
standing quality contract supersede the earlier unattributed-draft assumption.
Keep the stricter repository 2 GiB disk floor.

| Original aircraft | Asset triangles | Asset bytes | Relevant mechanism |
| --- | ---: | ---: | --- |
| F/A-18 | 16,896 | 912,784 | Four missile pivots, ammo-linked stores, twin afterburners |
| A-10 | 17,576 | 952,180 | Store groups follow actual seat/weapon slots |
| YF-12 | 18,028 | 780,572 | Internal missile pivots and twin afterburners |
| Apache | 11,322 | 745,072 | Spinner/pod pivots use the rigid skeleton converter |
| B-2 | 4,740 | 283,788 | Hinged covers follow the bombardier firing state |

`aircraft.ts` converts named pivots into rigid bones, merges material batches,
and hides depleted stores using ammunition/capacity. Two visible stores need a
two-round slot. Afterburner discs and generated cones are separate emissive
batches; throttle and boost drive their visibility/glow. Generic paint conversion
lifts near-black inputs, so the repair preserves authored hull colors for these
two jets only. The original five retain their conversion behavior.

`seekerAxis` uses the nose for seat zero, including a radar missile; the officer
uses the existing aim rules. `muzzlePosition` originally used generic radius-based
rails. Optional model-derived coordinates now align these two jets' launch points
with their GLB nodes. Independent ancestor-matrix and rotated world-position tests
pass; the original five retain their generic fallback.

## Appearance review and references

The first previews showed dark paint, external F-15 missiles and recessed F-35
stores behind covers. Root requested broader F-35 forebody/chines, integrated
trapezoid intakes and corrected metric dimensions. Revised front, side, top and
open-underside views were reviewed before approving geometry milestone `92e470f`.
Final raw family views compare original F/A-18 and A-10 under identical lights;
each camera fits its own model, so they do not compare absolute scale.

Primary references, used for study rather than geometry or texture input:

- [USAF F-15 fact sheet](https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104501/f-15-eagle/source/f-15-eagle/): approximately 19.44 m long, 13 m span.
- [USAF F-35A fact sheet](https://www.af.mil/About-Us/Fact-Sheets/Display/Article/478441/f-35a-lightning-ii-conventional-takeoff-and-landing-variant/sf2589626/f-35a-lightning-ii/): approximately 15.7 m long, 10.7 m span.
- [DVIDS F-35A forebody photograph](https://www.dvidshub.net/image/9588495/f-35a-lightning-iis-arrive-misawa-air-base), Gavin Hameed.
- [DVIDS F-35A in-flight photograph](https://www.dvidshub.net/image/6973276/aerial-refueling-f-35a-lightning-iis-during-operation-iron-dagger), Braden Anderson.

Against those views, the draft F-35 had overly detached intake shoulders and a
thin pointed forebody. The revised geometry addresses those observations. The
photographs remain external study material.

## Loadout decision

Reuse existing weapon kinds and IDs with distinct arcade fits: F-15 gun and
heat-seeker plus officer Maverick; F-35 gun and radar missiles in both seat slots,
with its existing stealth rules enabled. Both retain four removable stores and
two-round slots. These are arcade choices, not operational-aircraft claims.

Fresh CPU checks pass stores, exhaust, covers, distinct fits, stealth and launch
positions. Final Windows Edge WebGPU checks pass normal keyboard takeoff/climb/
turn, boost, cockpit/chase, cannon fire, Escape, menu return and fresh restart for
both jets, without console/page errors or external requests. Root reviewed the
saved `previews-v2/` images. Forward cockpit views are usable; black coaming/nose
geometry remains visible below the reticle. Headless pointer-lock acquisition
failed, but keyboard fallback worked. Physical mouse capture, missile combat,
audio, converted family parity, Pi GPU behavior and load-time comparison remain
unverified. Fleet evidence is recorded after the unchanged full run.
