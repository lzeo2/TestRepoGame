# Cities: Skylines patterns for Citisten

## Scope and evidence

Research retrieved 23 October 2026, about the **original Cities: Skylines**, not
its sequel. This is a design interpretation of developer interviews and reviews,
not an experiment proving which feature caused how many sales. No source code,
art, wording, trademarks or online services are being imported into Citisten.
Network access was used for this document only; gameplay stays offline.

Sources actually fetched and read:

- **[S1] Matthew Handrahan, GamesIndustry.biz, 2 September 2015:**
  [Colossal Order: Selling Cities: Skylines](https://www.gamesindustry.biz/colossal-order-selling-cities-skylines).
  CEO Mariina Hallikainen describes launch expectations, streamer outreach,
  publisher fit and committing an engineer-year to modding support.
- **[S2] Simon Parkin, The New Yorker:**
  [In Search of the Keys to the Virtual City](https://www.newyorker.com/tech/annals-of-technology/cities-skylines-and-the-search-for-the-keys-to-the-virtual-city).
  Includes designer Karoliina Korppoo on streaming, modders on authorship,
  and Parkin's own city-building and financial mistakes.
- **[S3] Alex Wiltshire, Rock Paper Shotgun, 10 February 2017:**
  [Why road-building in Cities: Skylines is a pleasure](https://www.rockpapershotgun.com/2017/02/10/cities-skylines-roads/).
  Interviews Korppoo and programmers Damien Morello and Antti Lehto about
  traffic rules, legibility, resource buffers and accommodating different goals.
- **[S4] Alex Wawro, Game Developer, 4 August 2015:**
  [Cities: Skylines dev: Don't punish your players; teach them](https://gamedeveloper.com/design/-i-cities-skylines-i-dev-don-t-punish-your-players-teach-them).
  Reporting and direct quotations from Korppoo's GDC Europe design talk;
  covers contextual guidance, recovery, rewards and modding.
- **[S5] Christopher Livingston, PC Gamer, 10 March 2015:**
  [Cities: Skylines review](https://www.pcgamer.com/cities-skylines-review/).
  First-hand assessment of traffic, district policies, progression, economic
  forgiveness and, importantly, opaque demand/abandonment feedback.
- **[S6] Paul Dean, Eurogamer, 4 September 2014:**
  [Cities: Skyline is out to satisfy where SimCity couldn't](https://www.eurogamer.net/articles/2014-09-04-cities-skyline-is-out-to-satisfy-where-simcity-couldnt).
  Pre-release interviews with Hallikainen and Korppoo; intentions are not
  treated as proof of shipped behavior without the later sources above.
- **[S7] Alex Calvin, GamesIndustry.biz, 13 July 2022:**
  [12m sales and counting: What's behind Cities: Skylines' building success?](https://www.gamesindustry.biz/12m-sales-and-counting-whats-behind-cities-skylines-building-success).
  Hallikainen revisits player freedom, continued support, community marketing
  and the limits of explaining the game's sustained sales growth.

Access limits: the direct [GDC Vault case-study player](https://www.gdcvault.com/play/1022809/Cities-Skylines-a-Case)
returned HTTP 200 but only a maintenance page, not a playable talk. The
[Game Developer video announcement](https://gamedeveloper.com/design/video-postmortem-reflections-on-the-success-of-i-cities-skylines-i-)
was accessible and identifies Korppoo's GDC Europe 2015 presentation; this study
uses S4's written coverage, not an unwatched video as evidence. Google/DDG
search were challenged; canonical article URLs worked. An advisor source-
discovery ticket was opened before direct URLs arrived from the operator.

## Success factors and transfer verdicts

### 1. Visible systemic cause and effect

**In Skylines:** Players see an intersection back up, deliveries stop and local
businesses suffer, then can change the road layout and observe the result.
S3 explains that early, more chaotic behavior was simplified specifically so
players could diagnose causes. S5 praises overlays and building warnings but
also reports unexplained demand droughts and abandonment. The lesson is not
that Skylines made every variable transparent; it is that understandable
consequences make a simulation satisfying, and opaque exceptions weaken it.

**Transfer: yes; first priority.** Citisten already calculates utilities, service
radius, crime, jobs, taxes and residential demand in one deterministic economy
tick. It can report the actual growth gates without another simulation in the
HUD. A concise diagnosis is more valuable here than a new overlay engine.
Jobs increase demand but are **not** a hard prerequisite for residents; advice
must never invent a mandatory commute or employment gate. The displayed whole
population can also seem stuck while fractional residents are still arriving.

### 2. Milestone pacing and useful rewards

**In Skylines:** Population progression introduces new services and transport
options instead of presenting every management problem immediately (S5).
Korppoo also describes rewards and unique buildings that encourage continued
play and trying another city, rather than treating an imperfect first city as
wasted effort (S4). A milestone makes accumulated improvement tangible and
gives the player a next objective. This is a combination of onboarding,
recognition and renewed resources, not merely a congratulatory notification.

**Transfer: yes; second priority.** Citisten already emits an event every 500
residents. Named, once-only population thresholds with small budget grants can
reuse that boundary and the events board. Grants are safer than withholding
essential power, water or defense buildings: its existing simulation and short
sessions assume those tools are available from the start. Do not implement
cross-city unlock persistence, technology trees or forced objective chains.

### 3. Recovery instead of erasing the player's work

**In Skylines:** S4 reports Korppoo's view that a dysfunctional city is already
punishment enough. Avoiding a conventional game-over state lets a successful
rescue build attachment. S3 describes buffers and even removal of cars in
hopeless gridlock, illustrating that simulation fidelity is subordinate to
playability. This is not immunity: S2's financial crisis and S5's abandonment
show that poor planning still has consequences. The desirable loop is mistake,
recognition, intervention, recovery, rather than an immediate reset.

**Transfer: partial; third priority.** Free-build already has gradual abandonment
and no zombie defeat. Defense currently freezes everything the instant the
hall reaches zero HP, despite surviving buildings and budget. Retaining the
ruined hall as a repair target and allowing one timed rebuilding interval per
collapse fits the existing repair action. A surviving city is not necessarily
recoverable financially, so retain an eventual loss and restart. Do not add
loans, resurrect destroyed neighborhoods, award a victory for a lost wave or
pretend this is Skylines' completely open-ended recovery model.

### 4. Traffic and transport that reward planning

**In Skylines:** Trips and goods move through actual networks, so a service's
mere existence is insufficient: access and journey times matter (S3, S5).
Transit expertise from Cities in Motion gave the developer a focused strength.
Players can experiment with real junction ideas and see a functioning route
as evidence that their plan worked. Crucially, S3 also describes shortcuts and
simplified rules: this is legible simulation, not a promise of perfect urban
engineering realism.

**Transfer: partial.** Citisten has road-path cars, directed-segment occupancy,
jams and parking, but its capped traffic does **not** drive employment,
deliveries, service response or growth. Roads already matter economically via
power/water network connectivity. Keep those consequences honest and explain
them first. Adding public transport or linking every citizen to a commute
would require new authoritative state, balance and performance work, not a
surgical transfer. No such traffic rewrite is part of this change.

### 5. Districts and policies as self-expression

**In Skylines:** District-level regulations let players give neighborhoods
identities without applying the same rule everywhere. S5 describes local tax,
industrial and transport policies; S6 discusses ecological versus industrial
city visions. Names, layout and policies support different definitions of
success rather than a single optimal score. They turn the city into a personal
project, which also supplies stories worth sharing (S2).

**Transfer: partial.** Citisten's 8x8 utility-shedding districts are capacity
allocation units, not player-authored policy areas. Its global tax rate and
free/defense choice already permit a little expression. A district policy
would need explicit ownership, local economic effects and UI feedback; simply
painting names would overstate the feature. Keep this for a separately bounded
simulation change after present cause/effect is readable.

### 6. Slow, explainable play that produces watchable stories

**In Skylines:** Korppoo tells Parkin that its slow pace gives streamers time to
explain plans while creating unusual places (S2). Hallikainen describes a
specific pre-launch creator campaign and entertaining failed cities, not only
expert play (S1). S3 also identifies the pleasure of watching an intersection
between decisions. Thus audience appeal combines understandable intentions,
visible consequences and room for commentary; slow timers alone are not the
success mechanism.

**Transfer: yes, as a supporting quality.** Deterministic steps, pause and
existing speed controls already let Citisten players explain and inspect a
city. Persistent events, named milestones and a stable diagnosis improve that
story without recording, streaming SDKs or network features. Do not add forced
waiting: preserve existing speeds, and describe defense's urgency honestly.
Streaming discoverability itself cannot be guaranteed by code.

### 7. Modding and community ownership

**In Skylines:** S1 identifies serious up-front engineering for modding and the
long sales tail/community visibility it enabled. S4 distinguishes approachable
map editing, asset creation and deeper code mods; S2 describes players making
and sharing buildings. This supplies variety and lets the community express
preferences the core team could not anticipate. In S7, Hallikainen again calls
community self-expression central to the game's lasting appeal. The relevant
pattern is a supported creative workflow, not merely exposing mutable internal
objects.

**Transfer: no for this implementation; partial long-term.** Local ES modules
make authored changes possible, but Citisten has no stable mod API, import
validation, save compatibility or rights workflow for player content. Executing
untrusted JavaScript or fetching workshop assets would violate the bounded,
offline runtime scope. Preserve the existing simulation/rendering separation;
consider validated local layout data only with an explicit later order.

### 8. Trust, product focus and the market opportunity

**In Skylines:** Offline play, room to build and custom content addressed
well-documented frustration around SimCity (S1, S5, S6), while the interviews
stress a long-standing creative goal rather than an opportunistic clone.
Hallikainen credits a well-matched publisher and carefully targeted creator
outreach (S1). A compact team selected strengths it could execute rather than
matching every possible feature. These commercial conditions matter alongside
design and prevent attributing success to a mechanic checklist alone.

**Transfer: yes for focus and offline trust; no for recreating the market
moment.** Citisten already runs local simulation and local assets with no
accounts or runtime third parties. Preserve that, ship small improvements to
the existing game, and keep rendering/performance acceptance separate from
feature claims. A browser city builder cannot inherit a 2015 PC-market opening
or a publisher's audience by adding a milestone button.

### 9. Continued support and a durable community

**In Skylines:** In S7, Hallikainen attributes longevity partly to expansions,
community work, marketing on new platforms and players returning during the
pandemic. The interview reports six million sales in 2015–2019 and another six
million in the following three years. Crucially, she explicitly says the team
cannot fully explain why this game's sales kept growing. Ongoing support keeps
a personal city and its community relevant, but the sales pattern does not
prove any single update or feature caused retention.

**Transfer: partial.** Small compatible improvements, tested saves and honest
maintenance notes can protect investment in a Citisten city. The concurrent
save/terrain lane owns persistence; this study must not duplicate it or promise
compatibility it has not tested. Paid expansions, a workshop ecosystem and
platform marketing are not tasks for this compact static game.

## Integration contract

The three selected transfers are **diagnosis, milestone grants and bounded
recovery**, chosen for current architecture fit, not as a universal ranking of
Skylines features. `sim.mjs` remains authoritative; `ui.mjs` displays state and
events only. No new random draws, network dependencies or rendering assets.
Existing seeded traffic and sieges are not replaced or reseeded.

### Landed behavior

1. **Milestones:** five finite thresholds, with no essential tools locked:

   | Residents | Name | Once-only grant |
   | ---: | --- | ---: |
   | 500 | First neighborhood | $750 |
   | 1,000 | Town center | $1,000 |
   | 1,500 | Borough | $1,250 |
   | 2,000 | Small city | $1,500 |
   | 2,500 | City hub | $2,000 |

   The existing economy tick awards every newly crossed threshold, adds each
   grant to budget and emits its name/threshold/grant. The HUD shows the next
   population target and reward; the events board announces earned milestones.
   Multiple awards in one batch have distinct keys. The saved high-water index
   prevents repeated grants after abandonment, regrowth or reloading. There are
   no recurring grants after City hub, no cross-city rewards and no new tech tree.

2. **Diagnosis:** every five simulated seconds, compare the whole population
   against the previous sample. If it did not increase, report the most common
   failing home gate using the **same** reason that decides whether that home
   grows: power, water, service radius or crime. Ties follow home iteration order.
   With no such blocker, explain absent homes, full capacity, high taxes, low
   residential demand or slow remaining capacity. A growing city hides the
   panel at the next sample. This is one actionable current constraint, not an
   exhaustive forecast or a new growth formula. A transient problem between
   samples may never be shown, and fractional growth can produce a slow-growth
   message without being a literal zero-growth state. Civic events from the
   concurrent lane still affect the underlying economy normally.

3. **Defense recovery:** a zero-HP hall stays in the building list and occupied
   cell, so the existing Repair tool can select it. It consumes no utilities
   and provides no service while ruined. The attacking wave and defenders
   withdraw without kills or a night-survived score; other surviving buildings,
   roads, population and treasury remain. A daytime **120 simulated-second**
   rebuild window starts, with economy and civic events still running. The HUD
   gives persistent remaining-time and Repair instructions. Paying the existing
   full-damage repair price, **$240**, restores the hall and a fresh 240-second
   preparation day; future waves still escalate. Hall reconstruction takes
   priority over a coexisting water-main leak, which remains separately
   repairable. Expiry emits one normal loss and freezes play. Pause freezes
   grace; faster speeds consume it faster. Mode switching and night skipping
   cannot bypass it. No neighborhood resurrection or bailout money was added.

New published state is `nextMilestone`, `growthSamplePopulation`,
`growthDiagnosis` and `rebuildRemaining`; the existing saved `runtime.milestone`
now indexes the finite list. The save lane reused exported `MILESTONES` in
snapshot validation and tested grace, paid repair, loss and earned rewards.
No new randomness, clocks outside simulation time or UI-owned decisions.

### Coordination and verification

Research commit: `e24a620`. Shared implementation waited for events/snapshot
commit `799e1ab` and regression commit `aceaeb6`, then landed directly on their
shared branch descendants: **`579d089`** (simulation/HUD) and **`b7ee9ab`**
(regressions). There was no divergent branch to rebase and no replacement of
the other lane's files. The save lane separately owns `sim-snapshot.mjs`,
native/persistence/terrain changes and canonical manual/inventory updates.

Fresh commands and actual output against the combined source:

- `node --check Games/Citisten3D/sim.mjs`, `ui.mjs`, `sim-check.mjs`:
  exit 0, no syntax output (each path checked individually).
- `node Games/Citisten3D/sim-check.mjs`: exit 0. Existing civic, snapshot and
  skip groups passed, followed by:

  ```text
  MILESTONE CHECK PASS: natural first three, all five named grants, exact budget, multi-crossing, pause and no regrowth/reload farming
  DIAGNOSIS CHECK PASS: five-second cadence, power/network cut, water, services, crime, capacity, taxes, low demand, baseline jobs and reload
  RECOVERY CHECK PASS: natural fall, retained city, pause/10x, exact 120s expiry, paid native-tool rebuild, next wave, mode/skip guards and save replay
  ```

  The natural three-night siege now loses at `t=948.25s`, exactly 120 seconds
  after the hall fell; total hall damage remains 600 HP. Some additional
  threshold/growth cases deliberately set residents in headless fixtures to
  isolate rules; they are not claims of native-input play.
- `node Games/Citisten3D/save-check.mjs`: exit 0, `SAVE CHECK PASS`, including
  deterministic continuation, naturally earned milestone continuity and
  naturally reached hall recovery followed by loaded repair/loss.
- `node Games/Citisten3D/native-check.mjs`: exit 0, `NATIVE CHECK PASS` for
  shared tool validation and stable model synchronization, not browser play.
- `git diff --check`: exit 0. Own runtime changes add no URLs, imports,
  third-party loads, assets or portal changes.
- Catalog JSON/schema/unique-ID/tracked-URL audit:
  `CATALOG PASS: 128 unique IDs, required schema, URLs tracked by Git`.

A serialized system-Chromium UI-fixture slot passed in **58.58 seconds**, with
zero page errors/external requests, unchanged sim/UI/CSS hashes and explicit
browser/server cleanup and slot release. Eight local-only images under
`.tmp/citisten-skylines-ui/` cover `diagnosis` and `recovery`, `dark` and `light`,
and widths `1440` and `390`. All eight were visually reviewed: next-target
copy wraps without overflow, diagnosis/countdown and event text are readable,
and management controls remain separate. The empty world is visibly labelled
**UI fixture**: this proves display/layout only, not native placement, combat,
GPU performance or offline asset closure. An earlier attempt stopped on the
fixture script forgetting to reset its diagnosis between themes; no production
fault or pass was claimed, and cleanup ran before the corrected run.

The [canonical manual](maintenance/games/241-citisten3d.md) and inventory are
updated by the concurrent save/terrain lane. The first coverage-check attempt
reported `Inventory stale: inspect changes, then run --refresh.` after source
commits; the lane then refreshed its owned inventory in `fbe733b`. A fresh
`python3 -B scripts/check_maintenance_docs.py` returned:

```text
PASS: 134 game documents cover 128 registered + 6 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Its subsequent native capture timed out at navigation before any assertions or photos
(46.415 seconds including cleanup); this is **not** native acceptance. Full
registered-game smoke, native recovery interaction and hardware/FPS acceptance
are not established by these headless/UI checks. No game was added or registered
and no push was attempted.
