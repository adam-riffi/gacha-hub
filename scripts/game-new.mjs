#!/usr/bin/env node
// npm run game:new -- <key> "<Name>": scaffold a hardcoded game (ADR 0004, step 1).
// Writes the module with a placeholder manifest that passes the conformance
// suite, its reference sheet and a web sheet stub, and registers the game in
// packages/shared/src/games/index.ts and apps/web/src/render/index.tsx.
// Then fill the manifest with sourced values, citing each in docs/games/<key>.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KEY = /^[a-z][a-z0-9]{1,15}$/;
const pascal = (key) => key.charAt(0).toUpperCase() + key.slice(1);

/** Insert `text` before the first occurrence of `anchor` in `source` (line endings normalised: Windows checkouts have CRLF). */
function before(source, anchor, text, where) {
  source = source.replace(/\r\n/g, "\n");
  const i = source.indexOf(anchor);
  if (i < 0) throw new Error(`game:new: cannot find ${JSON.stringify(anchor)} in ${where}`);
  return source.slice(0, i) + text + source.slice(i);
}

/** What `game:new` writes and edits, as data; pure, so it is tested without touching the repository. */
export function scaffold(key, name, today) {
  if (!KEY.test(key)) throw new Error(`game:new: the key must be 2–16 lowercase letters and digits, starting with a letter (got ${JSON.stringify(key)})`);
  const P = pascal(key);
  const module = `import { z } from "zod";
import { statRowSchema } from "../../common.js";
import type { GameDefinition } from "../types.js";

/**
 * ${name}, scaffolded by \`npm run game:new\` on ${today}. Every value marked
 * TODO is a placeholder that passes the conformance suite: replace each with a
 * sourced one and cite it in docs/games/${key}.md (ADR 0004). The game ships at
 * capability M (by hand) until a catalog or a sync route exists.
 */
export const ${key.toUpperCase()}_GEAR_SLOTS = [1, 2, 3, 4].map((n) => ({ key: \`slot\${n}\`, label: \`Gear \${n}\` }));

const gearSchema = z
  .object({ setName: z.string(), mainStat: z.string(), level: z.number().int().min(0).max(20), substats: z.array(statRowSchema) })
  .partial();

export const ${key}DocSchema = z
  .object({
    level: z.number().int().min(1).max(90),
    dupes: z.number().int().min(0).max(6),
    gear: z.object({ slot1: gearSchema, slot2: gearSchema, slot3: gearSchema, slot4: gearSchema }).partial(),
    stats: z.record(z.string(), z.number()),
  })
  .partial();
export type ${P}Doc = z.infer<typeof ${key}DocSchema>;

export const ${key}: GameDefinition = {
  key: "${key}",
  name: "${name}",
  accent: "#9A9A9A", // TODO: the game's accent (VISUAL-DESIGN.md §3)
  regions: [{ key: "global", label: "Global", utcOffsetMinutes: 0, dailyResetHour: 4, weeklyResetWeekday: 1 }], // TODO(source)
  currencies: [
    { key: "stamina", label: "Stamina", cap: 240, regenPerHour: 10 }, // TODO(source)
    { key: "premium", label: "Premium currency", pullCost: 160, pullLabel: "pull" }, // TODO(source)
  ],
  pullBanners: [{ key: "character", label: "Character banner", baseRate: 0.006, softPity: 74, hardPity: 90, featuredRate: 0.5 }], // TODO(source)
  manifest: {
    stamina: { currency: "stamina" },
    monthlyShops: [],
    endgame: [],
    gear: { name: "Gear", field: "gear", slots: ${key.toUpperCase()}_GEAR_SLOTS.map((s) => ({ ...s, mainStats: [] })), sets: [2, 4], maxLevel: 20 }, // TODO(source)
    kpis: { damage: ["ATK", "Crit value"] }, // TODO: per build role
    dupes: { character: { field: "dupes", label: "Dupes", max: 6 } }, // TODO(source)
    art: {},
    accountLevel: { label: "Lv", name: "Account level" }, // TODO(source)
    version: { name: "1.0", start: "${today}", days: 42 }, // TODO(source)
  },
  defaultTasks: [{ key: "dailies", title: "Daily missions", cadence: "daily" }], // TODO(source)
  docSchema: ${key}DocSchema,
  emptyDoc: (): ${P}Doc => ({ gear: {}, stats: {} }),
  docVersion: 1,
};
`;
  const sheet = `import type { ${P}Doc } from "@gacha/shared";
import type { SheetProps } from "../../render/types";
import { PortraitPanel } from "../../render/PortraitPanel";
import { Labeled, Num } from "../../components/inputs";

/** ${name}'s character sheet: a stub from \`npm run game:new\`; build it from WIREFRAMES.md G5. */
export function ${P}Sheet({ doc, setDoc, name, portraitUrl, onName, onPortrait }: SheetProps<${P}Doc>) {
  return (
    <div className="sheet">
      <PortraitPanel name={name} portraitUrl={portraitUrl} onName={onName} onPortrait={onPortrait}>
        <hr />
        <Labeled label="Level">
          <Num value={doc.level} min={1} max={90} onChange={(v) => setDoc((d) => ({ ...d, level: v }))} />
        </Labeled>
        <Labeled label="Dupes">
          <Num value={doc.dupes} min={0} max={6} onChange={(v) => setDoc((d) => ({ ...d, dupes: v }))} />
        </Labeled>
      </PortraitPanel>
    </div>
  );
}
`;
  const doc = `# ${name}

> Manifest sources (ADR 0004), scaffolded ${today}. Every value is a placeholder until a source is cited here; \`~\` marks a value not verified yet, and a field with no value has no source and stays out of the manifest. Refresh at each version: the version row, the endgame anchors, the battle pass level cap.

| Field | Value | Source |
| --- | --- | --- |
| Servers | Global UTC+0 (placeholder) | |
| Daily and weekly reset | 04:00 server time; weekly on Monday (placeholder) | |
| Stamina | Stamina, cap 240, 1 every 6 minutes (placeholder) | |
| Gacha | Character banner: 0.6%, soft pity from 74, hard pity 90, 50/50 (placeholder) | |
| Gear | Gear: four slots, sets of 2 and 4 (placeholder) | |
| Dupes | Dupes, to 6 (placeholder) | |
| Account level | Account level (placeholder) | |
| Version | 1.0 from ${today}, 42 days (placeholder) | |
`;
  return {
    files: {
      [`packages/shared/src/games/${key}/index.ts`]: module,
      [`docs/games/${key}.md`]: doc,
      [`apps/web/src/games/${key}/Sheet.tsx`]: sheet,
    },
    edits: {
      "packages/shared/src/games/index.ts": (s) => {
        const where = "packages/shared/src/games/index.ts";
        let out = before(s, "\n/** The registry of hardcoded games.", `\nimport { ${key} } from "./${key}/index.js";`, where);
        out = before(out, "\n};\n\nexport const gameList", `\n  [${key}.key]: ${key},`, where);
        return `${out.trimEnd()}\nexport * from "./${key}/index.js";\n`;
      },
      "apps/web/src/render/index.tsx": (s) => {
        const where = "apps/web/src/render/index.tsx";
        let out = before(s, "\n\n/** Game keys that have a hardcoded", `\nimport { ${P}Sheet } from "../games/${key}/Sheet";`, where);
        out = out.replace(/const SHEET_KEYS = new Set\(\[([^\]]*)\]\)/, (_m, keys) => `const SHEET_KEYS = new Set([${keys}, "${key}"])`);
        return before(out, "    default:\n", `    case "${key}":\n      return <${P}Sheet {...props} />;\n`, where);
      },
    },
  };
}

// CLI: write the files and apply the edits from the repository root.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [key, name] = process.argv.slice(2);
  if (!key || !name) {
    console.error('Usage: npm run game:new -- <key> "<Name>"');
    process.exit(1);
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const out = scaffold(key, name, new Date().toISOString().slice(0, 10));
  for (const path of Object.keys(out.files)) {
    if (existsSync(resolve(root, path))) {
      console.error(`game:new: ${path} exists; is "${key}" taken?`);
      process.exit(1);
    }
  }
  for (const [path, text] of Object.entries(out.files)) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true });
    writeFileSync(resolve(root, path), text);
  }
  for (const [path, edit] of Object.entries(out.edits)) writeFileSync(resolve(root, path), edit(readFileSync(resolve(root, path), "utf8")));
  console.log(`Scaffolded ${name} (${key}). Next: fill packages/shared/src/games/${key}/index.ts with sourced values, cite each in docs/games/${key}.md, and run npm test.`);
}
