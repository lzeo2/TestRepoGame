# Original car studies: optimized studio

The owner requested a more realistic rendered Pip using Astra, plus an original retro compact capturing only a general aesthetic/feel and avoiding copied vehicle designs/assets. The owner directly approved simplifying glass refraction after the first preview timed out. This is **two showcase models, not two new games or a live-fleet replacement**. No MINI/OEM badge, downloaded photograph, texture or mesh. A different name/minor edits are not a legal guarantee; these are newly authored fictional designs, not branded replicas.

## Source and rendering

Genuine `openai-codex/gpt-6-astra` workers108/109 returned exit0 and committed `4a51831` (Pip) and `ecf6bc9` (Brindle). Main added the offline studio/test at `2d6a557`; optimization `cf02803` changes only the showcase renderer and check.

- `assets/car-arcade/showcase/pip.js`: fresh `createCar()` group, original curved red body/ivory roof, separate paint/glass/chrome/rubber/interior.28,704 triangles,22 meshes.
- `assets/car-arcade/showcase/brindle.js`: distinct five-door original retro hatch, paired projectors/horizontal lamp outline and vertical rear clusters.28,008 triangles,30 meshes.
- Both: four separate wheels, forward -Z, fresh resources per call; viewer disposes unique geometry/material sets. Mirrors are included in measured widths. No global model cache or imported artwork.
- [Open the studio](../assets/car-arcade/showcase/index.html): local r160 renderer, original procedural softbox environment, glossy physical paint, shadows, keyboard/buttons/drag/touch. No external HDR, postprocess dependency or raster picture masquerading as geometry. Existing shared local fonts/OFL and renderer MIT notices remain; [source record](car-arcade-sources.md).

Approved optimization uses alpha/specular thin glass, disables transmission's additional framebuffer pass and forces one transparent pass. High-detail geometry, paint clearcoat, reflections and studio lighting are retained. This deliberately approximates thin glass, not full refraction. Rendering is event-driven instead of continuously spinning at idle. Target-device FPS remains unmeasured.

## Actual checks and limitations

The first full-glass native attempt exited1/51.27s, readiness `Timeout20000ms exceeded`. A separate passive diagnostic exited1 on load `Timeout30000ms exceeded`; no page/console error was emitted. Both logs remain outside Git, not rewritten as success. No wait/assertion inflation followed.

After the owner's optimization approval, the frozen `scripts/test_car_realistic_studio.py` run atcf02803 exited **0/86.13s**. Real factory geometry was inspected, not substituted: finite attributes, bounded meshes/triangles/dimensions, grounded four wheels, physical materials, no maps, unique resource disposal, optimized live-glass flags, real car selection/rotation, keyboard, actual touch at390px, reload, local-only requests and stable source hashes. Errors:0. This is a studio check, not natural gameplay, target hardware, copyright or automatic photorealism certification.

Main personally opened both front/rear renders. Gloss/reflections and smoother surfaces improve the original samples, but they remain stylized studies, **not accepted as fully photorealistic**. That review also found Pip's floating roof/seams and Brindle's open body caps. These demonstrated geometry defects were assigned to genuine Astra110 for a bounded correction; final outcome/captures are recorded below, not assumed from node checks.

## Final source/image checkpoint

Astra110 timed out **143** without commit or reply, leaving two small model edits. Main inspected the patch, independently checked finite geometry/budgets and checkpointed it at `38f93b0`: crowned supported Pip roof, door seams projected onto the actual hull, matching Brindle end caps and hatch closure. The worker timeout is not rewritten as completed verification. Pip now29,792 triangles/22 meshes; Brindle27,880/30; shader optimization is unchanged.

The committed successor native run exited **0/86.48s**. Main opened both front/rear images and saw the specific open caps/floating seams corrected. A390px image then showed camera cropping; `2c3cbb8` frames from aspect ratio and adds real projected-bounds assertions, without test timeout inflation. **Final frozen native check: exit0/85.97s**, zero recorded errors, both complete-car bounds/optimized-glass conditions, real input/reload and source-hash stability passed. Five reviewed [actual-render JPEGs](car-realistic-previews/brindle-front.jpg) total221,398 bytes; [Pip](car-realistic-previews/pip-front.jpg), [Brindle rear](car-realistic-previews/brindle-rear.jpg), [Pip rear](car-realistic-previews/pip-rear.jpg), [390px studio](car-realistic-previews/390-brindle.jpg). No photomanipulated/generated raster asset is substituted for the model. The narrow view fits completely but uses a conservative distant camera.

These are **more detailed, glossy stylized car studies, not a finished photorealism claim**. Primitive seats, glazing/pillar transitions, headlamp refinement, realism and GPU performance still need work. No source/frame-rate/rights guarantee comes from triangle counts or a passed browser script. Native ledgers retain `car-realistic-native-attempt1`, `car-studio-diagnostic`, `car-realistic-native-optimized1`, `car-realistic-native-repaired` and `car-realistic-native-final` basenames outside Git. Actual assistant records confirm openai-codex/gpt-6-astra for108/109;110 source/session record is separately retained with its timeout.

Final source/syntax/AST/privacy checks pass. Existing16-car factory regression exits0; maintenance checker prints `PASS: 122 game documents cover 115 registered + 7 unregistered games; Git inventory current.` Git comparison confirms all game/Core/catalog/live-fleet/factory/vendor bytes unchanged from1e8a2b2. Sparse baseline remains assets/docs/scripts. Studio44K, selected captures232K allocated; final free2,304,876,544 bytes (shared filesystem, not isolated savings). No newly owned browser/test server remains. No new-game build/register pair applies to this model-only run.

No game/fleet/Core/catalog/vendor changes, new registration, publication or push. Existing Garage/2048/full-gate holds are unchanged. The16-car gameplay factory stays at its previous budget; these28k showcase meshes are not silently installed into mobile games.
