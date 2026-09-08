# Gacha Hub — design brief & Claude Design prompt

Two things: a **ready-to-paste prompt** for Claude Design, and my **direction
suggestions** for the main (game-agnostic) UI and the per-game UIs. The full
spec is in **[DESIGN-HANDOFF.md](DESIGN-HANDOFF.md)** — hand that over alongside
this.

---

## A. Ready-to-paste prompt for Claude Design

> Paste the block below into Claude Design. Attach or paste `DESIGN-HANDOFF.md`
> so it has the full screen/data spec. It's written to produce a coherent,
> production-intent UI (not throwaway mockups) and to design for the real data
> shape — no "empty placeholder" screens.

```
Design the UI for "Gacha Hub", a dark-first, multi-game gacha companion web app
for a small group of enthusiasts. It tracks — per game — currencies, daily/weekly
resets, character builds, ownership, farming plans, teams, and live banners/events.
Full product spec (every screen, its data, states, and per-game structure) is in
the attached DESIGN-HANDOFF.md; follow it for scope and field names so the design
maps onto the existing React app.

Design intent:
- Dark-first, desktop-led but fully responsive (a left sidebar that collapses to a
  drawer under ~820px; wide tables/boards scroll inside their own container).
- A single game-agnostic "shell" (sidebar, dashboard, tasks, timeline, admin) that
  RESKINS per game via that game's accent color — surfaces, headers, and active
  states pick up the accent. Ship the five game accents as themes.
- The app KNOWS the games: users mostly tick/pick from a catalog, rarely type. Make
  toggling ownership across hundreds of entries and editing dozens of tasks fast and
  scannable. Strong empty states and inline edits.
- Treat all catalog data as present (character/weapon/material icons, constellation
  and talent text) — design the populated shape with graceful image fallbacks
  (initials/silhouette). Do not design "coming soon" placeholders.

Deliver, as artboards on one canvas:
1. A design system: color tokens (a neutral dark base + the 5 game accents), type
   scale, spacing, and the core components — card, button variants, badge/chip,
   pill (priority/status), stat tile, input/select/number, table row, tab bar,
   toast, portrait panel, and a reusable "gear piece" card (set / main stat / level
   / substats).
2. The main shell screens: Login, Dashboard (summary tiles + banner/event
   countdown strip + priority-sorted active goals + per-game cards with currencies,
   wish counts, a regen/resin widget, and dailies), Games library, Tasks (a Kanban
   board with one column per game, each split into Dailies & weeklies / Goals /
   Checklists, where a Goal card nests its material subtasks), Banners & events
   (per-game tabs, banner cards with featured-character chips showing owned state),
   Admin (JSON upload + current items + audit log), Settings.
3. The per-game surfaces: a Game Overview (tab bar: Overview / Ownership /
   Equipment / Materials; currencies, builds, teams), Ownership (filterable catalog
   grid with owned toggles), Equipment (weapons + gear sets with farm/pre-farm),
   Materials (need-vs-have table with farm-day chips), and the bespoke Character
   sheet for EACH of the five games — Genshin (5 artifacts + weapon, elements,
   constellations), HSR (6 relics + light cone, paths, traces), ZZZ (6 drive discs
   + W-Engine), Wuthering Waves (5 echoes + weapon, forte), Endfield (4 gear + a
   weapon-with-nested-essence, classes). Give each its own identity while keeping
   the interaction model (portrait + level + identity + weapon + gear + talents +
   stats) consistent.

Show each screen in at least a populated state; include empty and loading states
for the Dashboard, Ownership, and Tasks. Desktop first, plus a mobile frame for the
Dashboard, Ownership, and a Character sheet.
```

---

## B. Direction suggestions — the main (game-agnostic) UI

Think of the shell as a **console** that reskins per game.

- **Sidebar as the hub.** Keep the persistent left nav, but make the **"Your
  games"** list first-class: accent dot, icon, a tiny status (dailies-left dot,
  resin near cap). Selecting a game tints the whole shell with its accent.
- **Dashboard = "what needs me today."** Lead with the summary tiles, then a
  single prioritized feed: banners ending soon, resin/stamina about to overflow,
  dailies not done, high-priority goals. Per-game cards are the second tier. The
  goal is a 5-second "what should I log in and do."
- **Accent theming, restrained.** Use each game's accent for borders, active
  tabs, key numbers, and the card top-stripe — not big fills. Keep the neutral
  dark base so five games don't clash on one dashboard.
- **The Kanban board is the tasks centerpiece.** Columns by game; goal cards that
  expand to show their material subtasks with progress. Make priority (a colored
  pill) and the notify bell legible at a glance. Consider a subtle progress ring on
  each goal card (materials done / total).
- **Density with breathing room.** Ownership and Materials are data-dense — use
  compact rows, sticky filter bars, rarity color coding, and quick bulk actions.
  Reserve larger, richer cards for the Dashboard and Character sheet.
- **Motion, lightly.** Countdown numbers tick; check-offs and toggles animate;
  the resin widget can "fill." Nothing that slows a power user down.
- **Iconography.** A consistent set for elements/paths/attributes, rarity stars,
  material categories, and task types. These recur everywhere — design them once.

## C. Direction suggestions — the per-game UIs

Give each game a recognizable identity via accent, background texture, and the
sheet's personality, while the skeleton stays the same.

- **Genshin Impact** — warm, elemental, parchment/teyvat feel. Accent gold.
  Artifacts as five distinct slot cards (flower/plume/sands/goblet/circlet) with
  element-tinted main-stat chips; constellation as a 0–6 pip track.
- **Honkai: Star Rail** — sci-fi/astral, deep indigo. Relics split visually into
  the 4-piece "relic" set and the 2-piece "planar" set; light cone as a hero card;
  traces as a small skill tree.
- **Zenless Zone Zero** — urban, neon, high-contrast "New Eridu" energy. Drive
  discs as a 6-slot grid; W-Engine bold; attribute/faction as punchy tags.
- **Wuthering Waves** — sleek, post-apocalyptic mono + one vivid element accent.
  Echoes as 5 cost-tiered slots (show the 4/3/1 cost), forte as a circuit.
- **Arknights: Endfield** — industrial, blueprint/grid, muted steel + hazard
  accent. 4 gear slots; the weapon card expands to show its nested **essence**
  (name + effect); class as an ops-style badge.

Shared per-game pattern for the character sheet: **portrait + identity strip**
(element/path/class, level, dupes) on the left; **weapon**, **gear grid**,
**talents**, **stats** stacked on the right; the **Plan farming** panel and the
**Reference** (constellations/talents) below. Keep the "gear piece" card identical
in behavior across games so the code stays one component.

---

## D. How this maps to the build

The React app already implements every screen and route named here (see
DESIGN-HANDOFF §4/§7). A design that keeps the screen list, the field names, and
the component vocabulary will drop in with minimal rework; a bolder visual
language is welcome as long as those anchors hold. Per-game theming hangs off the
existing `accent` (and optional `art`) already defined on each game module.
