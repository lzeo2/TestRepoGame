# Sports presentation and stadium continuation

Owner order, 14 November 2026: improve Basketballer's player/court scale,
ball-follow stability and zoom, athlete variety, referee and whistle; make
stadiums visibly upgradeable in both Basketballer 246 and Footballer 227. Use a
swarm. The missing basketball listing is separately fixed by merged PR #10.

## Shared basketball dimensions and owners

`js/court-config.js` is the single court-foot contract: 94×50, rims ±41.75 at 10,
rim radius .75, three-point radius 23.75, free-throw X 28 and ball radius .4.
Match, visible markings/hoops, camera framing and diagnostic court data must
agree. Preserve ordinary club plots and saved progression; active matches are
not persisted, so this changes no live-match save schema. Root owns data metadata
and integration, not arbitrary render-only resizing of authoritative positions.

- S1 owns Basketballer Match and match regressions, using the shared dimensions.
- S2 owns Basketballer ActorFactory and actor regressions, with independent
  generic build/hair/skin/accessory variation and role-appropriate human heights.
- S3 owns new `camera-rig.js` and camera regressions. Root integrates World.
- S4 owns Basketballer `court-view.js`, new `stadium-view.js` and focused stadium
  tests. Root replaces the old venue presentation in World and maintains entry
  positions/colliders. No worker edits the source world JSON or root World.
- S5 owns Footballer World/new stadium presentation and its geometry tests,
  preserving football field/match/player/save contracts.
- S6 owns Basketballer new officiating/audio presentation modules and tests.
  Root integrates app audio and the World referee. Referees observe match events;
  they do not grant points, fouls, coins or progression.

All workers use bounded disjoint scopes, no push and exclusive commit windows.
Root owns both app UIs, economy tier metadata, basketball World/world fixture,
all written maintenance/source prose, subjective review and release.

## Interfaces

The basketball stadium exposes a root Group, bounded local collision boxes,
`setLevel(0..3)`, `update({time,match,cameraPosition,lowGraphics})`, detached
diagnostics and `dispose()`. Anchor is the old venue origin; playable floor is
local Y .175, matching Match group's existing origin. Court entry offset is on a
supported apron outside the baseline. Keep original grounds/access paths;
explicitly replace old court/hoop/stand visuals instead of stacking them.

Camera helpers accept current camera/target state, dt, viewport aspect, zoom,
orbit and match subject. Smooth both target and camera; ball bounce/flight or a
possession change must not snap the look direction. Clamp zoom against floor,
arena and sensible distance; preserve manual orbit and full-court/player modes.

Stadium tiers should be visibly distinct: base ground, bleachers/benches,
larger stands/scoreboard, then lighting/canopies/entrance. Purchases stay Game-owned
and persisted. Renderer and QA fixtures never award progression. High-tier
fixture screenshots must be labeled separately from naturally earned gameplay.

Keep local licensed dependencies and original geometry, bounded draws/resources,
working low graphics and complete disposal. No official likeness, branding,
new remote assets, protected game or shared-runtime mutation. New whistle uses
local synthesis with short breath/noise and stable tones rather than a siren sweep.

## Verification and subsequent work

Meaningful pure checks gate source milestones. Then one coordinated normal-input
browser pass checks actual cameras, player presentation, referee/audio lifecycle
and stadium purchase wiring; labeled visual fixtures cover expensive tiers.
Compare desktop/phone and both themes where relevant, record real counters and
limitations. Do not claim N100 hardware performance from software WebGL.

After this sports PR, continue Canberra in its own pass: less crowded road
presentation, clearer Manuka shops/pool, less subtext, robbery/carjacking/guns,
five-star wanted levels, vehicle/foot police, a gentler hospital transition,
visible drivers, food shops/gyms, buses and more realistic original materials.
Preserve real-source geography and the separate Street Life/Free roam rules.
