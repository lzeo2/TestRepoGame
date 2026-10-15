# Changelog

## 2026-10-15 fleet maintenance (unreleased)

- Added two operator-approved original procedural Wings aircraft GLBs and
  fixture checks (`39f4ef3`). Not picker-integrated; no rendered-flight acceptance.
- Strengthened Wings fail-closed menu tests (`1b1915b`), without runtime/gameplay
  changes. Pinned staging source remains unavailable.
- Added a measured portal payload regression (`3ab3c1a`), with no runtime speed
  rewrite; final local budget passed desktop/mobile, not target-device profiling.
- Improved portal filter recovery, keyboard focus and compact layout (`5ed48f4`).
- Added subpath-safe portal metadata, sitemap, local manifest/icons and browser
  selection metadata (`2680ee0`). Static per-title crawler metadata remains
  incomplete; light launch colors do not force installed light mode. Baseline
  analytics absence was preserved, not silently changed.
- Recorded failed-gate triage (`ce00dea`) and portal timeout diagnosis (`1462411`).
  Refreshed maintenance coverage from 118/123 to 125 registered/130 projects,
  preserving historical manual URLs and adding bounded missing manuals.

**Release held:** unchanged full smoke **122/125, exit 1**. Jetpack request failures
and post-Wings Server Survival/Astray context stalls remain unresolved. Targeted
passes do not replace the full gate. Original history regression, real-Snake
fullscreen, source/rights and static SEO holds remain. Five inherited personal-
identity commits require operator-directed remediation; no history rewrite here.

No games added, ingested or registered in this fleet run. No push. See the
[seven-lane handover](docs/maintenance/audits/fleet-2026-10-15-handover.md) and
[completed QA report](docs/maintenance/audits/fleet-2026-10-15-lane6.md) for actual
commands, counts, temporary screenshot labels, storage and pending tickets.
