# Hard-edged shelf review

Date: 2026-10-01. Portal only; no new games, no push.

## Tokens

| Surface | Radius |
| --- | --- |
| Cards, search, sort, theme control, dialogs | `--radius: 6px` |
| Tabs, badges, heart/info, Play and secondary actions | `calc(var(--radius) - 2px)` = 4px |

One independent radius value applies to both themes. The large-radius alias
references it. Legacy footer brand/separator/year spans are hidden; useful
footer actions remain. Bundled code is unchanged.

## Screenshot review

All 30 revised captures were personally inspected. Scores are subjective
self-review, not independent operator approval. 8 means a coherent, readable,
usable shelf; remaining limitations are uneven upstream thumbnail resolution
and intentional initials for missing art. Mobile hover is a touch-emulated
state, not a claim that touch devices have persistent hover.

| View | Theme | Base | Hover | Focus | Puzzle filter | Search |
| --- | --- | --- | --- | --- | --- | --- |
| 390×844 | Light | 8.5 | 8.5 | 8.5 | 8 | 8 |
| 390×844 | Dark | 8.5 | 8.5 | 8.5 | 8 | 8 |
| 768×1024 | Light | 8 | 8 | 8.5 | 8 | 8 |
| 768×1024 | Dark | 8 | 8 | 8.5 | 8 | 8 |
| 1280×900 | Light | 8.5 | 8.5 | 8.5 | 8 | 8 |
| 1280×900 | Dark | 8.5 | 8.5 | 8.5 | 8 | 8 |

30/30 reach 8. Search views no longer expose the legacy uppercase/green
footer labels. Rectangular Play actions and compact corners now match the
cabinet shelf. No screenshot clipping or overlapping controls observed.

Capture evidence is retained outside Git: `vision-review/before` (original),
`vision-review/after` (rounded shelf), and `vision-review/radius-after`
(final), with `{mobile,tablet,desktop}-{light,dark}-{state}.png` filenames.
Obsolete intermediate captures/debug dumps were reference-checked and cleaned.
The two capture workspaces together use 24,240 KiB at this checkpoint,
below the operator's 30 MB cap. No tracked asset was deleted.

## Executed checks

- `python3 scripts/test_portal_review.py`: `portal review checks passed`.
  Includes computed radius on all four corners, fonts, contrast, keyboard,
  counts and mobile touch geometry in both themes.
- Bounded browser capture: `30 captures complete; no browser errors`;
  no external requests observed.
- `node --check assets/portal-ux.js`: exit 0.
- `git diff --check`: exit 0.
- Catalog: `120 unique catalog IDs; all URLs tracked; id 222 free: True`.

These are portal checks, not a passing full-game release gate. The previously
reported full gate remains blocked by sparse-missing game assets (0/120).
No release or push is authorized by this review.
