import type { CatalogMaterial } from "./catalog/types.js";

const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A farming goal (Plan farming's "Farm Venti") and what its materials still lack. */
export type FarmGoal = { owner: string; materials: { material: Pick<CatalogMaterial, "name" | "category" | "availability">; missing: number }[] };
export type FarmLine = { kind: "domain" | "anyday"; text: string };

/** "talent books" for a talent material, "weapon materials" for a weapon's, else the category in lower case. */
const family = (category: string) => (/talent/i.test(category) ? "talent books" : /weapon/i.test(category) ? "weapon materials" : category.toLowerCase());

/**
 * Farm today (WIREFRAMES.md A3): per goal, the rotating materials open on the
 * game's weekday (1 = Mon … 7 = Sun) with their days, then one line for what
 * any day farms. Materials already covered are left out.
 */
export function farmToday(goals: FarmGoal[], weekday: number): FarmLine[] {
  const out: FarmLine[] = [];
  for (const g of goals) {
    const open = g.materials.filter((m) => m.missing > 0);
    const rotating = new Map<string, number[]>();
    for (const m of open) {
      const days = m.material.availability ?? [];
      if (days.length && days.includes(weekday)) rotating.set(family(m.material.category), days.filter((d) => d !== 7));
    }
    for (const [name, days] of rotating) out.push({ kind: "domain", text: `${name} (${days.map((d) => DAY[d]).join("/")}) for ${g.owner}` });
    if (open.some((m) => !m.material.availability?.length)) out.push({ kind: "anyday", text: `materials for ${g.owner} (any day)` });
  }
  return out;
}
