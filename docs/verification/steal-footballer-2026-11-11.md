# Steal a Footballer: skills, rivals and models, 11 November 2026

The owner requested better hair, signature skills, NPC progression, more skill
moves and better dribbling animation, using an agentic swarm. The earlier
low-impact playtest authorization continues. The owner also requested a localhost
server for personal testing and a complete model wishlist for Dot. No production
deployment or push was requested.

## Source and scope

This continues the [10 November source-first work](steal-footballer-2026-11-10.md)
after the repository was fast-forwarded to `31680023`. No game was added,
ingested, replaced or registered: 132 catalog entries, 138 maintained projects
plus shared runtime. Source identities, kit/appearance metadata, notices and
local Three.js are retained. There are no new runtime external loads or build
dependencies.

### Committed implementation

| Commit | Change / reviewed scope |
| --- | --- |
| `4e75a759` | Fitted curved scalp, rooted braids/locs, curved nape/tail and R9 front patch; actor regression guards. |
| `f1853ea3` | Complete roster model manifest, 125 IDs mapped to 124 likenesses. |
| `7d92ac4e` | Intermediate hair-volume adjustment; superseded by the visual correction below. |
| `981f172a` | Delegation 19: persistent active rival development in game state and detached regressions. |
| `bf22d05e` | Root visual correction: fitted hairlines with overlapping swept locks and curl/afro clumps; no lifted pointed cap. |
| `c42114be` | Delegations 21/22: dropped recruits retain training eligibility; successful delivery removes it. |
| `15e236be` | Delegation 20: dribble gait, signature poses, synchronized visual ball touches and on-demand stepped pose preview. |
| `2ddd1260` | Delegation 18: 12 merged skills, six new mechanics, independent opponent skills and development-based timing. |
| `7392b902` | Delegations 24/25: stable action focus identity during live panel refresh. |
| `374aba86` | Root UI/contract integration, shared definitions in the album, skill descriptions/cost/status, rival training feedback and browser checks. |
| `9dabdcb5` | Complete Dot handoff with all roster entries, model families and signature animation requirements. |
| `275238d9` | Keep a bounded 20-second browser click wait on the skill activation check. |

Workers used the requested `gpt-6.1-sol`, bounded tasks and explicit-path
commits, with no push. Root reviewed actual diffs and owns visual/UI judgment.
Delegation 23 independently reviewed skill legality/state and found unsafe
numeric override values and substitution inheritance. Both were fixed with
regressions before the skill commit. Delegation 26 independently reviewed the
renderer and found no further actionable integration defect. Root also changed
the app to supply the renderer's already-created match snapshot so simultaneous
skill records reach presentation without another snapshot allocation.

## Gameplay

The six existing featured skills retain their IDs: Messi's Dribble Glue,
Cristiano Ronaldo's Rocket Shot, Mbappe's Speed Burst, Neymar's Samba Step,
R9's Stepovers and Yamal Superstar's Wing Weave. They are joined by:

- Maradona: Slalom, linked close direction changes.
- Zidane: Roulette, a shielded turn with an exit.
- Ronaldinho: Elastico, an outside-to-inside change of direction.
- Henry: Finesse Finish, a bounded bonus from a suitable shooting angle.
- Beckham: Bending Delivery, curved pass flight and a small receiving bonus.
- Maldini: Anticipation, defensive lane reading and a bounded interception reach.

Attacking skills require possession and a legal opportunity; Anticipation is
defensive. Stamina and shared home cooldowns apply. Numeric overrides are
validated; substitutions clear outgoing actor-bound skills/control while
preserving cooldowns. Skills do not guarantee successful dribbles or goals.
Urgent close finishing, manual Icon shooting and keeper restart guards remain.

NPCs use a separate skill state, cooldown and stamina. Named moves or role-based
fallbacks cover attack and defense. Their seeded decision interval improves
from 5–8 seconds at development level 0 to 3.5–6.5 at level 5; skill cooldowns
still limit actual activations.

Saved `npcActiveSeconds` counts clamped active club ticks with no offline grant.
Training pauses in matches and caps at 900 seconds, one level every 180 seconds.
Generated recruits train through levels 0–5. Roster targets grow from three to
four at level 2 and five at level 4, respecting refill/shield delays. Practice
XI gains 4% stats per level alongside the existing win-based tier, frozen at
match creation. Delivered recruits stop automatic NPC training; dropped recruits
return to it. Transferred owner recruits retain their own development.

## Appearance and Dot handoff

All 11 hair families use fitted foundations and attached details. The root
review rejected the intermediate raised crown shape, then reviewed the revised
front/quarter views across all families. Actor geometry remains merged into six
articulated meshes. Dribbling uses shorter alternating strides, torso lean/twist
and balancing arms. Signature poses differ. Render-only ball touches remain
under half a world unit, share the foot rhythm, and are excluded for stationary
carriers, goalkeepers, flights and restarts.

The [complete Dot wishlist](../steal-footballer-model-wishlist.md) covers all
125 entries/124 likenesses, shared bodies/rig, 11 hair families, four facial-hair
treatments, other people/crowds, 37 current prop families, optional existing
mechanic visuals, common locomotion and all 12 signature animation families.
The [roster manifest](../steal-footballer-roster-models.json) provides stable IDs,
variant/head reuse, source appearance hints, kit colors and existing reference
metadata. Bespoke likenesses, clean skinning and authored motion are the highest
value external work; procedural props are optional polish. GLB delivery budgets
are proposed. Imported-character loading/retargeting is not implemented.

## Verification

All five focused Node suites passed: input, game, match, actors and world.
Six authored modules and the inline model-preview module passed parsing;
the Python browser runner passed AST parsing. Catalog validation and the added
source external-load/path scan passed. Diff checking passed with only Windows
line-ending notices.

Actual output excerpts:

```text
PASS input shortcuts, native activation, stable dataset/id/position rerender focus and modal tab containment
PASS actors: adult proportions; 11 fitted hair styles/cache disposal; 125 source profiles x3 kit patterns; max 2946 triangles; geometry release.
PASS syntax: six authored modules
PASS catalog: 132 unique entries, schema valid, all URLs tracked.
PASS authored additions: no new HTTPS loads or machine-specific source paths.
PASS Dot wishlist: all 125 IDs mapped to 124 likenesses, complete roster table
```

Match checks cover all 12 definitions with source overrides, distinct new
mechanics, defensive legality, NPC state isolation, malformed values,
substitution cleanup, development timing and eight complete seeded simulations,
plus existing finishing/contact/restart/reward checks. Game checks cover active
tick clamping, no offline training, legacy saves, save/reload, squad growth,
actual stat improvements, shield/refill timing, battle freezing and delivered
recruit protection. World fixtures retain 3,095 + 261 source primitives and
report at most six meshes / 2,850 triangles per actor; three-kit actor checks
reach 2,946 triangles.

The first quick browser attempt reached the signature cards, dispatched an
Activate click, then timed out after five seconds while waiting after the click.
It is not counted as a completed acceptance run. The rerun used a bounded
20-second click timeout and retained the cooldown-change assertion. The first
documentation check also refused the uncommitted runner change; that source was
committed and inventory refreshed before repeating the check.

The rerun stopped earlier at `drag and drop tactics apply source formation`:
the saved formation did not satisfy the expected `4-3-3` assertion. The cause
is not established. No third broad browser attempt was made. **Current browser
acceptance is incomplete**, including activation outcome, live refresh focus,
current mobile panels and full reward/debrief. The first attempt did reach
22-player match play, paused income, moving players, spectators, all 12 signature
definitions and their descriptions. Historical November 10 checks are not
counted as fresh acceptance of this follow-up.

The on-demand pose preview passed five movement families at two stepped times
without browser exceptions; its browser closed. Documentation verification
passed after source commit/inventory refresh:

```text
PASS pose preview: five movement families at two stepped times; no browser exceptions.
PASS: 138 game documents cover 132 registered + 6 unregistered games; Git inventory current.
```

### Reviewed captures

- [Swept hair and R9 patch](steal-footballer-2026-11-11/hair-icons-quarter.png)
- [Long hair and ponytails](steal-footballer-2026-11-11/hair-length-quarter.png)
- [Fade, cropped and curls](steal-footballer-2026-11-11/hair-short-quarter.png)
- [Braids, locs and afro](steal-footballer-2026-11-11/hair-texture-quarter.png)
- [Bald and accent examples](steal-footballer-2026-11-11/hair-bald-quarter.png)
- [Dribble stance](steal-footballer-2026-11-11/dribble.png)
- [Roulette](steal-footballer-2026-11-11/roulette.png), [next stepped frame](steal-footballer-2026-11-11/roulette-step.png)
- [Elastico](steal-footballer-2026-11-11/elastico-step.png)
- [Anticipation](steal-footballer-2026-11-11/anticipation.png)
- [Desktop match from the first partial attempt](steal-footballer-2026-11-11/desktop-match.png)
- [Incomplete browser-attempt record](steal-footballer-2026-11-11/browser-attempts.json)

## Operating limits and storage

The localhost server is explicitly owner-requested and remains available for
personal testing at port 4173. QA browsers close after their bounded runs. They
use isolated storage and do not alter the owner's live save or Roblox state.
Quick mode omits complete-match browser reward/debrief checks; neither attempt
completed even that mode. Node full matches do not replace browser acceptance.
Exact likeness, physical-device
performance, full browser match outcomes and real-session 20–30-minute
first-superstar pacing remain open. No full-fleet release gate or push occurred.

Game Git source grows from 2,861,215 to 2,905,371 bytes (+44,156), still 30 files.
Working-tree CRLF sizes differ from Git blob sizes. Approximately 107 GiB free
was observed before the final browser pass. Pre-existing `.gitignore.txt` and
legacy `react-app/` leftovers were preserved; a concurrent untracked `.pi/`
directory was also left untouched.
The 13 retained evidence files total 1,055,488 bytes; final observed free space
was 110.63 GiB. Concurrent disk use means this is not an attributed workspace
storage delta. The tracked game-source delta above is measured from Git blobs.
