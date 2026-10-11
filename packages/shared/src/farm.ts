import type { CatalogMaterial } from "./catalog/types.js";

const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Who a farming goal is for: a character, a weapon or a gear set of the catalog. */
export type FarmUnit = { kind: "character" | "weapon" | "gear"; catalogId: string };
/** A farming goal (Plan farming's "Farm Venti"), who it is for, and what its materials still lack. */
export type FarmGoal = { owner: string; unit?: FarmUnit | null; materials: { material: Pick<CatalogMaterial, "id" | "name" | "category" | "availability">; missing: number }[] };
/** A line of Farm today: its words (for DMs and hover), and what the card shows as icons: who, which materials, which days. */
export type FarmLine = { kind: "domain" | "anyday"; text: string; unit: FarmUnit | null; materials: string[]; days: number[] };

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
    const unit = g.unit ?? null;
    const rotating = new Map<string, { days: number[]; materials: string[] }>();
    for (const m of open) {
      const days = m.material.availability ?? [];
      if (!days.length || !days.includes(weekday)) continue;
      // Sunday opens every domain, so it is left out beside a material's own days.
      const line = rotating.get(family(m.material.category)) ?? { days: days.length > 1 ? days.filter((d) => d !== 7) : days, materials: [] };
      line.materials.push(m.material.id);
      rotating.set(family(m.material.category), line);
    }
    for (const [name, { days, materials }] of rotating) out.push({ kind: "domain", text: `${name} (${days.map((d) => DAY[d]).join("/")}) for ${g.owner}`, unit, materials, days });
    const any = open.filter((m) => !m.material.availability?.length);
    if (any.length) out.push({ kind: "anyday", text: `materials for ${g.owner} (any day)`, unit, materials: any.map((m) => m.material.id), days: [] });
  }
  return out;
}
