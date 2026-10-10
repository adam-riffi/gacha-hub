# 0008 — Events and rewards as data

- Status: Accepted (2026-10-10)
- Date: 2026-10-09
- Proposed by: claude; decided by: Georges

## Context

Games keep adding events, rewards and one-off rules: a free 4★ of your choice, an event weapon, login rewards, currency, materials, a new endgame mode in a version. Georges wants the app to handle anything new through the features it already has (roster, constellations and refinements, wallet, materials, goals, reminders) instead of new code for each event. Today an `Event` row (admin upload or official feed) holds free-form `rewards` and `payload` JSON that nothing acts on. ADR 0004 lists, per game manifest, which reward effects a game supports, and the wireframes turn event rewards into goals that update a character when ticked (WIREFRAMES.md A3 and A4).

## Decision

- **Effects are data.** An event carries a list of typed effects, validated by a zod schema in `packages/shared/src/effects.ts`. The kinds are a closed set, each acting through a feature that already exists:

  | Kind | Fields | Acts on |
  | --- | --- | --- |
  | `unit.grant` | catalog id | ownership: a new character or weapon |
  | `unit.copy` | catalog id, count | constellation, eidolon, mindscape, resonance chain, awakening or refinement, raised by count in the game's words (ADR 0004) |
  | `currency.add` | currency key, amount | the wallet: premium currency, pull items, stamina items |
  | `material.add` | catalog id, amount | material stock, and so the planner |
  | `goal.create` | title, stages | a goal task with checklist stages |
  | `note` | text | nothing; shown as written |

- **Choices are data too.** A `choose` effect holds options, each a list of effects (Rainbow's End: Diona, Chongyun or Lisa). The pick is stored with the goal and can change until it is claimed.
- **Triggers are moments the app already has:** *starts* (the cron tick creates the event's goals when it begins), *claimed* (ticking the goal applies its effects; the default), *detected* (an import shows the result, ADR 0005; the change is marked AUTO) and *ends* (unclaimed goals close and the digest says so).
- **Applied once.** Applying an effect writes one `EffectApplication` row keyed by user, event and effect, in the same transaction as the change and its audit entry. Ticking twice or syncing again never applies twice; unticking reverses the application.
- **New things degrade, never break.** A kind the app does not know, or that the game's manifest does not list, is stored and shown as a note; uploads and imports still succeed. A genuinely new kind is one change to `effects.ts` and the manifests that support it, with its tests.
- **Sources.** Admin uploads write effects. The official feed keeps writing plain events; reward text in announcements is not parsed. A game module may ship templates for recurring events, such as a version's free 4★ pick.
- Lands with F10 (Tasks with event goals, Calendar reward goals). `Event.effects` and `EffectApplication` join DESIGN.md §8.
- **Amendment on acceptance:** which kinds a game supports is read from its manifest rather than listed in it: a currency must be one of the game's currencies, and a copy needs the game's dupe field for that unit (`readEffects` in `packages/shared/src/effects.ts`). A choice holds plain effects, not further choices.

## Alternatives considered

- **Code per event:** quickest for one event, but every version would need a release, which is what Georges wants to avoid.
- **A general rules engine** with conditions and actions written by admins: flexible, but close to the generic builder the locked decisions rule out (DESIGN.md §6), and hard to test.
- **Free text only:** what `rewards` is today; nothing updates the roster or the wallet.

## Consequences

- Event goals change constellations, refinements, the wallet and materials through existing code paths, each kind tested once.
- Admin uploads gain an `effects` field; the upload validates it and reports unknown kinds as notes.
- One small table and a pure core (`effects.ts`) to unit-test, including applying once and reversing.
- Rewards announced only in game text still need an admin to enter them.
