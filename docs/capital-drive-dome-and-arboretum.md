# Shine Dome, Arboretum and Canberra Outlet

These public exteriors replace the ordinary building mesh for their source ID when the world streamer loads that building's chunk. The renderer uses the shared opaque world material. It creates no lights, image downloads, texture atlases or per-frame animation.

| Place | Evidence and what the game draws |
| --- | --- |
| Shine Dome, Acton | The Academy documents a copper shell on sixteen arches over a moat. All sixteen feet and recesses are present in the 192-vertex OpenStreetMap outline. The model samples that scalloped edge and raises it into a shallow dome, with a recessed curtain wall behind the arch openings and a narrow water band. The height uses the source's 8.69 m tag. The copper tone and moat width are estimates. [Australian Academy of Science](https://science.org.au/about-us/shine-dome/shine-dome-architecture) |
| National Arboretum Village Centre | The model follows the irregular source footprint with low stone-coloured wings and a rising zinc roof. Narrow rooflights cross the roof and timber-framed east-facing glazing looks out to the terrace. The roof rises from approximately 2.5 to 11.6 m, guided by the ACT description of a 12 m primary beam. Individual panels, colour and beam positions are approximate. [ACT architecture and materials](https://www.nationalarboretum.act.gov.au/visit/architecture-and-art) · [Architect’s exterior photographs](https://tzg.com.au/project/the-national-arboretum/) |
| Canberra Outlet Centre, Fyshwick | A geotagged 2022 photograph from Iron Knob Street shows a deep, light-coloured canopy, dark framed glass, and blue, purple and red leaning posts. Those details sit on the corresponding recessed corner of the retained 45-vertex shopping-centre outline. Balustrades, stairs, other tenant units and newer branding are outside this model. [Public entrance photograph](https://commons.wikimedia.org/wiki/File:Iron_Knob_St_entrance_to_the_Canberra_Outlet_Centre_July_2022.jpg) |

The two courtyard-free, irregular roofs are split at every source vertex. Tests compare the resulting top-surface area against the original polygon, check roof-face winding and verify sixteen distinct low points on the Dome. On the low setting the Dome, Village Centre and Outlet use 832, 783 and 287 triangles respectively. Higher detail uses 1,632, 803 and 287. Physical contacts still use the game's source building envelopes. These are artistic exterior studies, with interior plans and flights along individual roof surfaces unverified.

```sh
node scripts/test_capital_regional_architecture.mjs
node scripts/test_capital_west_belconnen.mjs
```
