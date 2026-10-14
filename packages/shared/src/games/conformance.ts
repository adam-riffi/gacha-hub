import { cadenceWindow, type CadenceAnchor } from "../cadence.js";
import { fiveStarDistribution, rateAt } from "../odds.js";
import type { GameDefinition } from "./types.js";

const DAY = 86_400_000;
/** Instants spread over 2024–2030, deterministic, for checking cadence windows. */
const INSTANTS = Array.from({ length: 97 }, (_, instantIndex) => new Date(Date.UTC(2024, 0, 1) + instantIndex * 23.7 * DAY + instantIndex * 3_271_000));

/** Set a dotted path ("weapon.refinement") in an empty build document. */
const at = (path: string, value: number) => path.split(".").reduceRight<unknown>((inner, key) => ({ [key]: inner }), value);

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
  const manifest = game.manifest;

  fail(game.regions.length > 0 && new Set(game.regions.map((region) => region.key)).size === game.regions.length, "regions need unique keys");
  for (const region of game.regions) {
    fail(Math.abs(region.utcOffsetMinutes) % 15 === 0 && Math.abs(region.utcOffsetMinutes) <= 14 * 60, `${region.key}: UTC offset in quarter hours, within ±14 h`);
    fail(Number.isInteger(region.dailyResetHour) && region.dailyResetHour >= 0 && region.dailyResetHour <= 23, `${region.key}: reset hour 0–23`);
    fail(Number.isInteger(region.weeklyResetWeekday) && region.weeklyResetWeekday >= 1 && region.weeklyResetWeekday <= 7, `${region.key}: weekly reset weekday 1–7`);
  }

  const anchors: [string, CadenceAnchor][] = [
    ["daily", { cadence: "daily" }],
    ["weekly", { cadence: "weekly" }],
    ...manifest.monthlyShops.map((shop): [string, CadenceAnchor] => [shop.name, { cadence: "monthly", day: shop.day }]),
    ...manifest.endgame.map((mode): [string, CadenceAnchor] => [mode.name, mode.anchor]),
    ["version", { cadence: "version", start: manifest.version.start, days: manifest.version.days }],
  ];
  for (const region of game.regions.filter((candidateRegion) => candidateRegion.dailyResetHour >= 0 && candidateRegion.dailyResetHour <= 23)) {
    for (const [name, anchor] of anchors) {
      const bad = INSTANTS.find((now) => {
        const cycleWindow = cadenceWindow(anchor, region, now);
        const local = new Date(cycleWindow.start.getTime() + region.utcOffsetMinutes * 60_000);
        return !(cycleWindow.start <= now && now < cycleWindow.end && local.getUTCHours() === region.dailyResetHour && cadenceWindow(anchor, region, cycleWindow.end).start.getTime() === cycleWindow.end.getTime());
      });
      fail(!bad, `${region.key}: ${name} windows must contain now, start at the reset hour and chain`);
    }
  }

  const stamina = game.currencies.find((currency) => currency.key === manifest.stamina.currency);
  fail(Boolean(stamina?.cap && stamina.regenPerHour), "stamina needs a currency with a cap and a regeneration rate");
  if (manifest.stamina.reserve) fail(Boolean(game.currencies.find((currency) => currency.key === manifest.stamina.reserve!.currency)?.cap), "the reserve needs a currency with a cap");
  if (manifest.stamina.capAt) {
    const caps = Array.from({ length: 200 }, (_, level) => manifest.stamina.capAt!(level + 1));
    fail(caps.every((cap, capIndex) => cap > 0 && (capIndex === 0 || cap >= caps[capIndex - 1]!)) && manifest.stamina.capAt(10_000) === stamina?.cap, "the cap by level must never fall and must top out at the currency's cap");
  }

  for (const shop of manifest.monthlyShops) fail(shop.day >= 1 && shop.day <= 31, `${shop.name}: day 1–31`);
  fail(new Set(manifest.endgame.map((mode) => mode.key)).size === manifest.endgame.length, "endgame modes need unique keys");
  for (const mode of manifest.endgame) {
    fail(["monthly", "cycle", "version"].includes(mode.anchor.cadence), `${mode.name}: a monthly, cycle or version cadence`);
    if (mode.anchor.cadence === "cycle" || mode.anchor.cadence === "version") {
      fail(!Number.isNaN(Date.parse(mode.anchor.start)) && mode.anchor.days > 0 && (mode.openDays ?? mode.anchor.days) <= mode.anchor.days, `${mode.name}: a valid start, length and open days`);
    }
    fail((mode.metric.max ?? 1) > 0 && (mode.maxPremium ?? 1) > 0, `${mode.name}: a positive best result and premium offer`);
  }
  fail((manifest.battlePass?.maxLevel ?? 1) > 0 && (manifest.monthlyPass?.days ?? 1) > 0, "passes need positive levels and days");
  fail((manifest.monthlyPass?.daily ?? 1) > 0 && (manifest.income?.daily ?? 1) > 0, "premium income per day must be positive");
  fail(!Number.isNaN(Date.parse(manifest.version.start)) && manifest.version.days > 0, "the version needs a start date and a length");

  const slots = manifest.gear.slots;
  fail(slots.length > 0 && new Set(slots.map((slot) => slot.key)).size === slots.length && manifest.gear.sets.every((setSize) => setSize > 1), "the gear block needs unique slots and sets of two or more");
  fail(game.docSchema.safeParse({ [manifest.gear.field]: Object.fromEntries(slots.map((slot) => [slot.key, { level: 0 }])) }).success, "the build document must hold a full gear block");
  for (const dupe of [manifest.dupes.character, manifest.dupes.weapon]) {
    if (!dupe) continue;
    fail(game.docSchema.safeParse(at(dupe.field, dupe.max)).success && !game.docSchema.safeParse(at(dupe.field, dupe.max + 1)).success, `${dupe.label}: the build document must stop at ${dupe.max}`);
  }
  fail(Object.keys(manifest.kpis).length > 0 && Object.values(manifest.kpis).every((kpiList) => kpiList.length >= 1 && kpiList.length <= 3), "KPIs: one to three per role");
  fail(Object.values(manifest.art).every((urlTemplate) => /^https:\/\/.*\{key\}/.test(urlTemplate ?? "")), "art sources must be https URLs with {key}");

  for (const banner of game.pullBanners ?? []) {
    let rising = rateAt(banner, banner.hardPity) === 1;
    for (let pullNumber = 2; pullNumber <= banner.hardPity; pullNumber++) rising &&= rateAt(banner, pullNumber) >= rateAt(banner, pullNumber - 1);
    const sums = Array.from({ length: banner.hardPity }, (_, pity) => fiveStarDistribution(banner, pity).reduce((total, probability) => total + probability, 0));
    fail(rising && sums.every((sum) => Math.abs(sum - 1) < 1e-9), `${banner.label}: rates must climb to certainty and the odds must sum to 1`);
  }

  const names = [
    stamina?.label,
    game.currencies.find((currency) => currency.key === manifest.stamina.reserve?.currency)?.label,
    ...manifest.monthlyShops.map((shop) => shop.name),
    ...manifest.endgame.map((mode) => mode.name),
    manifest.battlePass?.name,
    manifest.monthlyPass?.name,
    manifest.income?.label,
    manifest.version.name,
    manifest.accountLevel.name,
    manifest.worldLevel?.name,
    manifest.gear.name,
    manifest.dupes.character.label,
    manifest.dupes.weapon?.label,
  ];
  for (const name of names) if (name) fail(sheet.includes(name), `the reference sheet must name "${name}"`);
  // The game's own Overview card reads currencies and default tasks it has, each named in the sheet.
  for (const item of manifest.ownCard?.items ?? []) {
    const label = "currency" in item ? game.currencies.find((currency) => currency.key === item.currency)?.label : game.defaultTasks.find((task) => task.key === item.task)?.title;
    const key = "currency" in item ? item.currency : item.task;
    fail(Boolean(label), `the own card's "${key}" must be a currency or a default task of the game`);
    if (label) fail(sheet.includes(label), `the reference sheet must name "${label}"`);
  }
  return out;
}
