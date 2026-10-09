# Design references

The designs behind `docs/VISUAL-DESIGN.md` and `docs/WIREFRAMES.md`, exported on 2026-10-09 from Georges's two canvases on claude.ai, which are private. Look here first when building a screen.

| What | Picture | Static page | Source |
| --- | --- | --- | --- |
| **The look:** the Overview dashboard (2026-10-08, 1920×1204) | [dashboard.png](dashboard/dashboard.png) | [dashboard.html](dashboard/dashboard.html) | [`source/`](dashboard/source/) |
| **The structure:** 15 wireframe boards (2026-10-09) | [wireframes/](wireframes/README.md) | in the same folder | [`source/`](wireframes/source/) |

![The Overview dashboard design](dashboard/dashboard.png)

## How to use them

- **The dashboard is the look** of the whole app: colours, type, panels, charts and motion. `docs/VISUAL-DESIGN.md` gives its values and the rules for the screens it does not show.
- **The wireframes are structure only:** what each screen holds and where. Their grey style is not the app's look. `wireframes/README.md` lists the boards and explains their numbered markers.
- **When a picture and the written spec disagree,** the spec wins (WIREFRAMES.md for structure, VISUAL-DESIGN.md for the look); say so in the PR.
- **Numbers are sample data.** The dashboard's pictures are placeholder art (game logos and a beta screenshot); the app's art comes from the art store (ADR 0006). The static pages show grey hatching where art goes.
- **Every screen PR** attaches a screenshot of the built screen next to the matching picture here.

## Three formats

- `*.png`: a full render of each board, for looking.
- `*.html`: the same board saved as a static page without scripts. Open it in a browser to inspect markup, CSS and SVG (fonts load from Google Fonts). The wireframe pages link to each other like the canvas, starting from `wireframes/00-screen-map.html`.
- `source/*.dc.html`: the canvas files as authored: HTML and CSS plus a small `DCLogic` class that holds the sample data and computes chart geometry (donut arcs, heatmap levels, the carousel timing). They need the claude.ai canvas runtime, which is not in this repository, so read them for exact values rather than running them.

When a canvas changes, export it again and update this folder in the same PR as the spec change.
