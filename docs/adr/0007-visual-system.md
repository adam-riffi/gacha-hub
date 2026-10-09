# 0007 — Visual system from the 2026-10-08 dashboard

- Status: Proposed
- Date: 2026-10-09
- Proposed by: claude; decided by: Georges

## Context

DESIGN.md §7 describes the look the app has today: Space Grotesk headings, the system font stack, flat square surfaces and one accent per game. `docs/DESIGN-BRIEF.md` and `docs/DESIGN-HANDOFF.md` hold the older tokens and the prompt that started the redesign. Georges then designed the Overview dashboard in Claude Design (2026-10-08): an Endfield-style industrial HUD with a magenta accent, four type families, two panel kinds, hand-drawn charts with depth, and an accent that follows the game in scope. He wants that design to become the app's look rather than a one-off picture. The 2026-10-09 wireframes keep its layout for Home and give every other screen its structure, but not its look.

## Decision

- `docs/VISUAL-DESIGN.md` is the source of truth for the look: tokens, type, panels, components, charts, motion and the Overview layout. DESIGN.md §7 summarises it and WIREFRAMES.md keeps screen structure.
- Only `--accent` changes with scope: magenta `#FF2D95` on the Overview, the game's colour on a game (new values for Genshin, ZZZ, WuWa and Endfield, and `#1F9BFF` for NTE), and the character's element or attribute colour on a character's pages. HSR keeps `#8A7DFF` until Georges picks.
- Fonts (Barlow Condensed, IBM Plex Mono, Hanken Grotesk, Bodoni Moda; all SIL OFL) are self-hosted as woff2. No third-party font requests, so the CSP does not change for fonts.
- Charts stay hand-written inline SVG; no chart or UI-kit library is added.
- A new milestone **V** in DESIGN.md §9 lands the system (tokens, fonts, shell, panels, components, chart parts) and restyles Home before F8 to F10 build their screens.
- Anything VISUAL-DESIGN.md marks **Proposed** (primary button, form controls, segmented switches, rotation pause and tilt under reduced motion) is a suggestion until Georges accepts it.

## Alternatives considered

- **Keep today's look** and only borrow colours: loses most of the design (panels, charts, depth, type), which is what Georges asked to keep.
- **Load the fonts from Google Fonts:** simpler, but a third-party request on every visit and a CSP change for `fonts.googleapis.com` and `fonts.gstatic.com`.
- **A component library as a base** (Georges listed ReEnd-Components as a reference): DESIGN.md §6 allows no UI kit, and the design already defines the parts needed. It stays a source of ideas unless Georges decides otherwise.
- **A chart library:** the charts are small and highly styled (extruded faces, reticles, layered tilt); a library would fight the style and add JavaScript to a 200 KB budget.

## Consequences

- The web stylesheet is rewritten in milestone V; the game modules' `accent` values change in the same milestone.
- About 150 KB of fonts are added to first load (not JavaScript, so outside the budget); two weights are preloaded.
- Pinning a past day on the heatmap needs a per-day history of dailies, pulls and passes; when it ships is an open question in VISUAL-DESIGN.md §13.
- `docs/DESIGN-BRIEF.md` and `docs/DESIGN-HANDOFF.md` are superseded for the look and kept for history.
