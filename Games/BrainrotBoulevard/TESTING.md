# Verification: After Dark revision

## Automated checks

- `npm test`: **42 tests** covering the original game plus the added material, asset and shrine behavior
- `npm run check`: syntax checks for all five source modules
- 2,000 mixed economy actions check ownership, unique IDs, capacity, money, and save round-trips
- The first eight prices/incomes and their collection indices are preserved. Existing version-1 saves remain compatible; ninth-character ownership and shrine claims round-trip
- Every remodeled original has finite vertex data, ground alignment, a 2.3-unit normalized height, and PBR maps. Budgets assert under 30,000 triangles and at most 35 draw meshes each
- All 25 authored procedural surface profiles have meaningful color, height and roughness variation. Color maps are sRGB; packed data maps are linear. Texture/material pooling and safe shared-resource disposal are checked
- Animation preserves gameplay root transforms and does not alter other clones' rigs or materials
- The bundled secret GLB is checked against the earlier snarl asset's exact SHA-256. It contains 13,926 triangles, four materials, four embedded image resources, no external buffers/images, and no required compression decoder
- The real bundled GLTFLoader parses the secret's geometry, materials and embedded image Blob references. Pixel decoding is stubbed in Node; this test does **not** claim browser image decoding or GPU validation
- Optional GLB loading does not keep the original eight behind a disabled Start button. Secret load failure/retry, one shared loading promise, pending-root hydration, disposed-root safety, shared clones, ground alignment and preserved low-crawl proportions are checked
- Shrine tests cover three unique discoveries, full base rejection, free claim, no duplicate claim, persistence, rebirth reactivation, delivery to the player's base, and physical accessibility at the north-east perimeter
- Full gameplay initialization and transitions run using real Three.js scene objects, a fake DOM, and a stubbed renderer: purchases, shields, stealing, banking, bat recovery, simultaneous theft, pause/hidden tab, collision bounds and repeatable performance-mode toggle
- The real local HTTP server serves every source module, all vendor dependencies, CSS and the GLB. Responses and MIME types are verified, including `model/gltf-binary`; nonexistent files return 404
- Runtime imports are local and all required vendor files are bundled. No CDN, account, API key or remote asset is required

## Asset budgets

| Original creature | Draw meshes | Triangles |
| --- | ---: | ---: |
| Loaf Penguin | 12 | 12,604 |
| Espresso Octopus | 33 | 24,384 |
| Cactus DJ | 17 | 22,920 |
| Lunar Cow | 14 | 22,002 |
| Disco Banana | 17 | 14,412 |
| Cosmic Duck | 12 | 16,496 |
| Volcano Ravioli | 13 | 19,072 |
| Noodle Dragon | 13 | 17,234 |
| The Uninvited, original GLB | 4 | 13,926 |

Original-eight PBR resources: 25 surfaces, 51 shared 256×256 RGBA maps, 12.75 MiB raw CPU pixel storage before mipmaps. The secret GLB has its own embedded maps. These are asset metrics, **not a measured frame-rate guarantee**. Performance mode turns off real-time shadows and caps pixel density; it is the default on coarse-pointer devices.

## Offline visual inspection

`previews/brainrot-creature-lineup.png` is a labeled **offline Blender asset render** of the actual updated meshes and PBR maps, plus the exact secret GLB. It is not a screenshot of the game. The eight models are exported from `createCollectible` without geometry changes. See the render pipeline's README and validation JSON for method/source details.

The renders check character identities, face direction, limbs, eyes, texture readability, and clipping. Each panel is independently framed for clarity, so it is not a consistent-scale reference. Blender studio light, shading and tone mapping differ from the browser's dusk scene. These remain realism-inspired stylized game characters, not photogrammetric or photographically indistinguishable subjects.

## Verification limits

The earlier baseline's interactive cloud-browser preview was blocked with `net::ERR_BLOCKED_BY_CLIENT`. That restriction was respected and not bypassed for this revision. **No actual browser playtest, WebGL screenshot, GPU shader compilation check, device frame-rate measurement, or real touch-device test was completed.** Node/HTTP checks and offline asset rendering do not substitute for those stages.

## Recommended first manual check

1. Extract everything, run `npm start`, and open http://localhost:8080. Confirm the title screen reports the secret ready
2. Start, buy a conveyor creature with E, approach its pedestal and zoom closer to inspect its surface/face; orbit to inspect other sides
3. Buy or steal three different originals, leave one slot free, and walk around the north-east base to the shrine. Press E and check the ninth model in your base
4. Revisit the shrine to confirm no duplicate, reload to check persistence, and verify collection shows nine entries
5. Raid an unshielded rival, escape to your base, and bat a thief before it gets home. Test shields and Q return
6. Open collection/upgrades and resume; paused time should not earn money
7. Toggle Performance mode twice. Confirm quality switches without changing the collection; assess frame rate on the actual device
8. On touch hardware, check thumbstick, camera drag, interact, bat, pause and menu buttons in both orientations
