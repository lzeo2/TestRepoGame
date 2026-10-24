# CITISTEN original UI mockups

Generated with codex-imagen before UI source was written. Files:
`ui-mockup-menu.png`, `ui-mockup-toolbar.png`, `ui-mockup-hud.png`,
`ui-mockup-nightalert.png`, `ui-mockup-gameover.png`.

First menu had visible glow and was rejected. All five pieces were submitted
again with the stricter vector prompt below. Four replacements completed;
the replacement game-over request was interrupted twice, so its first completed
original is retained. All five completed images were normalised without
dithering to the agreed solid palette, removing generated surface shading.
This is disclosed postprocessing, not a claim of unmodified generator output.
No mockup is loaded by the runtime. Generated text/key suggestions are not
input truth; the published camera and integration contracts take precedence.

## Shared generation prompt

`generate image, no refine:` followed by the piece description and:

> Original CITISTEN civic city-planning interface 1440x900 front-on.
> CRITICAL: pure flat SVG / Figma vector wireframe, absolutely UNIFORM SOLID
> charcoal #181c1b background edge to edge. Rectangles filled UNIFORM SOLID
> #242927. Text off-white, Bungee display, Atkinson body. Single accent muted
> ochre #d8ae55. All buttons PURE BLACK with white text. 4px corners.
> NO LIGHTING, NO GLOW, NO SHADOW, NO GRADIENTS, NO TEXTURE, NO VIGNETTE,
> NO BEVELS, NO 3D RENDERING, NO TRANSPARENCY, NO NEON. Every surface must
> have exactly one solid pixel colour. NOT a glossy gaming HUD. Minimal native
> webpage screenshot. No em dashes, no emoji, sentence case body text.
> Generous legible spacing.

## Piece prompts

- Menu: centred CITISTEN and A town of your own; outline cards FREE BUILD and
  ZOMBIE DEFENSE, original line town and shield icons; Build at your own pace
  and Build by day. Hold the town by night.; Start building and Defend the town;
  Light theme top right and footer controls.
- Toolbar and zoning panel: bottom Road, Zone, Service, Defense, Bulldoze;
  selected Zone ochre border; open Residential, Commercial, Industrial panel;
  Zones grow beside roads; Residential / shortcut 2; empty background elsewhere.
- Day HUD and minimap: slim budget $24,500, population 128, power 64 / 100,
  water 48 / 100 with rectangular demand bars; Day 3, Menu and Light theme;
  empty viewport; bottom-right top-down sage/blue/tan grid, grey road cross,
  white H town hall, legend; bottom five-group toolbar.
- Night alert/defense HUD: slim civic budget/population/utilities bar; outlined
  Night watch banner, Wave 3 incoming. Protect the town hall.; flat circular
  HP ring, Town hall 720 / 1000; Wave 3; minimap with edge zombie blips;
  toolbar; Nightfall in one minute toast.
- Game over (completed first prompt): original CITISTEN lose screen 1440x900;
  solid charcoal background; top-left CITISTEN, top-right Light theme;
  central outlined panel and small ochre square H; The town hall has fallen;
  Your town held on. Start again with a new plan.; statistic cells Nights
  survived 3, Population 128, Zombies stopped 46; Try again and Main menu;
  Bungee/Atkinson, 44px targets, solid colours, 4px radius, no shadows,
  gradients, neon, glow, gaming-HUD slop, em dashes, emoji or all-caps body.

Palette normalisation: charcoal #181c1b, panel #242927, off-white #f5f2e9,
ochre #d8ae55, black, residential #99ad85, commercial #829cb5,
industrial #bda57a, road #777b78. Runtime uses these semantics with contrast-
adjusted light-theme interaction accent. Foldwild's saved mobile completion
fixture in `docs/foldwild-polish/completion-previews/fixture-ending-390.png`
was inspected as the solid-surface, black-button reference specimen.

Reviewer owns J comparison grading. Collages preserve differences, including
simplified original icons, actual published input hints and responsive layout.

## Eight-piece J, catalog draft and preview network evidence

[Evidence receipt](../citisten-jkl-evidence.md) indexes all eight originally
planned pieces in both themes: main menu, builder toolbar, zoning panel,
budget/power/water, minimap, day HUD, night alert/defense HUD and game over.
The zoning/stats/map references are explicit crops from the original generated
composites, not new post-code mockups. `check-jkl.py` reproduces 16 comparisons
and records source hashes/crops in `J-eight-pieces.json` in the QA directory.

`catalog-241.draft.json` is deliberately not registered; its planned game entry
does not exist yet. The same documentation harness can capture cold local
request logs for the actual UI preview with `--browser`, only in a reserved
slot. That preview log does not establish full-game offline acceptance.
