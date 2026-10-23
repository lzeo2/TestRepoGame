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
preferences the core team could not anticipate. The relevant pattern is a
supported creative workflow, not merely exposing mutable internal objects.

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

## Integration contract

The three selected transfers are **diagnosis, milestone grants and bounded
recovery**, chosen for current architecture fit, not as a universal ranking of
Skylines features. `sim.mjs` remains authoritative; `ui.mjs` displays state and
events only. No new random draws, network dependencies or rendering assets.
Existing seeded traffic and sieges are not replaced or reseeded.

Implementation details and fresh verification are recorded below after the
coordinated events-system source commit. The canonical maintenance manual and
inventory are owned by the concurrent save/terrain lane; this study is not a
replacement for its runtime handover or the full pre-push fleet gate.
