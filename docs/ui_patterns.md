# UI patterns for the arcade portal

Research against live game portals, fetched and inspected on 2025-09-24: itch.io, poki.com, crazygames.com, armorgames.com, gamejolt.com, Steam storefront. Every pattern below cites the site and the concrete observation (selector or markup that was actually seen). All CSS here is written from scratch for this repo: flat colors only, no gradients, no emoji, no em-dash, no all-caps UI text, AA contrast, 44px touch targets, prefers-reduced-motion respected. No proprietary assets or branding are referenced.

House tokens used by the snippets:

```css
:root {
  --page: #f4f4f4;      /* page background, flat */
  --card: #ffffff;      /* card surface */
  --ink: #1a1a1a;       /* primary text, 18.1:1 on --card */
  --muted: #595959;     /* secondary text, 7.0:1 on --card (AA pass) */
  --line: #d9d9d9;      /* 1px borders */
  --accent: #0b57d0;    /* links/focus, 6.3:1 on --card (AA pass) */
  --active: #1a1a1a;    /* selected chip fill */
  --hover-tint: #eeeeee;/* flat hover fill */
  --placeholder: #e3e3e3;
  --radius: 16px;
  --gap: 16px;
}
```

---

## 1. Responsive grid: auto-fill with a min column width

**Source: itch.io, observed in `static.itch.io/main.css`, rule `.game_grid_widget`.** The browse grid is `display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); grid-gap:25px 20px; align-items:start`. The same file steps the minimum down to `minmax(170px, 1fr)` and then `minmax(160px, 1fr)` inside `max-width:650px` and `max-width:500px` media queries, and drops body text from 16px to 14px on small screens. **Source: crazygames.com, observed in its Next.js CSS**, `MobileInstantGrid_*`: 1 column at base, `repeat(2,1fr)` at `min-width:481px, orientation:landscape`, gap derived from a base unit.

```css
.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 25px var(--gap);
  align-items: start;
}
/* 360px readability: allow two slim columns before dropping to one */
@media (max-width: 420px) {
  .game-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }
}
```

At 360px viewport with 16px page padding, `minmax(140px, 1fr)` yields 2 columns of 156px plus a 12px gutter inside 328px of usable width. Never go below a 140px column: the title stops being readable sooner than the grid stops fitting.

## 2. Card anatomy: 16:9 thumb, two-line clamped title, one-line author

**Source: itch.io, observed `.game_title`**: `font-size:16px; font-weight:900; line-height:1.3; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden`. The author link next to it is `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`. **Source: crazygames.com, observed `.InstantThumb_instantThumb_*`**: thumb container `width:100%; aspect-ratio:186/237` for the mobile card, inner media `aspect-ratio:400/224` (about 16:9) with `object-fit:cover; border-radius:16px`. **Source: armorgames.com, observed `.tags`**: `max-height:2.4em; overflow:hidden; text-overflow:ellipsis` clamps the meta row.

```css
.card {
  display: block;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  text-decoration: none;
  color: var(--ink);
}
.card__thumb {
  aspect-ratio: 16 / 9;
  background: var(--placeholder);
  overflow: hidden;
}
.card__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover; /* crop, never distort */
}
.card__title {
  margin: 8px 10px 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card__author {
  margin: 2px 10px 10px;
  font-size: 14px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 420px) {
  .card__title { font-size: 15px; }
}
```

## 3. Hover: tint and lift, guarded by hover:hover, off on touch

**Source: poki.com, observed in `client~app-components-CategoryTile` CSS**: hover rules are wrapped in `@media (hover:hover)` and do `transform:scale(1.04) translateY(-4px)` plus a stronger shadow, with `transition-duration:.3s` on hover versus `.6s` at rest. **Source: itch.io, observed `.game_cell:hover .gif_overlay`**: hover reveals an overlay via `opacity:0 -> 1` over `0.2s ease`, and `.game_thumb:hover img{filter:none}` shows they deliberately avoid filter tricks on the image itself. **Source: armorgames.com, observed `.title:hover`**: flat tint `background-color:#e9fbff` on the title row.

```css
@media (hover: hover) {
  .card:hover {
    border-color: var(--ink);
    transform: translateY(-3px);
  }
  .card:hover .card__thumb::after { opacity: 1; } /* flat tint overlay */
}
.card { transition: transform .2s ease, border-color .2s ease; }
.card__thumb { position: relative; }
.card__thumb::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .18); /* flat tint, not a gradient */
  opacity: 0;
  transition: opacity .2s ease;
}
.card:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
```

Never put hover-only information (itch.io hides `.game_cell_tools` at `max-width:650px`) on small screens, and never rely on hover for anything a touch user needs.

## 4. Thumbnail letterboxing and the missing-art placeholder

**Source: itch.io, observed `.no_cover_text`**: missing covers get a padding-bottom box of `79.365%` (the 315x250 thumb ratio), a flat white background, and a centered icon in `#dadada`, shrunk to `font-size:60px` under 500px. The thumb itself uses `background-size:cover; background-position:50% 50%` as a fallback layer. **Source: crazygames.com, observed `.InstantThumb_*Placeholder_*`**: placeholders are flat `background:var(--black-60)` boxes at the exact final `aspect-ratio` (`1/1` or `400/224`) with `transition:opacity .15s ease`, so nothing jumps when the image lands. **Source: poki.com, observed tile markup**: every `<img>` carries explicit `width`/`height`, `loading="lazy"`, `decoding="async"`, and a 1x/2x srcset, which is what keeps CLS near zero.

```css
.card__thumb {
  aspect-ratio: 16 / 9;
  background: var(--placeholder); /* reserves space before the image loads */
  position: relative;
}
/* contain mode for artwork you must not crop (logos, screenshots with UI at edges) */
.card__thumb--contain img { object-fit: contain; }
/* placeholder shown until the real image paints */
.card__thumb::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--placeholder);
  transition: opacity .15s ease;
}
.card__thumb.is-loaded::before { opacity: 0; pointer-events: none; }
/* itch.io style flat fallback for a game with no art at all */
.card__thumb--empty::after {
  content: attr(data-initial); /* one letter, painted, no asset needed */
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: clamp(32px, 30%, 64px);
  font-weight: 900;
  color: #9aa0a6; /* 3.0:1 against --placeholder, decorative only (the card title carries the real text) */
}
img { max-width: 100%; }
```

Mark the card loaded in JS (`img.addEventListener('load', ...)`) or accept the static placeholder color; either way the grid row height never changes.

## 5. Filter chips and sort

**Source: crazygames.com, observed `OfflineOverlay_btn`**: pill buttons use `border-radius:999px; padding:10px 16px; font-weight:700`. **Source: poki.com, observed the Pill component CSS**: pills are flex rows with `border-radius:16px`, a 2px divider between segments, and `transition:transform .3s` on tap. **Source: armorgames.com, observed `.tag-category`**: category tags are small flat chips (`background-color:#666668`, `border-radius` on all corners) floated with 3px/5px margins; their 9px font and uppercase styling are too small to copy, so this pattern keeps sentence case and 14px. **Source: itch.io browse behavior (documented)**: filters and sort are plain links/inputs that each carry an `aria-pressed` or selected state, and the result count updates next to the sort control.

```css
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 16px;
}
.chip {
  min-height: 44px;            /* touch target */
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--card);
  color: var(--ink);            /* 18.1:1 on --card */
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color .15s ease, color .15s ease;
}
.chip[aria-pressed="true"] {
  background: var(--active);
  color: #ffffff;               /* 18.1:1 inverted */
  border-color: var(--active);
}
.chip:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.sort {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--card);
  color: var(--ink);
  font-size: 15px;
}
.sort-label { color: var(--muted); font-size: 14px; }
```

Sort rules to implement: default order is the catalog's featured flag first, then title; the sort control exposes Featured, A to Z, and Newest (id descending); sorting never resets the active filter chips; the visible count (`showing 12 of 40`) sits next to the sort control so a filter that empties the grid is diagnosable.

## 6. Empty state: say what happened, offer one way out

**Source: itch.io browse behavior (documented)**: an empty search shows a plain sentence in the results position, not a modal or a blank grid. **Source: gamejolt.com (documented, the fetched page is the SPA shell)**: empty shelves render a heading, one explanatory line, and a single call to action on the shelf background rather than collapsing the section.

```css
.empty {
  grid-column: 1 / -1;
  padding: 40px 16px;
  text-align: center;
  background: var(--card);
  border: 1px dashed var(--line);
  border-radius: var(--radius);
}
.empty h2 { margin: 0 0 6px; font-size: 18px; color: var(--ink); }
.empty p { margin: 0 0 16px; font-size: 15px; color: var(--muted); }
.empty button {
  min-height: 44px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: #ffffff;             /* 6.3:1 on --accent */
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
```

Copy pattern: heading names the cause (no games match), one line names the fix (try removing a filter), one button performs the fix (clear filters). One empty state, one action, no illustration required.

## 7. Featured hero: one wide tile, solid caption panel, stacks on mobile

**Source: itch.io (documented from the front page and observed indirectly in its grid CSS)**: featured games occupy a normal grid cell that spans two columns, keeping one card grammar for the whole page. **Source: crazygames.com, observed `.InstantThumb_isLarge_*`**: the large thumb switches to `aspect-ratio:400/224` while small thumbs stay square, so the hero ratio change, not a new layout language. **Source: Steam storefront, observed `store_capsule` and `responsive_scroll_snap_ctn` markup**: featured rows are horizontally scrolling snap shelves of uniform capsules rather than bespoke banners.

Because gradients are banned, the title sits in a solid panel beside or below the art, never text over a scrim gradient.

```css
.hero {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 16fr 9fr; /* art 16:9, panel fills the rest */
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}
.hero__art { aspect-ratio: 16 / 9; background: var(--placeholder); }
.hero__art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero__panel {
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}
.hero__panel h2 { margin: 0; font-size: clamp(20px, 4vw, 32px); line-height: 1.2; color: var(--ink); }
.hero__panel p { margin: 0; font-size: 15px; color: var(--muted); }
.hero__panel .chip { align-self: flex-start; } /* reuse the 44px pill button */
@media (max-width: 650px) {
  .hero { grid-template-columns: 1fr; }       /* itch.io stacks its hero at this width too */
  .hero__panel { padding: 16px; }
}
```

Exactly one hero per page top. Below it, cards use one identical grammar; the hero differentiates by span and ratio only.

## 8. Motion budget: reduced-motion respected everywhere

**Source: crazygames.com, observed `@media (prefers-reduced-motion:reduce)` disabling carousel animation on `[data-assist-active]`.** **Source: poki.com, observed `transition:transform .6s var(--bezier)` on tiles**: their large motion is transform-only and short on hover (`.3s`), which is the safe shape for a motion budget.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
  .card:hover { transform: none; } /* keep the tint and outline, drop the lift */
}
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```

House rule: every transition in this repo must be transform, opacity, background-color, border-color, or color only, under 300ms, and inert under reduced motion. No parallax, no auto-playing shimmer loops (flat placeholder color instead), no hover scaling above 1.04.

---

## Quick checklist before a portal CSS change

1. Grid uses `auto-fill` plus a `minmax` minimum of 250px desktop, 140px at 420px and below (itch.io, crazygames.com).
2. Every thumb has a fixed `aspect-ratio`, `object-fit`, and a flat placeholder color (crazygames.com, poki.com).
3. Titles clamp to two lines, meta lines clamp to one with ellipsis (itch.io, armorgames.com).
4. Hover effects live inside `@media (hover:hover)` (poki.com).
5. Chips, buttons, and sort controls are at least 44px tall with `aria-pressed` or a visible selected state.
6. Body text on cards passes AA (`--ink` on `--card` is 18.1:1, `--muted` is 7.0:1).
7. One hero, one empty state, one motion budget, all reduced-motion safe.
