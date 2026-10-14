/** A Genshin showcase on Enka (https://github.com/EnkaNetwork/API-docs). */
export const enkaGenshinUrl = (uid: string) => `https://enka.network/api/uid/${encodeURIComponent(uid)}/`;
/** A ZZZ showcase on Enka. */
export const enkaZzzUrl = (uid: string) => `https://enka.network/api/zzz/uid/${encodeURIComponent(uid)}`;
/** A Star Rail showcase on Enka. */
export const enkaHsrUrl = (uid: string) => `https://enka.network/api/hsr/uid/${encodeURIComponent(uid)}`;

/** Enka's stat ids in our sheet's words. */
const STAT: Record<string, string> = {
  FIGHT_PROP_HP: "HP",
  FIGHT_PROP_HP_PERCENT: "HP%",
  FIGHT_PROP_ATTACK: "ATK",
  FIGHT_PROP_ATTACK_PERCENT: "ATK%",
  FIGHT_PROP_DEFENSE: "DEF",
  FIGHT_PROP_DEFENSE_PERCENT: "DEF%",
  FIGHT_PROP_CRITICAL: "CRIT Rate",
  FIGHT_PROP_CRITICAL_HURT: "CRIT DMG",
  FIGHT_PROP_CHARGE_EFFICIENCY: "Energy Recharge",
  FIGHT_PROP_ELEMENT_MASTERY: "Elemental Mastery",
  FIGHT_PROP_HEAL_ADD: "Healing Bonus",
  FIGHT_PROP_PHYSICAL_ADD_HURT: "Physical DMG",
  FIGHT_PROP_FIRE_ADD_HURT: "Pyro DMG",
  FIGHT_PROP_ELEC_ADD_HURT: "Electro DMG",
  FIGHT_PROP_WATER_ADD_HURT: "Hydro DMG",
  FIGHT_PROP_WIND_ADD_HURT: "Anemo DMG",
  FIGHT_PROP_ICE_ADD_HURT: "Cryo DMG",
  FIGHT_PROP_ROCK_ADD_HURT: "Geo DMG",
  FIGHT_PROP_GRASS_ADD_HURT: "Dendro DMG",
};
const SLOT: Record<string, string> = { EQUIP_BRACER: "flower", EQUIP_NECKLACE: "plume", EQUIP_SHOES: "sands", EQUIP_RING: "goblet", EQUIP_DRESS: "circlet" };
/** The character's final stats (fightPropMap); rates come as fractions. */
const FINAL: [string, string, number][] = [
  ["2000", "HP", 1],
  ["2001", "ATK", 1],
  ["2002", "DEF", 1],
  ["20", "CRIT Rate", 100],
  ["22", "CRIT DMG", 100],
  ["23", "Energy Recharge", 100],
  ["28", "Elemental Mastery", 1],
];
const round1 = (value: number) => Math.round(value * 10) / 10;

type Stat = { mainPropId?: string; appendPropId?: string; appendPropID?: string; statValue?: number; propValue?: number };
type Equip = {
  itemId: number;
  weapon?: { level?: number; affixMap?: Record<string, number> };
  reliquary?: { level?: number };
  flat?: { itemType?: string; equipType?: string; icon?: string; reliquaryMainstat?: Stat; reliquarySubstats?: Stat[] };
};
type Avatar = { avatarId?: number; avatarID?: number; propMap?: Record<string, { val?: string }>; talentIdList?: number[]; skillLevelMap?: Record<string, number>; fightPropMap?: Record<string, number>; equipList?: Equip[] };

const statOf = (stat: Stat | undefined) => {
  const id = stat?.mainPropId ?? stat?.appendPropId ?? stat?.appendPropID;
  return id ? STAT[id] : undefined;
};
const valueOf = (stat: Stat) => stat.statValue ?? stat.propValue ?? 0;

/**
 * A Genshin showcase as our builds (ADR 0005): level, constellation, weapon
 * (name, level, refinement), artifacts per slot (set from the icon's set id,
 * main stat, level, substats) and final stats. Talents are left out: the
 * catalog does not yet say which skill id is which.
 */
export function readEnkaGenshin(
  json: unknown,
  lookups: { weaponName: (id: string) => string | undefined; setName: (setId: string) => string | undefined; skillOrder?: (catalogId: string) => readonly string[] | undefined },
): { level?: number; worldLevel?: number; builds: { catalogId: string; doc: Record<string, unknown> }[] } | { error: "showcase_closed" } {
  const data = (typeof json === "object" && json ? json : {}) as { playerInfo?: { level?: number; worldLevel?: number }; avatarInfoList?: Avatar[] };
  if (!Array.isArray(data.avatarInfoList) || !data.avatarInfoList.length) return { error: "showcase_closed" };
  const builds = data.avatarInfoList.map((avatar) => {
    const doc: Record<string, unknown> = {};
    const level = Number(avatar.propMap?.["4001"]?.val);
    if (level) doc.level = level;
    doc.constellation = avatar.talentIdList?.length ?? 0;
    // Base talent levels, by the character's normal, skill and burst ids (constellation bonuses not included).
    const order = lookups.skillOrder?.(String(avatar.avatarId ?? avatar.avatarID));
    const talents = Object.fromEntries(
      (["normal", "skill", "burst"] as const).flatMap((talentKey, talentIndex) => {
        const level = order?.[talentIndex] ? avatar.skillLevelMap?.[order[talentIndex]!] : undefined;
        return level ? [[talentKey, level]] : [];
      }),
    );
    if (Object.keys(talents).length) doc.talents = talents;
    const artifacts: Record<string, unknown> = {};
    for (const equip of avatar.equipList ?? []) {
      if (equip.weapon) {
        const refinement = Object.values(equip.weapon.affixMap ?? {})[0];
        doc.weapon = { catalogId: String(equip.itemId), name: lookups.weaponName(String(equip.itemId)), level: equip.weapon.level, refinement: (refinement ?? 0) + 1 };
      } else if (equip.flat?.equipType && SLOT[equip.flat.equipType]) {
        const setId = /UI_RelicIcon_(\d+)_/.exec(equip.flat.icon ?? "")?.[1];
        artifacts[SLOT[equip.flat.equipType]!] = {
          setName: setId ? lookups.setName(setId) : undefined,
          mainStat: statOf(equip.flat.reliquaryMainstat),
          level: Math.max(0, (equip.reliquary?.level ?? 1) - 1),
          substats: (equip.flat.reliquarySubstats ?? []).flatMap((substat) => (statOf(substat) ? [{ stat: statOf(substat)!, value: round1(valueOf(substat)) }] : [])),
        };
      }
    }
    if (Object.keys(artifacts).length) doc.artifacts = artifacts;
    const fightProps = avatar.fightPropMap ?? {};
    doc.stats = Object.fromEntries(FINAL.filter(([id]) => fightProps[id] !== undefined).map(([id, name, scale]) => [name, scale === 1 ? Math.round(fightProps[id]!) : round1(fightProps[id]! * scale)]));
    return { catalogId: String(avatar.avatarId ?? avatar.avatarID), doc: JSON.parse(JSON.stringify(doc)) as Record<string, unknown> };
  });
  return { level: data.playerInfo?.level, worldLevel: data.playerInfo?.worldLevel, builds };
}

const plain = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const same = (first: unknown, second: unknown) => JSON.stringify(first) === JSON.stringify(second);

/**
 * A sync's values over a build (ADR 0005): a field still holding what the
 * last sync wrote, or empty, takes the new value (AUTO); a field the user
 * changed since is kept (MANUAL). Objects merge field by field.
 */
export function mergeSynced(current: Record<string, unknown>, synced: Record<string, unknown> | null, incoming: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    const now = current[key];
    const before = synced?.[key];
    if (plain(value) && plain(now)) out[key] = mergeSynced(now, plain(before) ? before : null, value);
    else if (now === undefined || same(now, before)) out[key] = value;
  }
  return out;
}

/** Star Rail's stat names (Enka's, the game's) in our sheet's words, and whether they read as a percentage. */
const HSR_STAT: Record<string, [string, boolean]> = {
  HPDelta: ["HP", false],
  AttackDelta: ["ATK", false],
  DefenceDelta: ["DEF", false],
  HPAddedRatio: ["HP%", true],
  AttackAddedRatio: ["ATK%", true],
  DefenceAddedRatio: ["DEF%", true],
  SpeedDelta: ["SPD", false],
  CriticalChanceBase: ["CRIT Rate", true],
  CriticalDamageBase: ["CRIT DMG", true],
  StatusProbabilityBase: ["Effect Hit Rate", true],
  StatusResistanceBase: ["Effect RES", true],
  BreakDamageAddedRatioBase: ["Break Effect", true],
  HealRatioBase: ["Outgoing Healing Boost", true],
  SPRatioBase: ["Energy Regeneration Rate", true],
  PhysicalAddedRatio: ["Physical DMG Boost", true],
  FireAddedRatio: ["Fire DMG Boost", true],
  IceAddedRatio: ["Ice DMG Boost", true],
  ThunderAddedRatio: ["Lightning DMG Boost", true],
  WindAddedRatio: ["Wind DMG Boost", true],
  QuantumAddedRatio: ["Quantum DMG Boost", true],
  ImaginaryAddedRatio: ["Imaginary DMG Boost", true],
};

type RelicStats = {
  pieces: Record<string, { slot: string; set: string; main: string; sub: string }>;
  main: Record<string, Record<string, { stat: string; base: number; add: number }>>;
  sub: Record<string, Record<string, { stat: string; base: number; step: number }>>;
};
type HsrAvatar = {
  avatarId: number;
  level?: number;
  rank?: number;
  equipment?: { tid: number; level?: number; rank?: number } | null;
  relicList?: { tid: number; level?: number; mainAffixId: number; subAffixList?: { affixId: number; cnt?: number; step?: number }[] }[];
};

/**
 * A Star Rail showcase as our builds (ADR 0005): level, eidolon, the light
 * cone, and each relic with its set, main stat at its level and substats
 * summed from their rolls, all from the catalog's relic tables (the game sends
 * ids, not values). Fields the game leaves out are zero.
 */
export function readEnkaHsr(
  json: unknown,
  lookups: { weaponName: (id: string) => string | undefined; setName: (setId: string) => string | undefined; relicStats: RelicStats },
): { level?: number; worldLevel?: number; builds: { catalogId: string; doc: Record<string, unknown> }[] } | { error: "showcase_closed" } {
  const info = ((typeof json === "object" && json ? json : {}) as { detailInfo?: { level?: number; worldLevel?: number; avatarDetailList?: HsrAvatar[] } }).detailInfo;
  const list = info?.avatarDetailList ?? [];
  if (!list.length) return { error: "showcase_closed" };
  const relicTables = lookups.relicStats;
  const value = (stat: string, raw: number) => (HSR_STAT[stat]?.[1] ? round1(raw * 100) : round1(raw));
  const builds = list.map((avatar) => {
    const doc: Record<string, unknown> = { eidolon: avatar.rank ?? 0 };
    if (avatar.level) doc.level = avatar.level;
    if (avatar.equipment) {
      const id = String(avatar.equipment.tid);
      doc.lightCone = { catalogId: id, name: lookups.weaponName(id), level: avatar.equipment.level, superimposition: avatar.equipment.rank ?? 1 };
    }
    const relics: Record<string, unknown> = {};
    for (const relic of avatar.relicList ?? []) {
      const piece = relicTables.pieces[String(relic.tid)];
      if (!piece) continue;
      const level = relic.level ?? 0;
      const main = relicTables.main[piece.main]?.[String(relic.mainAffixId)];
      relics[piece.slot] = {
        setName: lookups.setName(piece.set),
        mainStat: main ? HSR_STAT[main.stat]?.[0] : undefined,
        level,
        substats: (relic.subAffixList ?? []).flatMap((substat) => {
          const substatRow = relicTables.sub[piece.sub]?.[String(substat.affixId)];
          const name = substatRow && HSR_STAT[substatRow.stat]?.[0];
          return substatRow && name ? [{ stat: name, value: value(substatRow.stat, substatRow.base * (substat.cnt ?? 0) + substatRow.step * (substat.step ?? 0)) }] : [];
        }),
      };
    }
    if (Object.keys(relics).length) doc.relics = relics;
    return { catalogId: String(avatar.avatarId), doc: JSON.parse(JSON.stringify(doc)) as Record<string, unknown> };
  });
  return { level: info?.level, worldLevel: info?.worldLevel, builds };
}

/** ZZZ's property ids (Enka's) in our sheet's words, and whether the game keeps them in hundredths of a percent. */
const ZZZ_STAT: Record<number, [string, boolean]> = {
  11102: ["HP%", true],
  11103: ["HP", false],
  12102: ["ATK%", true],
  12103: ["ATK", false],
  12202: ["Impact%", true],
  13102: ["DEF%", true],
  13103: ["DEF", false],
  20103: ["CRIT Rate%", true],
  21103: ["CRIT DMG%", true],
  23103: ["PEN Ratio%", true],
  23203: ["PEN", false],
  30502: ["Energy Regen%", true],
  31203: ["Anomaly Proficiency", false],
  31402: ["Anomaly Mastery%", true],
  31503: ["Attribute DMG Bonus%", true],
  31603: ["Attribute DMG Bonus%", true],
  31703: ["Attribute DMG Bonus%", true],
  31803: ["Attribute DMG Bonus%", true],
  31903: ["Attribute DMG Bonus%", true],
};
/** Enka's skill indexes; 5 is the core skill. */
const ZZZ_SKILL: Record<number, string> = { 0: "basic", 1: "special", 2: "dodge", 3: "chain", 5: "core", 6: "assist" };

type ZzzStat = { PropertyId: number; PropertyValue: number; PropertyLevel?: number };
type ZzzAvatar = {
  Id: number;
  Level?: number;
  TalentLevel?: number;
  Weapon?: { Id: number; Level?: number; UpgradeLevel?: number } | null;
  SkillLevelList?: { Index: number; Level: number }[] | Record<string, number>;
  EquippedList?: { Slot: number; Equipment: { Id: number; Level?: number; MainStatList?: ZzzStat[]; RandomPropertyList?: ZzzStat[] } }[];
};

/**
 * A ZZZ showcase as our builds (ADR 0005): level, Mindscape, the W-Engine and
 * its phase, the five skills' base levels, and each Drive Disc. A disc's id
 * is its set, rarity and slot (31441: set 31400, S, slot 1); a substat is its
 * base value times its rolls.
 */
export function readEnkaZzz(
  json: unknown,
  lookups: { weaponName: (id: string) => string | undefined; setName: (setId: string) => string | undefined },
): { level?: number; builds: { catalogId: string; doc: Record<string, unknown> }[] } | { error: "showcase_closed" } {
  const info = ((typeof json === "object" && json ? json : {}) as { PlayerInfo?: { SocialDetail?: { ProfileDetail?: { Level?: number } }; ShowcaseDetail?: { AvatarList?: ZzzAvatar[] } } }).PlayerInfo;
  const list = info?.ShowcaseDetail?.AvatarList ?? [];
  if (!list.length) return { error: "showcase_closed" };
  const builds = list.map((avatar) => {
    const doc: Record<string, unknown> = { mindscape: avatar.TalentLevel ?? 0 };
    if (avatar.Level) doc.level = avatar.Level;
    if (avatar.Weapon) doc.wEngine = { name: lookups.weaponName(String(avatar.Weapon.Id)), level: avatar.Weapon.Level, phase: avatar.Weapon.UpgradeLevel };
    const levels = Array.isArray(avatar.SkillLevelList) ? avatar.SkillLevelList : Object.entries(avatar.SkillLevelList ?? {}).map(([Index, Level]) => ({ Index: Number(Index), Level }));
    const skills = Object.fromEntries(levels.flatMap((skill) => (ZZZ_SKILL[skill.Index] ? [[ZZZ_SKILL[skill.Index]!, skill.Level]] : [])));
    if (Object.keys(skills).length) doc.skills = skills;
    const discs: Record<string, unknown> = {};
    for (const { Slot, Equipment: equipment } of avatar.EquippedList ?? []) {
      const main = equipment.MainStatList?.[0];
      discs[`slot${Slot}`] = {
        setName: lookups.setName(String(Math.floor(equipment.Id / 100) * 100)),
        mainStat: main ? ZZZ_STAT[main.PropertyId]?.[0] : undefined,
        level: equipment.Level ?? 0,
        substats: (equipment.RandomPropertyList ?? []).flatMap((substat) => {
          const stat = ZZZ_STAT[substat.PropertyId];
          return stat ? [{ stat: stat[0], value: round1((substat.PropertyValue * (substat.PropertyLevel ?? 1)) / (stat[1] ? 100 : 1)) }] : [];
        }),
      };
    }
    if (Object.keys(discs).length) doc.discs = discs;
    return { catalogId: String(avatar.Id), doc: JSON.parse(JSON.stringify(doc)) as Record<string, unknown> };
  });
  return { level: info?.SocialDetail?.ProfileDetail?.Level, builds };
}
