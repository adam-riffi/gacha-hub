import { cadenceWindow, type CadenceAnchor } from "../cadence.js";
import { fiveStarDistribution, rateAt } from "../odds.js";
import type { GameDefinition } from "./types.js";

const DAY = 86_400_000;
/** Instants spread over 2024–2030, deterministic, for checking cadence windows. */
const INSTANTS = Array.from({ length: 97 }, (_, k) => new Date(Date.UTC(2024, 0, 1) + k * 23.7 * DAY + k * 3_271_000));

/** Set a dotted path ("weapon.refinement") in an empty build document. */
const at = (path: string, v: number) => path.split(".").reduceRight<unknown>((inner, k) => ({ [k]: inner }), v);

/**
 * The shared conformance suite (ADR 0004, step 3): what every registered or
 * scaffolded game must satisfy: its servers and cadence windows, stamina,
 * shops and endgame modes, passes and version, gear block and dupes against
 * its build schema, KPIs and art sources, pull odds that sum to 1, and a
 * reference sheet (`docs/games/<key>.md`) that names what the manifest names.
 * Returns the problems found; an empty list passes.
 */
export function conformance(game: GameDefinition, sheet: string): string[] {
  const out: string[] = [];
  const fail = (ok: boolean, what: string) => {
    if (!ok) out.push(`${game.key}: ${what}`);
  };
  const m = game.manifest;

  fail(game.regions.length > 0 && new Set(game.regions.map((r) => r.key)).size === game.regions.length, "regions need unique keys");
  for (const r of game.regions) {
    fail(Math.abs(r.utcOffsetMinutes) % 15 === 0 && Math.abs(r.utcOffsetMinutes) <= 14 * 60, `${r.key}: UTC offset in quarter hours, within ±14 h`);
    fail(Number.isInteger(r.dailyResetHour) && r.dailyResetHour >= 0 && r.dailyResetHour <= 23, `${r.key}: reset hour 0–23`);
    fail(Number.isInteger(r.weeklyResetWeekday) && r.weeklyResetWeekday >= 1 && r.weeklyResetWeekday <= 7, `${r.key}: weekly reset weekday 1–7`);
  }

  const anchors: [string, CadenceAnchor][] = [
    ["daily", { cadence: "daily" }],
    ["weekly", { cadence: "weekly" }],
    ...m.monthlyShops.map((s): [string, CadenceAnchor] => [s.name, { cadence: "monthly", day: s.day }]),
    ...m.endgame.map((e): [string, CadenceAnchor] => [e.name, e.anchor]),
    ["version", { cadence: "version", start: m.version.start, days: m.version.days }],
  ];
  for (const r of game.regions.filter((x) => x.dailyResetHour >= 0 && x.dailyResetHour <= 23)) {
    for (const [name, a] of anchors) {
      const bad = INSTANTS.find((now) => {
        const w = cadenceWindow(a, r, now);
        const local = new Date(w.start.getTime() + r.utcOffsetMinutes * 60_000);
        return !(w.start <= now && now < w.end && local.getUTCHours() === r.dailyResetHour && cadenceWindow(a, r, w.end).start.getTime() === w.end.getTime());
      });
      fail(!bad, `${r.key}: ${name} windows must contain now, start at the reset hour and chain`);
    }
  }

  const stamina = game.currencies.find((c) => c.key === m.stamina.currency);
  fail(Boolean(stamina?.cap && stamina.regenPerHour), "stamina needs a currency with a cap and a regeneration rate");
  if (m.stamina.reserve) fail(Boolean(game.currencies.find((c) => c.key === m.stamina.reserve!.currency)?.cap), "the reserve needs a currency with a cap");
  if (m.stamina.capAt) {
    const caps = Array.from({ length: 200 }, (_, l) => m.stamina.capAt!(l + 1));
    fail(caps.every((c, i) => c > 0 && (i === 0 || c >= caps[i - 1]!)) && m.stamina.capAt(10_000) === stamina?.cap, "the cap by level must never fall and must top out at the currency's cap");
  }

  for (const s of m.monthlyShops) fail(s.day >= 1 && s.day <= 31, `${s.name}: day 1–31`);
  fail(new Set(m.endgame.map((e) => e.key)).size === m.endgame.length, "endgame modes need unique keys");
  for (const e of m.endgame) {
    fail(["monthly", "cycle", "version"].includes(e.anchor.cadence), `${e.name}: a monthly, cycle or version cadence`);
    if (e.anchor.cadence === "cycle" || e.anchor.cadence === "version") {
      fail(!Number.isNaN(Date.parse(e.anchor.start)) && e.anchor.days > 0 && (e.openDays ?? e.anchor.days) <= e.anchor.days, `${e.name}: a valid start, length and open days`);
    }
    fail((e.metric.max ?? 1) > 0 && (e.maxPremium ?? 1) > 0, `${e.name}: a positive best result and premium offer`);
  }
  fail((m.battlePass?.maxLevel ?? 1) > 0 && (m.monthlyPass?.days ?? 1) > 0, "passes need positive levels and days");
  fail((m.monthlyPass?.daily ?? 1) > 0 && (m.income?.daily ?? 1) > 0, "premium income per day must be positive");
  fail(!Number.isNaN(Date.parse(m.version.start)) && m.version.days > 0, "the version needs a start date and a length");

  const slots = m.gear.slots;
  fail(slots.length > 0 && new Set(slots.map((s) => s.key)).size === slots.length && m.gear.sets.every((n) => n > 1), "the gear block needs unique slots and sets of two or more");
  fail(game.docSchema.safeParse({ [m.gear.field]: Object.fromEntries(slots.map((s) => [s.key, { level: 0 }])) }).success, "the build document must hold a full gear block");
  for (const d of [m.dupes.character, m.dupes.weapon]) {
    if (!d) continue;
    fail(game.docSchema.safeParse(at(d.field, d.max)).success && !game.docSchema.safeParse(at(d.field, d.max + 1)).success, `${d.label}: the build document must stop at ${d.max}`);
  }
  fail(Object.keys(m.kpis).length > 0 && Object.values(m.kpis).every((k) => k.length >= 1 && k.length <= 3), "KPIs: one to three per role");
  fail(Object.values(m.art).every((u) => /^https:\/\/.*\{key\}/.test(u ?? "")), "art sources must be https URLs with {key}");

  for (const b of game.pullBanners ?? []) {
    let rising = rateAt(b, b.hardPity) === 1;
    for (let n = 2; n <= b.hardPity; n++) rising &&= rateAt(b, n) >= rateAt(b, n - 1);
    const sums = Array.from({ length: b.hardPity }, (_, pity) => fiveStarDistribution(b, pity).reduce((s, p) => s + p, 0));
    fail(rising && sums.every((s) => Math.abs(s - 1) < 1e-9), `${b.label}: rates must climb to certainty and the odds must sum to 1`);
  }

  const names = [
    stamina?.label,
    game.currencies.find((c) => c.key === m.stamina.reserve?.currency)?.label,
    ...m.monthlyShops.map((s) => s.name),
    ...m.endgame.map((e) => e.name),
    m.battlePass?.name,
    m.monthlyPass?.name,
    m.income?.label,
    m.version.name,
    m.accountLevel.name,
    m.gear.name,
    m.dupes.character.label,
    m.dupes.weapon?.label,
  ];
  for (const n of names) if (n) fail(sheet.includes(n), `the reference sheet must name "${n}"`);
  return out;
}
