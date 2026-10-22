# Jankolock design tokens

Scope: this directory's shipping-office arena and optional trophy hall, not
`../Jankolock3D/`. Token names below describe existing values, not a new runtime
API. Sources: `index.html`, `style.css`, `ui.js`, `data.js`, `engine.js` and
`portrait.js`. Reviewed Canvas baseline `940cbba` and landed feedback/onboarding
polish `0bb1fbb`. No `jankolock-v2-realism` or `jankolock-hud-fire` commit was
present at review. Do not infer a realistic renderer or new shader system from
those pending worker names.

## Art direction and color

The current arena is an oblique Canvas2D illustration: tiled dispatch floor,
labeled crates, solid silhouettes and square/round/triangular office workers.
It is not a photorealistic environment. Depth comes from projected geometry,
y-sorted actors/cover and solid offset shadows, not shaders or PBR materials.

| Color token (CSS) | Light | Dark | Role |
| --- | --- | --- | --- |
| `--paper` | `#f2eddf` | `#23262b` | Page and canvas surround |
| `--panel` | `#fffaf0` | `#2d3137` | Cards, progress tracks, light details |
| `--ink` | `#20211f` | `#f5eddf` | Text and outlines |
| `--muted` | `#56564f` | `#c5beaf` | Supporting copy |
| `--line` | `#b8b3a6` | `#74766e` | Dividers |
| `--blue` | `#275da8` | `#8fb8f1` | Dispatch, health fill, focus |
| `--coral` | `#b63b2d` | `#ffad99` | Returns, incoming damage border |
| `--softblue` | `#dce7f2` | `#233c5b` | Dispatch surfaces and selection |
| `--softcoral` | `#f6ddd3` | `#593b35` | Returns surfaces |
| `--floor` | `#e6dfcb` | `#363b3e` | Arena floor |
| `--wall` | `#b4a78c` | `#646968` | Crate sides and floor thickness |
| `--walltop` | `#d8cbb0` | `#82877e` | Crate tops and satchel |
| `--shadow` | `#c3bba7` | `#272b2d` | Grid and cast-shadow shapes |
| `--action` | `#191919` | `#111` | Near-black action buttons |
| `--actiontext` | `#fffaf0` | `#fffaf0` | Action labels |

### Trophy hall lighting and materials

The hall alone uses local three.js stock material shaders and a supplied
photo-derived relief, not a full head scan. It does not inherit the CSS theme.

| Token | Exact source value |
| --- | --- |
| `hall.background` | `#eee8dc` |
| `hall.pedestal` | `#746856`, `MeshStandardMaterial`, roughness `1` |
| `hall.floor` | `#d9d1c1`, `MeshStandardMaterial`, roughness `1` |
| `hall.pawn.body` / `hall.pawn.head` | `#34312c` / `#b35337`, `MeshStandardMaterial` |
| `hall.light.hemisphere` | Sky `#ffffff`, ground `#bdb3a0`, intensity `2.3` |
| `hall.light.key` | Directional `#ffffff`, intensity `2`, position `(-2, 4, 5)` |
| `hall.output` | sRGB, `NoToneMapping`; imported relief materials retained |

## UI system

Flat solid fills, ink borders and text labels. No gradients, emojis or em-dashes.
Primary actions are near-black; settings, secondary actions and selection cards
use panel surfaces. Selection uses `--softblue`, a blue border and a solid inset
`4px` stripe, not an elevated shadow or glow.

| Type or geometry token | Value |
| --- | --- |
| `type.body` | Local Atkinson, `system-ui, sans-serif`; `16px`, line-height `1.4`; weights `400`, `700` |
| `type.title` | Local Bungee, `Impact, sans-serif`; `clamp(26px,4vw,44px)`, line-height `1.05`, tracking `-1px`, uppercase |
| `type.heading` | H2 `25px` / `1.12`; H3 `17px` |
| `type.eyebrow` | `12px`, `700`, uppercase, tracking `.1em` |
| `type.support` | Fine copy `13px`; status and action labels `14px` |
| `type.score` | Team `38px` / `1`; clock `29px` / `1.1`; tabular numerals |
| `space.content` | Paragraph bottom margin `12px`; cards padding `12px`, gap `8px`; workspace gap `22px` |
| `control.button` | Minimum height `44px`; padding `9px 12px`; border `2px`; radius `3px`; weight `700` |
| `control.state` | Disabled opacity `.6`; hover outline `2px` ink, offset `2px` |
| `control.focus` | `3px` blue outline, offset `4px` on buttons, summary, canvas and links |
| `surface.section` | Sidebar top border `4px`, padding-top `12px`; arena and scoreboard border `2px` |

### HUD hierarchy

1. Full-width scoreboard: Dispatch left, timer/round/wins center, Returns right.
   Team labels pair blue squares with coral triangles.
2. Arena with bottom caption. Combat text stacks at top-left, inset `10px`
   from top/sides, gap `4px`: outgoing then incoming; panel fill, `2px` border,
   `5px 8px` padding, `14px` bold. Hidden entries do not reserve space.
3. Capture status and `80px` warm-up progress bar, height `10px`.
4. Health row below capture: associated "Your health" label, numeric current/max,
   native progress bar and life status. Grid `1fr minmax(70px,1fr) auto`, gap
   `12px`, minimum height `38px`; bar height `14px`, width `100%`, blue fill,
   panel track, `1px` ink border. Maximum follows the selected match items.
   Life status reports on-duty, shield, spawn protection or respawn time.
5. Q/E ability buttons with ready/cooldown text, Pause and Reset; touch pads;
   contextual polite status. Controls are hidden in the hero lobby.
6. Sidebar holds hero selection, match information, pause, result or draft.
   Only the current phase panel is shown; no decorative launch overlay.

Actor-local health bars remain distinct from the HUD: `42 x 7` canvas units,
`40 x 5` team-colored fill, role labels above and team-shape badges below.

## Motion and feedback

| Token | Existing behavior |
| --- | --- |
| `camera.arena` | Fixed projection `x=40+x+(y-300)*.07`, `y=80+y*.9-elevation`; no tracking, zoom, camera shake or recoil |
| `motion.simulation` | `1/60s` fixed steps, accumulator capped at `.1s`; actor positions interpolated unless displacement exceeds `40` units or life state changes |
| `motion.wobble` | Opt-in actor rotation `sin(now/110 + id*2)*.055` radians during play |
| `fire.pose` | Aim-aligned stamp barrel, `7`-unit stroke, length `23`; cosmetic, does not alter aim |
| `fire.flash` | Solid panel-colored `8 x 5` rectangle, `65ms` after each shot |
| `fire.tracer` | Team-colored `4`-unit line from previous to current bullet position; `6 x 6` panel-colored tip at elevation `12`; speed `500` units/s, lifetime `1.15s` |
| `feedback.hit` | Outgoing text and outlined X at hit location for `220ms`; X half-size `8`, strokes `5` ink then `2` panel |
| `feedback.kill` | "Rival down / +4 influence", `900ms`; X half-size `12` |
| `feedback.incoming` | Text with actual health/shield damage, `450ms`; no full-screen flash |
| `feedback.ability` | Solid ground rings: rush `24` radius / `.25s`, death `24` / `.5s`, slam `70` / `.35s`; decoy opacity `.55` for `3s` |
| `camera.hall` | Perspective FOV `38`, near/far `.05/40`; front view backs away to fit portrait layouts, no user orbit |
| `motion.hall.bump` | Optional pawn tilt `sin(now/55)*.09` radians during a `700ms` bump window; text remains when motion is off |

Sound and cosmetic motion default off. `prefers-reduced-motion: reduce` disables
the motion toggle, actor wobble and hall tilt; CSS also disables animations and
transitions. Essential movement, projectiles, muzzle flashes and hit indicators
remain. There is no reduced-flash setting. HUD refresh is throttled to about
`100ms`, so DOM feedback expiry is approximate. Blur/hidden page pauses play
and releases held input; pause, result and draft stop simulation.

## Audio

Original synthesized WebAudio only, no music or samples. Shot uses square wave;
all other cues use triangle. Each sweeps exponentially between the frequencies
below; gain decays from `.025` to `.0001`. Sound requires opt-in/user activation.

| Cue | Frequency sweep (Hz) | Duration (s) |
| --- | --- | --- |
| Shot | `240 -> 100` | `.035` |
| Hit / hurt | `720 -> 480` / `110 -> 60` | `.045` / `.07` |
| Respawn / capture | `330 -> 500` / `440 -> 580` | `.12` / `.1` |
| Capture lost | `260 -> 160` | `.1` |
| Ability / kill | `160 -> 330` / `90 -> 45` | `.09` / `.1` |
| Round win / loss | `390 -> 660` / `180 -> 70` | `.2` / `.22` |

Shot/ability/kill cues are player-owned; hit/hurt are player involvement;
Dispatch capture uses capture, Returns capture uses capture lost. Visual/text feedback
remains available muted. The trophy hall has text bump feedback, no audio cue.

## Layout and accessibility

| Layout token | Existing rule |
| --- | --- |
| `layout.desktop` | Max-width `1440px`; workspace `minmax(0,1fr) 310px`; scoreboard `1fr 160px 1fr` |
| `layout.compact` | At `1000px` and below: sidebar `270px`, gap `14px`, actions two columns |
| `layout.stacked` | At `760px` and below: one workspace column, three hero columns, scoreboard center `110px`; life status spans both health-row columns |
| `layout.phone` | At `430px` and below: stacked masthead and hero cards, scoreboard center `92px`, side padding `10px`, health gap `6px`; secondary arena caption hidden |
| `layout.touch` | Coarse pointer or width at most `700px`: separate move and aim/fire pads; `108px` diameter, `88px` at most `430px`; thumbs `36px` |
| `layout.viewport` | `viewport-fit=cover`; body padding `max(12px,env(safe-area-inset-*))` except phone horizontal override above |
| `layout.canvas` | Width `100%`, fixed aspect `1040/700`; pixel ratio capped at `2`; hall height `clamp(240px,48vh,480px)` |

Native buttons and disclosure summary have `44px` minimum height. Preserve
visible focus, skip-to-arena link, labeled health/capture progress, named canvas,
polite status, pressed hero/settings states and meaningful disabled cooldowns.
Start/resume focus the arena; pause/result/draft move focus to their next action.
Keyboard-only play uses WASD/arrows, IJKL, Space, Q/E and P/Escape; touch uses
independent pads with pointer-cancel cleanup. Do not encode team or health state
only in hue or sound: retain shapes, numbers and words.

Contrast relies on the paired light/dark tokens, not translucent overlays.
This is not a WCAG certification: small canvas labels shrink on phones, combat
text is not live-announced, the whole arena has no screen-reader equivalent,
and the `430px` horizontal padding override does not retain side safe-area
insets. Real handheld ergonomics and supported GPU performance remain unverified.

## Contributor rules

**Do:** reuse theme tokens and local fonts; keep the office-material vocabulary;
keep effects short and tied to actual engine events; keep health, cooldowns,
score and next actions readable in both themes; check desktop and phone layouts
with keyboard, touch, sound off and reduced motion.

**Do not:** add gradients, emojis, em-dashes, neon/glow, decorative bouncing,
remote assets/fonts/audio, color-only state, gameplay-changing cosmetic aim,
screen shake, or a blocking launch layer. Do not describe the Canvas arena as
photorealistic or the supplied relief as a complete scanned head.
