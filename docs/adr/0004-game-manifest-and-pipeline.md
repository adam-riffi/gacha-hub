# 0004 — Game manifest and a pipeline for new games

- Status: Accepted (2026-10-09)
- Date: 2026-10-09
- Proposed by: claude; decided by: Georges

## Context

The 2026-10-09 wireframes (`docs/WIREFRAMES.md`) give every game the same screens: activities on five cadences (daily, weekly, monthly, endgame cycle, version), endgame modes with history, battle pass, stamina with its reserve, 30-day pass, monthly shops, pull odds, a gear block and role-based KPIs. `GameDefinition` describes currencies, regions, pull banners and daily or weekly task seeds only, so each new screen would need per-game branches in the web app. Neverness to Everness is the sixth game, and more will follow.

The Endfield module shows what unsourced data costs: one UTC+0 region and a fixed Sanity cap, while the game runs Asia (UTC+8) and Americas/Europe (UTC−5) servers, both resetting at 04:00 server time, and Sanity's cap grows with Authority Level. Reminders fire five hours early for Americas/Europe players.

The locked decision "every game is hardcoded" stays: no generic game builder, no game defined by users or stored in the database.

## Decision

- Each game module gains a typed **manifest** in TypeScript, next to its definition:
  - cadences `daily | weekly | monthly | cycle | version`, each with its anchor (reset hour and weekday, day of month, cycle start and length, version dates);
  - endgame modes: key, cadence, anchor, length, metric (stars, acts, difficulty, score) and maximum premium reward;
  - battle pass (name, maximum level, weekly XP cap), 30-day pass (name, days) and monthly shops;
  - stamina: name, cap (or cap by account level), regeneration interval, reserve name and cap;
  - gacha odds: base rates, soft-pity ramp, hard pity, 4★ rules, featured rate, path or guarantee rules;
  - the gear block's shape (slots, sets, main stats) and the KPIs to show per build role;
  - event reward effects the game supports (a character copy raises constellation by one, a weapon copy raises refinement by one);
  - art kinds and their source per kind (ADR 0006).
- **Capabilities** are derived, never declared: M (manifest only; everything works by hand), C (catalog: ownership, builds, planning), L (live data: sync and imports). A game ships at M and gains C and L when a dataset or a sync route exists.
- `TaskCadence` grows from `daily | weekly` to the five cadences above. Windows come from one pure function per cadence in `packages/shared/src/cadence.ts`.
- **Pipeline for a new game:**
  1. `npm run game:new -- <key>` scaffolds the module, an empty manifest, a sheet stub and its tests.
  2. Fill the manifest. Every value cites its source in `docs/games/<key>.md`; unverified values are marked.
  3. A shared conformance suite runs over every registered game: reset and cadence windows, odds distributions that sum to 1, limits, art paths.
  4. Ship at M. Add the catalog and live data later, each in its own milestone.
  5. At each game version, run the refresh checklist in the game's reference sheet (banners, events, endgame anchors, pass level cap).

## Alternatives considered

- **Generic game builder, or manifests stored in the database.** Rejected: contradicts the locked decision, and unreviewed data would drive resets and reminders.
- **Ad hoc per-game code in each screen.** Rejected: every screen grows a `switch` on `gameKey`, and NTE would copy the closest game.
- **A manifest file in JSON.** Rejected: loses type checking, and some values are functions (cap by level, odds ramps).

## Consequences

- The shared contract grows; the five existing modules migrate in F8 and F9. Endfield gets its two regions and a Sanity cap by Authority Level.
- Screens read the manifest instead of branching on `gameKey`.
- NTE arrives at capability M and stays manual: its terms forbid third-party tools (ADR 0005).
- `docs/games/<key>.md` is required reading before changing a module.
