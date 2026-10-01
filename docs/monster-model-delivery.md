# Monster model delivery: mechanical archive audit

Delegation 21. Actual worker environment: provider `openai-codex`, model
`gpt-6.1-sol` (verified through `PI_PROVIDER` and `PI_MODEL`). Read-only delivery
inspection, not roster/model approval or publication authorization.

## Source and integrity

The operator supplied `original-monster-roster-80-glbs.zip` through the upload
channel. This delivery is the actual source evidence for these bytes; a prompt
alone is not provenance. The uploaded archive and every asset remain unchanged
in the upload location. No model, dependency, generator or preview was extracted,
vendored, patched, executed or registered in this repository.

| Measure | Actual |
| --- | --- |
| ZIP bytes | 6,820,191 |
| ZIP SHA-256, before and after | `ff7ff469e60829b23e0173e71f16a1c978c92f5bc04090504d6f5b7a6f4e1347` |
| Current roster SHA-256 | `7673827d68e1f38af48d3fd8eb903924f26d9518f72f872416e78c96ec1d3190` |
| ZIP members, CRC pass | 308 / 308 |
| Logical expanded payload | 16,403,504 bytes |
| GLBs | 90 |
| Species coverage | 80 unique / 80 expected |
| Species classification | 75 FAMILY-SHARED + 5 BOSS/UNIQUE-GLB |
| Retained family-base prototypes | 10, one per family |
| Structural GLB pass | 90 / 90 |
| Auditor process exit code | 0 |

The logical expanded payload is **not disk reclaimed or newly extracted**.
Initial disk guard returned `2.3G` free; no broad checkout or sparse manipulation.
Workspace growth is only this report and its stdlib auditor, below 1 MiB.

## Classification and outstanding delivery

Archive README explicitly says: “Prototype GLBs are separate working files and
do not count as species.” Its `prototypes/` description says “10 retained family
base GLBs, not species”. Their actual GLB extras say
`modelFlag: RETAINED-BASE-PROTOTYPE`, with matching family names and paths.
The extra ten files are therefore base prototypes, not extra species or horror.

| Finding | Names / paths |
| --- | --- |
| Missing roster species | none |
| Duplicate roster species | none |
| Unexpected/pending GLBs | none |
| Missing/duplicate family bases | none |
| Horror easter-egg model | **NOT DELIVERED**; no explicit archive documentation identifies one |

The user described one horror easter egg as coming soon. No spare GLB has been
assigned that role. Neither delivery nor structural passage approves the roster,
family silhouettes, bosses or horror design.

| Family | Shared exports | Unique boss | Base prototype |
| --- | ---: | --- | --- |
| Kilnback | 7 | Kilnarch | `prototypes/kilnback_base.glb` |
| Scoriwing | 8 | none | `prototypes/scoriwing_base.glb` |
| Cupfin | 7 | Vesselorn | `prototypes/cupfin_base.glb` |
| Bellstrider | 8 | none | `prototypes/bellstrider_base.glb` |
| Rootspindle | 7 | Rhizocairn | `prototypes/rootspindle_base.glb` |
| Canopyfold | 8 | none | `prototypes/canopyfold_base.glb` |
| Prismburrow | 7 | Spectrumor | `prototypes/prismburrow_base.glb` |
| Halofoil | 8 | none | `prototypes/halofoil_base.glb` |
| Hushcoil | 7 | Quiethelix | `prototypes/hushcoil_base.glb` |
| Echohoop | 8 | none | `prototypes/echohoop_base.glb` |

## Structural checks and limits

The auditor preflights paths, exact duplicates, case collisions, file/directory
aliases, encryption and Unix symlink/special-file flags before reading payloads.
Limits: fewer than 32 MiB total expanded bytes, at most 4,096 members, at most
8 MiB/member and expansion ratio at most 1,000. This archive passed every check.
All 308 members were read to EOF individually for CRC, including non-GLB content.
README and JSON metadata were parsed in memory; archive programs were not run.

Every GLB passed exact magic/version/length and aligned JSON+BIN chunk checks,
embedded buffer length/padding, all bufferView/accessor references and decoded
ranges, finite positions/normals/colors, uint16 indices and triangle alignment.
One scene, one static mesh node, one mesh, one mode-4 indexed primitive and one
opaque matte vertex-color material were checked. Normals are unit and agree with
flat triangle winding; vertex alpha is opaque. No textures, UV attributes, skins,
animations, morphs, cameras, Draco, Meshopt, external buffers or extensions were
found. Material metallic=0, roughness=1, neutral base color and no emission.

Dimensions below are from decoded POSITION values after the node matrix/TRS,
not manifest/accessor bounding-box assertions. All nodes have applied identity
transforms; ground Y and centered X/Z bounds also pass. Species dimensions match
both current roster batch tables and prompts within ±5%; decoded colors match
the roster sRGB palette converted to linear vertex RGB. All 80 manifest species
hashes, byte sizes and triangle counts match actual bytes. Prototype geometry
passes structural checks, but has no species-specific roster dimensions/budget.

| Tier | Species | Actual triangles, min–max | Current ceiling | Result |
| --- | ---: | ---: | ---: | --- |
| basic | 35 | 336–752 | 799 | pass |
| evolved | 40 | 396–1098 | 1,499 | pass |
| boss | 5 | 536–1672 | 2,599 | pass |

## Warnings: permissions, identity and unperformed QA

- `provenance.json` asserts creator “OpenAI assistant for the user”. Actual
  originating provider identity, authorship, exclusivity and upstream rights
  were not independently verified by this mechanical audit.
- README asserts: “The user may use, modify and redistribute these original
  deliverables for commercial and noncommercial purposes.” This is an embedded
  delivery assertion, **not legal clearance or verified broader publication
  rights**. The GLB usage-permission extras repeat this assertion. No CC0 claim
  was found in the inspected README/provenance/sample GLB permission metadata;
  any CC0 claim elsewhere would remain unverified, not inferred authorization.
- README describes its bundled three.js test code as separately MIT-licensed;
  `qa/three-r160/LICENSE` exists and passes CRC. It was not vendored or executed.
- Embedded retained-base hashes and component topology metadata are supplier
  assertions. Delivery establishes ten bases and 75 shared/five boss labels,
  not independently proven topology reuse, joined-manifold connectivity,
  anatomical attachment, unique boss silhouettes, +Z facing or visual quality.
  README explicitly describes overlapping closed shells, not a boolean-welded
  manifold. These are review limitations, not ignored failed assets.
- Archive README claims offline Node GLTFLoader and Blender importer tests, and
  explicitly says browser WebGL1/game integration were not performed. Those
  supplied test reports were parsed but not independently rerun here.
- **This audit is structural only. No loader, WebGL, browser, gameplay-scale
  screenshots, runtime performance or gameplay QA was performed.** Full-game
  smoke gate for all 113 registered games is still pending; this task contributes
  zero game-gate passes and no screenshots. No games were added and no push made.

## Reproduction and actual command digest

From the repository root, point `ARCHIVE` at the supplied upload without copying
it into the checkout:

```sh
python3 -B scripts/audit_monster_archive.py --self-test
python3 -B scripts/audit_monster_archive.py "$ARCHIVE"
```

Python syntax was checked in memory with `compile(...)` (no `__pycache__`).
Actual output digest:

```text
PASS: Python syntax
PASS: malformed ZIP paths/collisions/expansion/symlink/encryption/CRC; GLB exact length/chunks/external buffer/accessor bounds; JSON duplicates/nonfinite
actual CLI exit: 0
CRC: 308 / 308 GLB: 90 / 90
classifications: {'FAMILY-SHARED': 75, 'BOSS/UNIQUE-GLB': 5, 'family-base prototype': 10}
errors: []
```

The runnable trust-boundary self-test creates only tiny in-memory malformed ZIP
and GLB samples. The auditor outputs JSON with all hashes, dimensions, counts,
failures and separate warnings; any structural/coverage failure gives exit 1.
No failed asset is waived or repaired. Regeneration would require operator review.

## Species bytes and decoded measurements

Paths are archive-relative. `W × H × D` is meters, rounded for display only;
unrounded float values are in auditor JSON. All rows passed structure, roster
budget/dimensions/palette and manifest hash/bytes/count checks.

| Species | Archive path | Triangles | W × H × D | Bytes | SHA-256 |
| --- | --- | ---: | --- | ---: | --- |
| Cindupp | `glb/Kilnback/cindupp.glb` | 412 | 0.55 × 0.38 × 0.72 | 61040 | `962d32fbb8bbb279b391e44fab799379e7e97037dfb4e2c3727858cc615dbbd4` |
| Briknudge | `glb/Kilnback/briknudge.glb` | 544 | 0.78 × 0.55 × 1.02 | 78928 | `608b1a9ccd357ef97c4807882dcd03891e36c296d91cc4a375888419350bca6f` |
| Hearthol | `glb/Kilnback/hearthol.glb` | 676 | 1.05 × 0.72 × 1.34 | 96628 | `cd7e0705d5322bae79152bd2e0f53a8982abc2f7f202f83d072ed34db0c6eec9` |
| Tufflet | `glb/Kilnback/tufflet.glb` | 496 | 0.5 × 0.42 × 0.65 | 72344 | `b369ac696196d3fb53c870ec44ae379ceb8ae3395c21c4b6596774ef775588d8` |
| Clastump | `glb/Kilnback/clastump.glb` | 688 | 0.82 × 0.66 × 1.05 | 97984 | `29d6ed067c3516d3d8244dfb4291e20ab7ab9c9660333f6cafcfdaf0083d04cd` |
| Kilnarch | `glb/Kilnback/kilnarch.glb` | 1616 | 1.8 × 1.45 × 2.2 | 220880 | `fc2516813109c301f2cf8548e5e6cead7bb758c8bd56fc11c2e135d35c4972f8` |
| Sootnub | `glb/Kilnback/sootnub.glb` | 408 | 0.48 × 0.32 × 0.6 | 60644 | `e74dcecbf3f9a13bfcd5260b5509fb918ba80469ca26ba6295d66c1fedfe4cf5` |
| Ashbarrow | `glb/Kilnback/ashbarrow.glb` | 572 | 0.88 × 0.58 × 1.14 | 82376 | `97c7afa88909686b51d0b139b0b075f8af50e3437ff87df47102f41fee5ac176` |
| Flarivet | `glb/Scoriwing/flarivet.glb` | 612 | 0.58 × 0.62 × 0.42 | 89144 | `7c4dfeb53486a2b15567f6855c485269dd176d4e4f09471128bdadbeb97c6161` |
| Tarsail | `glb/Scoriwing/tarsail.glb` | 656 | 0.88 × 0.92 × 0.62 | 96844 | `cd7761f976b81aa32b715f182f8f4d8063b0f52a0025ceca7fe7737e76708708` |
| Crestoven | `glb/Scoriwing/crestoven.glb` | 740 | 1.22 × 1.26 × 0.8 | 109240 | `1200fde469ab0f8596a0b59facd427dd388b7509fb9ac023d23a7250b5427b5c` |
| Coppuff | `glb/Scoriwing/coppuff.glb` | 644 | 0.52 × 0.56 × 0.46 | 92980 | `d76f058acb596ffa129de25d7b6f1ab272d5fcb2d745216734594dd2c0ccb717` |
| Fluefrill | `glb/Scoriwing/fluefrill.glb` | 840 | 0.92 × 0.98 × 0.7 | 119904 | `84d8d944e0b406f88d0be782afb89a98f35b3c150e5abd1bd07e1875640c94d8` |
| Emberick | `glb/Scoriwing/emberick.glb` | 520 | 0.66 × 0.58 × 0.4 | 76904 | `51ad73a4138b7380d7a9997567d147f66cf23a98748105c165bfa68c8b38c145` |
| Brazifold | `glb/Scoriwing/brazifold.glb` | 556 | 1.06 × 0.9 × 0.62 | 82520 | `80c9939f23e7c34c6b7b00c1d2ad5d45e9cedd7b978ba77110c5018b2474e4f8` |
| Sparvane | `glb/Scoriwing/sparvane.glb` | 648 | 0.6 × 0.7 × 0.48 | 93808 | `f6fe027c79c6b12934af0db8f15b83d96517e36e2151d6e469320eefe64c684c` |
| Dewgob | `glb/Cupfin/dewgob.glb` | 536 | 0.58 × 0.34 × 0.68 | 77584 | `a08b6351b93c087acc98ffd949bdf9384d9027411c0426ccb256c4d7cd8339c1` |
| Runnelip | `glb/Cupfin/runnelip.glb` | 572 | 0.82 × 0.5 × 0.96 | 82392 | `089eafc856a75c438f8fa92eee463e91ea593a1cb2ae2964e8fd69d31854f142` |
| Basinull | `glb/Cupfin/basinull.glb` | 792 | 1.14 × 0.68 × 1.3 | 111184 | `ec1d4270f351ec98cee27f44a5697aac44643fd47a3de408797ecaca273ae4a0` |
| Driplug | `glb/Cupfin/driplug.glb` | 492 | 0.52 × 0.4 × 0.64 | 72004 | `850a9cf5dc84e335670d339a05a991a444d0649c2e52b840e7b352172b12e0bd` |
| Weirseal | `glb/Cupfin/weirseal.glb` | 576 | 0.88 × 0.64 × 1.06 | 84052 | `83dd8b3ea6013dcc9c849e2ae7a42d4f8d0b6f64936354b2c1d1da223136c9b9` |
| Vesselorn | `glb/Cupfin/vesselorn.glb` | 1128 | 1.95 × 1.3 × 2.25 | 153972 | `de4b15222fc8b0e7b8ae9bc68868a9ee546020e271e8f2d1c29d026b6a847799` |
| Poolbit | `glb/Cupfin/poolbit.glb` | 476 | 0.46 × 0.3 × 0.62 | 69656 | `799c7310c181a5a0c85111b74f63356dcdf2ed0bf015e3772d903ce1872d602a` |
| Troughlobe | `glb/Cupfin/troughlobe.glb` | 548 | 0.8 × 0.48 × 1.05 | 78864 | `c5b238f0eb2fb52d116e670de52e3f0ccbbcf0775766cb73b905a0bc68b0d4f8` |
| Rillipod | `glb/Bellstrider/rillipod.glb` | 656 | 0.46 × 0.65 × 0.48 | 94180 | `0d5d692ef6239c9a03bee672d099a6fcbb12d88fa21d9a4770c0c1e79081a7da` |
| Chimeford | `glb/Bellstrider/chimeford.glb` | 776 | 0.68 × 0.98 × 0.68 | 109652 | `e6ca4c484b604039a921ee282e06d295d01e264fd99dc7290a7437268aeb0a48` |
| Catarill | `glb/Bellstrider/catarill.glb` | 872 | 0.92 × 1.35 × 0.9 | 123520 | `ae0803e02e5f9a3d57355e94315ddb05b4b8831e369b90c859c9d6caff505253` |
| Mistank | `glb/Bellstrider/mistank.glb` | 588 | 0.56 × 0.54 × 0.54 | 84152 | `288cc55cba4edb76b59c21c5be4cfd6436c1ad931ba6a4746c9d783029dc8709` |
| Fogstilt | `glb/Bellstrider/fogstilt.glb` | 716 | 0.82 × 0.92 × 0.76 | 104308 | `6e7c39276b6f31031147491133b12de59b30a37f520ea16486feeacef520d17c` |
| Nacreep | `glb/Bellstrider/nacreep.glb` | 552 | 0.42 × 0.6 × 0.48 | 80704 | `67809a76efd302cc21e9ded7d81e794fd5965d542ea1297bb647dd84c41f955c` |
| Tidaloom | `glb/Bellstrider/tidaloom.glb` | 816 | 0.64 × 1.04 × 0.72 | 115728 | `6c7df5925881a4be7219300255339f25230bb449bbcddfc6c7bb96c08e753e16` |
| Pluvell | `glb/Bellstrider/pluvell.glb` | 652 | 0.62 × 0.82 × 0.6 | 93644 | `1b36ed1bb8a3a7c369f0b352958664707ec36ca98c737929ef4c3fab5dd46a22` |
| Budriv | `glb/Rootspindle/budriv.glb` | 562 | 0.44 × 0.32 × 0.72 | 81844 | `1c6094b18b81a5493219a67ce47597ffdfb1526097ba8017dc3d71c5cb0a7f12` |
| Vinchew | `glb/Rootspindle/vinchew.glb` | 652 | 0.68 × 0.5 × 1.06 | 93152 | `fd8c157912ada3c21566624a064cdd1932bcff6debd3dcfe093a07000d08e007` |
| Trellisect | `glb/Rootspindle/trellisect.glb` | 798 | 0.96 × 0.7 × 1.46 | 113704 | `a0ffec7f3570860effdca2ebf020810a29a86f6654a59400d67e8b239caa627a` |
| Loamtick | `glb/Rootspindle/loamtick.glb` | 604 | 0.48 × 0.36 × 0.66 | 87492 | `46de85b0dec5efeb4f866c7322a2a623f7c69a73d75d61d93b46668d8961f4ac` |
| Furrowisp | `glb/Rootspindle/furrowisp.glb` | 684 | 0.78 × 0.6 × 1 | 99264 | `af6b92c7586c0f7a4ec3d2f68c1a5b6ec51dc62eac297194ca43c3a8d6d03cfd` |
| Rhizocairn | `glb/Rootspindle/rhizocairn.glb` | 1074 | 1.85 × 1.4 × 2.35 | 151316 | `516db12d6df6f0d77b0af828f844097c724c2a51e07949455abbc4de180cf59d` |
| Pithnip | `glb/Rootspindle/pithnip.glb` | 556 | 0.4 × 0.3 × 0.64 | 80748 | `ed922c615a50da63a4963c46d557d4acd6be01fd7169d38e158ad1cd0f54175a` |
| Bolegraze | `glb/Rootspindle/bolegraze.glb` | 600 | 0.66 × 0.46 × 1.1 | 87692 | `7f66111b0da8da175cb5ae8878705a615732978a924def20b252f01cb2a96066` |
| Leafnock | `glb/Canopyfold/leafnock.glb` | 488 | 0.58 × 0.56 × 0.42 | 69724 | `5a2b99373b6e95350eb6ffc383ab25cc6b794381b5466c8e5633710c5367295c` |
| Veilbough | `glb/Canopyfold/veilbough.glb` | 460 | 0.86 × 0.84 × 0.62 | 66840 | `8757d33e814c5365968c735292d13ac3c3f238457df8ff7f4439f9790cf02fb9` |
| Coppicrown | `glb/Canopyfold/coppicrown.glb` | 608 | 1.2 × 1.16 × 0.84 | 88412 | `974f125e23cddbe05f219273c77d3dc93993380d715fd3b8f1719941bfe32a52` |
| Burruff | `glb/Canopyfold/burruff.glb` | 512 | 0.52 × 0.48 × 0.48 | 73808 | `8a3ec258b0c41d1a834e4a419465d1727156b96425044b0dc395d09f98ee3341` |
| Thornmantle | `glb/Canopyfold/thornmantle.glb` | 672 | 0.86 × 0.78 × 0.72 | 96132 | `b2df9166230d1c281139381fc5f2fc3372f13cb74fa1e3a41688f2361d812a53` |
| Mosskip | `glb/Canopyfold/mosskip.glb` | 408 | 0.6 × 0.46 × 0.38 | 59568 | `df5cf5dc9b41d3ddf835ec7dd288ae2db7c7778b851b824249760b80b42cdced` |
| Fernclasp | `glb/Canopyfold/fernclasp.glb` | 492 | 0.96 × 0.72 × 0.58 | 70932 | `73e6864373c19733cc1d45b2963476be0b51ceeeb659b824df6de8c0ea631694` |
| Sprigbell | `glb/Canopyfold/sprigbell.glb` | 502 | 0.62 × 0.64 × 0.5 | 72524 | `a116a95b3e55896dc2e315c4c24a07d7b7b4a52b30e1b2376a5f30eb00e4e083` |
| Shardip | `glb/Prismburrow/shardip.glb` | 404 | 0.5 × 0.34 × 0.66 | 60124 | `22cc0f5df7fa77cf2b4e7783cef5f710696ac400f01e8e046cc5e517f2a92f66` |
| Facetusk | `glb/Prismburrow/facetusk.glb` | 440 | 0.76 × 0.52 × 0.96 | 66216 | `30a12bcae0ca0486e274a94735a6a86e014913a444e6e61adaa624205b8291c8` |
| Geodelve | `glb/Prismburrow/geodelve.glb` | 496 | 1.04 × 0.72 × 1.32 | 74308 | `050a8c8ac44c5ba5bbb8fb6bf6457202299016f206f357f73efd8026303a4071` |
| Glimknob | `glb/Prismburrow/glimknob.glb` | 454 | 0.54 × 0.4 × 0.62 | 66508 | `bf235d48b2a5b9006a47af573458a94cd2a0af718d4aaf87b8af5613d1409cbe` |
| Latticlaw | `glb/Prismburrow/latticlaw.glb` | 1098 | 0.86 × 0.66 × 1.02 | 152940 | `51272f8e056e554f49c7449e2c7dc15ad0bc8540ce7dfa807f6ab3a56703f618` |
| Spectrumor | `glb/Prismburrow/spectrumor.glb` | 536 | 1.9 × 1.45 × 2.3 | 81460 | `8a57f5ed6ac65bd02349d51196da68fcc16f8f8db443e9eb2615830fc2931cb9` |
| Chalkit | `glb/Prismburrow/chalkit.glb` | 402 | 0.46 × 0.3 × 0.7 | 59444 | `92a23bbb91327280779f1609f02e7f6a959f33becbe5f152d2c2a0b4fa6adecc` |
| Opalden | `glb/Prismburrow/opalden.glb` | 444 | 0.74 × 0.48 × 1.14 | 66300 | `3c4d853ebd7555aae9f83179fe866de0074b60f69a99420990b5ca37c4993fc4` |
| Raymote | `glb/Halofoil/raymote.glb` | 424 | 0.62 × 0.6 × 0.3 | 61100 | `6ae0953ac4323a9225ee59bbcd152da831423e7cbeb1744dd6f72e4d89262103` |
| Lensfoil | `glb/Halofoil/lensfoil.glb` | 484 | 0.94 × 0.9 × 0.44 | 70084 | `fd1423399a597909701eec214c5d250f988eaa492783032ca9b09ed1039a83a9` |
| Aurelvane | `glb/Halofoil/aurelvane.glb` | 744 | 1.28 × 1.24 × 0.58 | 105248 | `82ea05660fc7380347e0a2f21b01ae32535869e4f619479447519b55e0219a41` |
| Glasprig | `glb/Halofoil/glasprig.glb` | 344 | 0.54 × 0.54 × 0.34 | 51316 | `77450e6d551aae7f3ed7cdbd97d82e363eac1414c2788b94bc171cd4711201af` |
| Refrafold | `glb/Halofoil/refrafold.glb` | 436 | 0.88 × 0.86 × 0.5 | 65632 | `8e1c57702382de55496917180aa1d9be5ce9735d18e0ef7b1e1e78d1bd57518a` |
| Lustrip | `glb/Halofoil/lustrip.glb` | 336 | 0.7 × 0.52 × 0.28 | 50324 | `ce7baf330cec59404fc01e1ef66b794358f4aa4fae0e041a79fa840ea8ce0f06` |
| Sheenlobe | `glb/Halofoil/sheenlobe.glb` | 396 | 1.1 × 0.82 × 0.42 | 58360 | `4a22cf9791a33522f636f253e901df383ea1a60b5b2d4dc211b9529085488c23` |
| Halodot | `glb/Halofoil/halodot.glb` | 492 | 0.68 × 0.74 × 0.36 | 70332 | `fca8e6a9a8369efec2c3c37d13c8adb7195faead28cd62046faafa82705873b8` |
| Murnub | `glb/Hushcoil/murnub.glb` | 624 | 0.52 × 0.3 × 0.6 | 85424 | `784cb513aa6e6ea6d27615837ecdd696f04f606105091bb696929f88b6b222ea` |
| Duskcurl | `glb/Hushcoil/duskcurl.glb` | 704 | 0.8 × 0.48 × 0.92 | 97528 | `7755048eb19f6a5c48cc4088ebee8740ddd599d781446143d3e762f6934d6554` |
| Velvetorque | `glb/Hushcoil/velvetorque.glb` | 736 | 1.1 × 0.66 × 1.26 | 102336 | `69b392fe24285d7c9b7f59d69a83ac67849e1a9e704d909985319d529e5ce316` |
| Hushpip | `glb/Hushcoil/hushpip.glb` | 592 | 0.48 × 0.36 × 0.56 | 81068 | `77acd8e14056772100a222412ea823d5d946b51527661000cc0b00bd18375606` |
| Nullwrithe | `glb/Hushcoil/nullwrithe.glb` | 972 | 0.86 × 0.62 × 0.98 | 131692 | `ff06225f4086e5fafabc7a25cc2caf5a663c2b71bfec43d062cd79e551f9e9c3` |
| Quiethelix | `glb/Hushcoil/quiethelix.glb` | 1672 | 1.95 × 1.35 × 2.1 | 221444 | `50676fa5753512108f4cf0169e068fa67dbb24d8661703951bac4791dc03ac7e` |
| Gloamlet | `glb/Hushcoil/gloamlet.glb` | 584 | 0.46 × 0.28 × 0.68 | 80032 | `69cc5016d860563918c4f2d772c861d31838245b2d067aa2c736ab032a530fa5` |
| Foldnacre | `glb/Hushcoil/foldnacre.glb` | 636 | 0.74 × 0.44 × 1.12 | 87244 | `d4c8f21741e52171440c80c8c4cdb5d3760fa84c4b236d7ae3070a0333a718b0` |
| Thrumkin | `glb/Echohoop/thrumkin.glb` | 752 | 0.54 × 0.58 × 0.3 | 101940 | `f073c9701dcc9136b7bfbe03aeaf028585928d5b6ee4946651213cab3730366d` |
| Ringmur | `glb/Echohoop/ringmur.glb` | 904 | 0.82 × 0.88 × 0.44 | 121416 | `777891d71faeefc242ab86e98d57294f49a4a6405729739bfa2de1ec3ff5e4c9` |
| Resonelle | `glb/Echohoop/resonelle.glb` | 1064 | 1.12 × 1.2 × 0.6 | 143336 | `5ca5a331e45e84c4a1720e044fba196123c0c3ed5cec1bfc0c02b6fed77eaa8d` |
| Pallbit | `glb/Echohoop/pallbit.glb` | 624 | 0.5 × 0.5 × 0.36 | 85392 | `eeb46062d1f6b5b00d0206961dc46a1d17324370936e653b6a0c71175d25b734` |
| Stillarch | `glb/Echohoop/stillarch.glb` | 648 | 0.84 × 0.82 × 0.54 | 89108 | `163957288f10cd53b7e394069581f27d84c8892cafb211449fc9b5887efdaaea` |
| Nimbloop | `glb/Echohoop/nimbloop.glb` | 584 | 0.6 × 0.56 × 0.26 | 81044 | `607808b8533b1635376cef3eea3b856e981e0946e5023382d62c97eb20229c0d` |
| Sablewheel | `glb/Echohoop/sablewheel.glb` | 608 | 0.98 × 0.9 × 0.4 | 84700 | `9c1d57992078a10a81462a4cb1aba6b854b699c649c6d0db80bc0ee7ab79f8a3` |
| Whisquet | `glb/Echohoop/whisquet.glb` | 624 | 0.62 × 0.7 × 0.38 | 86528 | `56b362b68472688a7d4061d30535357c9b093761723569255d1c567e76039219` |

## Family-base bytes

Not species; structural checks only. No horror attribution.

| Archive path | Triangles | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `prototypes/bellstrider_base.glb` | 352 | 50544 | `70793ff6480fb060746ea0d2c39dc9a8a796d8c999acced767bf6fc0a6573081` |
| `prototypes/canopyfold_base.glb` | 304 | 44052 | `9eb40d0e31d6e6a69d950d9435ad52a41091d36fba90244703c430a0e9ef119f` |
| `prototypes/cupfin_base.glb` | 272 | 40696 | `edb52b6eaf37ade3aef428e5dba5587efa16d02569ab27b8ec9b6ae894f7204c` |
| `prototypes/echohoop_base.glb` | 536 | 73648 | `77e004e064cf8485875b112bba89387c582ed1b83732507a4ef32f6e013bc9cd` |
| `prototypes/halofoil_base.glb` | 268 | 40464 | `39cfe398685d82a24164b38952cc26a2daa0ee57fe8dc61e78a82eef856bd6fc` |
| `prototypes/hushcoil_base.glb` | 544 | 73948 | `5cfd4afcabd7360f5cece31ba3447e5a47c6ab454f389fe5e7c7630b54e8dba1` |
| `prototypes/kilnback_base.glb` | 368 | 55176 | `63851e708e77ad86d7c273293ec97061d3031d4cc43718359c8bbab383842f6c` |
| `prototypes/prismburrow_base.glb` | 288 | 42736 | `a8643d7ff85950ed37962f953c0cbe84f0349f697236089e3ac5f3a6331cfe2a` |
| `prototypes/rootspindle_base.glb` | 360 | 52940 | `877f88f4279c0eeb7a2486acd16cd37a4fc5f0e9dd766ea29de5338aac9591b6` |
| `prototypes/scoriwing_base.glb` | 472 | 68956 | `4cf22edaec06f7147ae27890ad301c0cb46e1d6371d57961f173ca3fede98bab` |
