import { z } from "zod";
import { LIMITS } from "./common.js";
import type { GameDefinition } from "./games/types.js";

/**
 * Event rewards as typed effects (ADR 0008). Each kind acts through a feature
 * that already exists; a kind the app does not know, or the game does not
 * support, is kept as a note so uploads never fail on something new.
 */
const unit = z.enum(["character", "weapon"]);
const ref = z.string().min(1).max(120);

export const baseEffectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unit.grant"), unit, catalogId: ref }),
  z.object({ kind: z.literal("unit.copy"), unit, catalogId: ref, count: z.number().int().min(1).max(6) }),
  z.object({ kind: z.literal("currency.add"), currency: ref, amount: z.number().int().min(1).max(LIMITS.currencyValue) }),
  z.object({ kind: z.literal("material.add"), materialId: ref, amount: z.number().int().min(1).max(LIMITS.materialQty) }),
  z.object({ kind: z.literal("goal.create"), title: z.string().min(1).max(200), stages: z.array(z.string().min(1).max(200)).max(20) }),
  z.object({ kind: z.literal("note"), text: z.string().min(1).max(500) }),
]);
export type BaseEffect = z.infer<typeof baseEffectSchema>;

export const chooseEffectSchema = z.object({
  kind: z.literal("choose"),
  options: z.array(z.object({ label: z.string().min(1).max(120), effects: z.array(baseEffectSchema).min(1).max(10) })).min(2).max(10),
});
export const effectSchema = z.union([baseEffectSchema, chooseEffectSchema]);
export type Effect = z.infer<typeof effectSchema>;

const note = (text: string): BaseEffect => ({ kind: "note", text: text.slice(0, 500) });
const kindOf = (raw: unknown) => String((raw as { kind?: unknown } | null)?.kind ?? "reward");

/** One effect, or the note it degrades to. */
function readBase(raw: unknown, game: GameDefinition): BaseEffect {
  const parsed = baseEffectSchema.safeParse(raw);
  if (!parsed.success) return note(`Unknown reward: ${kindOf(raw)}`);
  const e = parsed.data;
  if (e.kind === "currency.add" && !game.currencies.some((c) => c.key === e.currency)) return note(`Unknown reward: currency.add ${e.currency}`);
  if (e.kind === "unit.copy" && !game.manifest.dupes[e.unit]) return note(`Unknown reward: unit.copy ${e.unit}`);
  return e;
}

/** A choice's shape, its options' effects read one by one. */
const looseChoice = chooseEffectSchema.extend({
  options: z.array(z.object({ label: z.string().min(1).max(120), effects: z.array(z.unknown()).min(1).max(10) })).min(2).max(10),
});

/** Read stored or uploaded effects for a game; anything else in the list becomes a note. */
export function readEffects(raw: unknown, game: GameDefinition): Effect[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 50).map((r): Effect => {
    if (kindOf(r) !== "choose") return readBase(r, game);
    const shaped = looseChoice.safeParse(r);
    if (!shaped.success) return note("Unknown reward: choose");
    return { kind: "choose", options: shaped.data.options.map((o) => ({ label: o.label, effects: o.effects.map((e) => readBase(e, game)) })) };
  });
}

/**
 * The effects that ticking an event goal applies, keyed by their place
 * ("2", or "1.0.0" for a choice's option), so applying again finds the same
 * keys. `null` when the event offers a choice and none (or none in range) is picked.
 */
export function pickEffects(effects: Effect[], choice: number | undefined): { key: string; effect: BaseEffect }[] | null {
  const out: { key: string; effect: BaseEffect }[] = [];
  for (const [i, e] of effects.entries()) {
    if (e.kind !== "choose") {
      out.push({ key: String(i), effect: e });
      continue;
    }
    const option = choice === undefined ? undefined : e.options[choice];
    if (!option) return null;
    option.effects.forEach((effect, j) => out.push({ key: `${i}.${choice}.${j}`, effect }));
  }
  return out;
}
