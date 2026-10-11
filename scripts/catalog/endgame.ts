/**
 * Endgame enemies importer: each cycle's stages and enemies from the Hakushin
 * dataset (static.nanoka.cc; data © HoYoverse), for the modes that rotate
 * them: Zenless Zone Zero's Shiyu Defense (the Critical Node's frontiers, two
 * halves each) and Deadly Assault (three bosses). Run from scripts/catalog:
 * `npm run endgame`. Output: packages/shared/src/games/zzz/endgame.json.
 * Genshin's Stygian Onslaught and Star Rail's Apocalyptic Shadow have no dated
 * schedule there, so they are left out until a source has one.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { endgameEnemiesSchema, type EndgameEnemies, type EnemyStage } from "../../packages/shared/src/enemies.js";
import { fetchJson } from "./common.js";

const BASE = "https://static.nanoka.cc";
const get = <T>(path: string) => fetchJson<T>(`${BASE}${path}`, { cacheKey: "zzz-endgame" });
const version = (await get<{ zzz: { live: string } }>("/manifest.json")).zzz.live;
console.log(`[catalog:endgame] Hakushin data, ZZZ live version ${version}`);

type Monster = { name: string; image?: string };
type Room = { monster_list?: Record<string, Monster>; monster_weakness?: Record<string, string> };
type Zone = { name: string; stage_num?: number; monster_level?: number; layer_room?: Record<string, Room> };
type Index = Record<string, { begin?: string; end?: string; en?: string }>;

/** "UI/…/Monster_TarasqueMixer.png" → the art host's copy of it. */
const image = (path?: string) => {
  const key = path?.split("/").at(-1)?.split(".")[0];
  return key ? `${BASE}/assets/zzz/${key}.webp` : undefined;
};
const dayOf = (s?: string) => s?.slice(0, 10) ?? "";
/** Cycles that began in the last 120 days or begin within 60: enough to look back a few and ahead one. */
const recent = (begin: string) => {
  const t = Date.parse(begin.replace(" ", "T") + "Z");
  return t > Date.now() - 120 * 86_400_000 && t < Date.now() + 60 * 86_400_000;
};

const stageOf = (z: Zone, name = z.name): EnemyStage => {
  const rooms = Object.values(z.layer_room ?? {});
  return {
    // A stage the dataset leaves unnamed goes by its number.
    name: name || `Stage ${z.stage_num ?? "?"}`,
    level: z.monster_level || undefined,
    groups: rooms.map((r) => Object.values(r.monster_list ?? {}).map((m) => ({ name: m.name, image: image(m.image), weak: [] }))),
    weak: [...new Set(rooms.flatMap((r) => Object.values(r.monster_weakness ?? {})))],
  };
};

const cycles: EndgameEnemies["cycles"] = [];

// Shiyu Defense: the Critical Node, whose ids start at 62000, each cycle dated.
const shiyu = await get<Index>(`/zzz/${version}/shiyu.json`);
for (const [id, s] of Object.entries(shiyu)) {
  if (!id.startsWith("62") || !s.begin || !s.end || !recent(s.begin)) continue;
  const detail = await get<{ zone: Record<string, Zone> }>(`/zzz/${version}/en/shiyu/${id}.json`);
  const stages = Object.values(detail.zone)
    .map((z) => stageOf(z, z.name.replace(/^Critical Node: /, "")))
    .filter((st) => st.groups.flat().length > 0);
  cycles.push({ modeKey: "shiyu", begin: dayOf(s.begin), end: dayOf(s.end), stages });
}

// Deadly Assault: three bosses a cycle (its last mode; the first is a combined fight).
const boss = await get<Index>(`/zzz/${version}/boss.json`);
for (const [id, b] of Object.entries(boss)) {
  if (!b.begin || !b.end || !recent(b.begin)) continue;
  const detail = await get<{ modes: { zone: Record<string, Zone> }[] }>(`/zzz/${version}/en/boss/${id}.json`);
  const bosses = detail.modes.at(-1)?.zone ?? {};
  cycles.push({ modeKey: "assault", begin: dayOf(b.begin), end: dayOf(b.end), stages: Object.values(bosses).map((z) => stageOf(z)).filter((st) => st.groups.flat().length > 0) });
}

const out = endgameEnemiesSchema.parse({ source: `hakushin@static.nanoka.cc/zzz/${version}`, cycles: cycles.sort((a, b) => a.modeKey.localeCompare(b.modeKey) || a.begin.localeCompare(b.begin)) });
const file = fileURLToPath(new URL("../../packages/shared/src/games/zzz/endgame.json", import.meta.url));
writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
console.log(`[catalog:endgame] wrote ${file}: ${out.cycles.length} cycles`);
