# 0002 — Pull log as entries; pity and guarantee derived

- Status: Proposed
- Date: 2026-10-06
- Proposed by: claude; decided by: Georges

## Context

Milestone F5 adds a pull log with pity per banner (the owner listed "pull history + pity per banner" in `docs/HANDOFF.md` §10). Account import of wish history is deferred (DESIGN.md §14), so pulls are entered by hand and entry must stay quick. Each game resets pity per banner type (character, weapon, standard), a 5★ can be the featured unit or not, and losing a 50/50 (or 75/25) guarantees the next one.

## Decision

- Store **entries**, one row per logged run: `count` pulls on a banner type, where the last pull may be a 5★ (`fiveStar`, `featured`, optional `catalogId`). A batch of ten with a 5★ at pull 7 becomes two entries (7 ending in the 5★, then 3).
- **Derive** pity, guarantee, pulls to hard pity and the soft-pity flag from the entries with the pure `pityState` (`packages/shared/src/pity.ts`). Nothing derived is stored.
- A user who starts mid-pity **calibrates**: a zero-pull 5★ marker (featured or not, to set the guarantee) followed by the current pity.
- Banner **rules** (hard pity, soft pity, featured rate) are constants in each game module, like reset hours. Endfield has none until its rules are known.

## Alternatives considered

- **Store a counter per banner type** (pity + guaranteed). Rejected: no history, edits cannot be undone, and the 5★ list (which unit, at what pity) is the part players want to see.
- **One row per pull.** Rejected for manual entry: ten rows per ten-pull with nothing to say about the 3★ ones; entries carry the same pity information.

## Consequences

- One new table (`PullEntry`, RLS enabled) and routes to list, add (batch or calibration) and delete entries.
- Wrong entries are fixed by deleting them; pity recomputes.
- If account import arrives later, imported pulls map onto entries without changing the derivation.
