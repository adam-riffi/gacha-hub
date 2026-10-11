/**
 * Endgame enemies importer: each cycle's stages and enemies from the Hakushin
 * dataset (static.nanoka.cc; data © HoYoverse), for the modes that rotate
 * them: Zenless Zone Zero's Shiyu Defense (the Critical Node's frontiers, two
 * halves each) and Deadly Assault (three bosses), and Genshin's Stygian
 * Onslaught (three bosses; Hakushin files it as "leyline"). Run from
 * scripts/catalog: `npm run endgame`. Output: packages/shared/src/games/
 * {zzz,genshin}/endgame.json. Star Rail's Apocalyptic Shadow has no dates
 * there, so it is left out until a source has them.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { endgameEnemiesSchema, type EndgameEnemies, type EnemyStage } from "../../packages/shared/src/enemies.js";
import { fetchJson } from "./common.js";

const BASE = "https://static.nanoka.cc";
const get = <T>(path: string) => fetchJson<T>(`${BASE}${path}`, { cacheKey: "zzz-endgame" });
const live = await get<{ zzz: { live: string }; gi: { live: string } }>("/manifest.json");
const version = live.zzz.live;
console.log(`[catalog:endgame] Hakushin data, ZZZ live version ${version}, Genshin ${live.gi.live}`);

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

/** Validate and write a game's endgame enemies. */
function write(gameKey: string, source: string, list: EndgameEnemies["cycles"]) {
  const out = endgameEnemiesSchema.parse({ source, cycles: list.sort((a, b) => a.modeKey.localeCompare(b.modeKey) || a.begin.localeCompare(b.begin)) });
  const file = fileURLToPath(new URL(`../../packages/shared/src/games/${gameKey}/endgame.json`, import.meta.url));
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log(`[catalog:endgame] wrote ${file}: ${out.cycles.length} cycles`);
}
write("zzz", `hakushin@static.nanoka.cc/zzz/${version}`, cycles);

// Stygian Onslaught: three bosses a cycle, at six difficulties; the card shows them at the top one (its name and monster level).
type Boss = { name: string; icon?: string };
type Difficulty = { monster_level: number; difficulty_config: { level: number }; level_config: Record<string, Boss> };
const gi = live.gi.live;
const stygian: EndgameEnemies["cycles"] = [];
for (const [id, c] of Object.entries(await get<Index>(`/gi/${gi}/leyline.json`))) {
  if (!c.begin || !c.end || !recent(c.begin)) continue;
  const detail = await get<{ level: Record<string, Difficulty> }>(`/gi/${gi}/en/leyline/${id}.json`);
  const top = Object.values(detail.level).sort((a, b) => b.difficulty_config.level - a.difficulty_config.level)[0];
  if (!top) continue;
  const stages = Object.values(top.level_config).map((b) => ({
    name: b.name,
    level: top.monster_level,
    groups: [[{ name: b.name, image: b.icon ? `${BASE}/assets/gi/${b.icon}.webp` : undefined, weak: [] }]],
    weak: [],
  }));
  stygian.push({ modeKey: "stygian", begin: dayOf(c.begin), end: dayOf(c.end), stages });
}
write("genshin", `hakushin@static.nanoka.cc/gi/${gi}`, stygian);
