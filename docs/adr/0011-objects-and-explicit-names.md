# 0011 — Objects for the domain, explicit names everywhere

- Status: Accepted
- Date: 2026-10-15
- Proposed by: claude; accepted by Georges on 2026-10-15

## Context
Georges, round 11: "1 follow OOP. 2 make sure every variable/function/object has a declarative and explicit naming".

The code (about 25,000 lines without tests: 13,400 in `apps/web`, 6,300 in `apps/server`, 5,400 in `packages/shared`) is written as functions over plain data. Behaviour that belongs to one thing is spread over helpers (a gear piece's crit value in `builds.ts`, its set bonus in the gear page, its slot label in three places), and the server's routes hold their database logic inline. Names are short: about 1,300 one-letter callback parameters (`(b) =>`, `(p) =>`), 560 one- or two-letter constants (`gi`, `qc`, `el`), helpers named `num` and `cap`, and CSS utility classes named `.mu`, `.mn`, `.cd` (about 370 uses).

## Decision
1. **The domain as objects.** A concept with data and behaviour is a class in `packages/shared` (or `apps/server/src/services` when it needs the database): its data in the constructor, its behaviour as methods named for what they answer or do. Started in round 11 with `UnitBannerAppearances` (a unit's banners: `summaryFor`, `toRecord`) and `LatestWriteQueue` (`push`, `flushWaiting`). Next: a gear piece and a build's gear, the pull budget and pity, a game's reset clock, the planner's costs.
2. **Thin routes.** A route parses its input, asks a service object, returns its answer; the Prisma calls live in the services.
3. **React stays function components.** React's hooks only work in function components and the React team treats class components as legacy; the objects above are what the components call. A component over about 300 lines is split into named parts.
4. **Explicit names.** No one-letter names (callbacks name what they hold: `(build) =>`, `(piece) =>`), no abbreviations (`gameInstance`, `queryClient`, `element`); helpers named for what they return (`numberOrNull`, `capitalized`); CSS utilities named for what they do (`.text-muted`, `.font-mono`, `.font-display`, `.font-serif`).
5. **Kept by the linter.** Once an area is renamed, ESLint's `id-length` (at least 3 characters; `id`, `to`, `x` and `y` allowed) holds it.

## Alternatives considered
- **Class components in React:** rejected; hooks (all of the app's data loading through TanStack Query) do not run in them, and React no longer develops them.
- **One sweeping rename:** rejected; tens of thousands of changed lines cannot be reviewed. Area by area, each PR changes no behaviour and passes the full suite.

## Consequences
- Many PRs (shared, server, the web's lib, then each page), each behaviour-unchanged, over several sessions.
- New code follows the rules from now on (round 11's code already does).
- Accepted by Georges on 2026-10-15 ("ADR 11 is approved").
