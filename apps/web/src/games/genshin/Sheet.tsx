import { useState, type CSSProperties } from "react";
import {
  GENSHIN_ARTIFACT_SLOTS,
  GENSHIN_ELEMENTS,
  type GenshinDoc,
} from "@gacha/shared";
import type { SheetProps } from "../../render/types";
import type { GearPiece } from "../../components/GearPieceCard";
import { Labeled, Num, Select, StatList } from "../../components/inputs";
import { GameIcon } from "../../components/GameIcon";
import { assetUrl, communityAssetUrl } from "../../lib/assets";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";

export const SUBSTATS = [
  "HP", "HP%", "ATK", "ATK%", "DEF", "DEF%",
  "Elemental Mastery", "Energy Recharge", "CRIT Rate", "CRIT DMG",
];
const FINAL_STATS = [
  "HP", "ATK", "DEF", "CRIT Rate", "CRIT DMG", "Elemental Mastery", "Energy Recharge",
];

// Valid main stats per artifact slot (flower/plume are fixed).
const ELEMENTAL_DMG = GENSHIN_ELEMENTS.map((e) => `${e} DMG`);
export const MAIN_STATS: Record<string, string[]> = {
  flower: ["HP"],
  plume: ["ATK"],
  sands: ["HP%", "ATK%", "DEF%", "Elemental Mastery", "Energy Recharge"],
  goblet: ["HP%", "ATK%", "DEF%", "Elemental Mastery", "Physical DMG", ...ELEMENTAL_DMG],
  circlet: ["HP%", "ATK%", "DEF%", "Elemental Mastery", "CRIT Rate", "CRIT DMG", "Healing Bonus"],
};

// Per-element accent — the sheet tints to the character's element on the neutral shell.
const ELEMENT_THEME: Record<string, { solid: string; glow: string; deep: string }> = {
  Anemo: { solid: "#5fb8a0", glow: "#8fe4cd", deep: "#12332c" },
  Geo: { solid: "#e0a835", glow: "#f5cf6b", deep: "#332810" },
  Electro: { solid: "#a97cd6", glow: "#c8a6ef", deep: "#2b1c3d" },
  Dendro: { solid: "#9bc53d", glow: "#c2e86a", deep: "#20300e" },
  Hydro: { solid: "#4aa8e0", glow: "#84d0f5", deep: "#102b3d" },
  Pyro: { solid: "#e4685f", glow: "#ff8a7a", deep: "#341614" },
  Cryo: { solid: "#79c7d6", glow: "#a9e6ef", deep: "#112d31" },
};
const DEFAULT_THEME = { solid: "#7c8cff", glow: "#9aa6ff", deep: "#1c2040" };

const STAR = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.9 6.3L22 9l-5 4.9L18.2 22 12 18.3 5.8 22 7 13.9 2 9l7.1-.7z" />
  </svg>
);

const num = (v: number | string | undefined): number | undefined => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

const TALENT_ABBR: Record<string, string> = { normal: "NA", skill: "E", burst: "Q" };
const SLOT_ABBR: Record<string, string> = {
  flower: "FL", plume: "PL", sands: "SA", goblet: "GO", circlet: "CI",
};

export function GenshinSheet({
  doc, setDoc, name, portraitUrl, onName, onPortrait, catalog,
}: SheetProps<GenshinDoc>) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // Element is fixed by the character unless the catalog gives none (Traveler).
  const fixedElement =
    catalog?.element && (GENSHIN_ELEMENTS as readonly string[]).includes(catalog.element)
      ? catalog.element
      : undefined;
  const element = fixedElement ?? doc.element;
  const theme = (element && ELEMENT_THEME[element]) || DEFAULT_THEME;

  const artifacts = (doc.artifacts ?? {}) as Record<string, GearPiece>;
  const setArtifact = (slot: string, piece: GearPiece) =>
    setDoc((d) => ({ ...d, artifacts: { ...(d.artifacts ?? {}), [slot]: piece } }));
  const setWeapon = (p: Partial<NonNullable<GenshinDoc["weapon"]>>) =>
    setDoc((d) => ({ ...d, weapon: { ...(d.weapon ?? {}), ...p } }));
  const setTalent = (k: string, v: number | undefined) =>
    setDoc((d) => ({ ...d, talents: { ...(d.talents ?? {}), [k]: v } }));
  const setStat = (k: string, v: number | undefined) =>
    setDoc((d) => ({ ...d, stats: { ...(d.stats ?? {}), [k]: v as number } }));

  const talents = (doc.talents ?? {}) as Record<string, number | undefined>;
  const stats = (doc.stats ?? {}) as Record<string, number | string | undefined>;
  const plan = doc.artifactPlan ?? {};
  const setPlan = (p: Partial<NonNullable<GenshinDoc["artifactPlan"]>>) =>
    setDoc((d) => ({ ...d, artifactPlan: { ...(d.artifactPlan ?? {}), ...p } }));

  const rarity = catalog?.rarity ?? 5;
  const maxCons = catalog?.maxConstellation ?? 6;
  const cons = doc.constellation ?? 0;
  const weaponInfo = doc.weapon?.name ? catalog?.resolveWeapon?.(doc.weapon.name) : undefined;

  const splashSrc =
    portraitUrl ??
    assetUrl("genshin", "portrait", catalog?.iconKey) ??
    assetUrl("genshin", "character", catalog?.iconKey);

  const cr = num(stats["CRIT Rate"]);
  const cd = num(stats["CRIT DMG"]);
  const ratio = cr && cr > 0 && cd != null ? `1 : ${(cd / cr).toFixed(2)}` : "—";

  const themeVars = {
    ["--el"]: theme.solid,
    ["--el-glow"]: theme.glow,
    ["--el-deep"]: theme.deep,
  } as CSSProperties;

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await api.upload(file);
      onPortrait(url);
      toast("Image uploaded");
    } catch {
      toast("Upload failed", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gs-sheet" style={themeVars}>
      {/* ---------- Left rail ---------- */}
      <div className="gs-rail">
        <div className="gs-splash">
          <GameIcon
            src={splashSrc}
            fallback={communityAssetUrl("genshin", "portrait", catalog?.iconKey)}
            alt={name || "Character"}
            tint={theme.solid}
            className="gs-splash-img"
          />
          {rarity > 0 && (
            <div className="gs-stars">
              {Array.from({ length: rarity }).map((_, i) => (
                <span key={i} className="gs-star">{STAR}</span>
              ))}
            </div>
          )}
          <div className="gs-splash-cap">
            <div className="gs-splash-name">{name || "Character"}</div>
            <div className="gs-splash-sub">
              {[element, catalog?.weaponType].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="gs-splash-lv">
            <div className="gs-splash-lv-v">Lv {doc.level ?? 1}</div>
          </div>
          <label className="gs-upload">
            {busy ? "Uploading…" : "Change art"}
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              style={{ display: "none" }}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
        </div>

        <div className="gs-card">
          <div className="gs-card-h">Identity</div>
          <Labeled label="Build name">
            <input value={name} onChange={(e) => onName(e.target.value)} />
          </Labeled>
          <div className="gs-id-grid">
            <Labeled label="Level">
              <Num value={doc.level} min={1} max={90} onChange={(v) => setDoc((d) => ({ ...d, level: v }))} />
            </Labeled>
            <Labeled label="Element">
              {fixedElement ? (
                <span className="badge gs-el-badge">{fixedElement}</span>
              ) : (
                <Select
                  value={doc.element}
                  options={GENSHIN_ELEMENTS}
                  onChange={(v) => setDoc((d) => ({ ...d, element: v as GenshinDoc["element"] }))}
                />
              )}
            </Labeled>
          </div>

          <div className="gs-track-h">
            <span>Constellation</span>
            <span className="muted small">C{cons}</span>
          </div>
          <div className="gs-cons">
            {Array.from({ length: maxCons }).map((_, i) => {
              const on = i < cons;
              return (
                <button
                  key={i}
                  type="button"
                  className={`gs-cnode ${on ? "on" : ""}`}
                  title={`C${i + 1}`}
                  onClick={() => setDoc((d) => ({ ...d, constellation: cons === i + 1 ? i : i + 1 }))}
                >
                  <GameIcon
                    src={assetUrl("genshin", "constellation", catalog?.iconKey ? `${catalog.iconKey}_c${i + 1}` : null)}
                    alt={`Constellation ${i + 1}`}
                    label={`${i + 1}`}
                    tint={theme.solid}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="gs-card gs-crit">
          <div className="gs-crit-cell">
            <div className="gs-crit-l">CRIT Rate</div>
            <div className="gs-crit-v">{cr != null ? `${cr}%` : "—"}</div>
          </div>
          <div className="gs-crit-cell">
            <div className="gs-crit-l">CRIT DMG</div>
            <div className="gs-crit-v">{cd != null ? `${cd}%` : "—"}</div>
          </div>
          <div className="gs-crit-ratio">
            <span className="muted small">Crit ratio</span>
            <b>{ratio}</b>
          </div>
        </div>
      </div>

      {/* ---------- Right stack ---------- */}
      <div className="gs-stack">
        <div className="gs-card">
          <div className="gs-card-h">
            Weapon
            {catalog?.weaponType && <span className="small muted"> · {catalog.weaponType}</span>}
          </div>
          <div className="gs-wep">
            <GameIcon
              src={assetUrl("genshin", "weapon", weaponInfo?.iconKey)}
              fallback={communityAssetUrl("genshin", "weapon", weaponInfo?.iconKey)}
              alt={doc.weapon?.name || "Weapon"}
              tint={theme.solid}
              className="gs-wep-ico"
            />
            <div className="gs-wep-body">
              <div className="gs-wep-top">
                <Labeled label="Name">
                  <input
                    value={doc.weapon?.name ?? ""}
                    onChange={(e) => setWeapon({ name: e.target.value || undefined })}
                    placeholder="Weapon name"
                  />
                </Labeled>
                {weaponInfo?.rarity ? (
                  <div className="gs-stars gs-stars-sm">
                    {Array.from({ length: weaponInfo.rarity }).map((_, i) => (
                      <span key={i} className="gs-star">{STAR}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="gs-wep-fields">
                <Labeled label="Level"><Num value={doc.weapon?.level} min={1} max={90} onChange={(v) => setWeapon({ level: v })} /></Labeled>
                <Labeled label="Refinement"><Num value={doc.weapon?.refinement} min={1} max={5} onChange={(v) => setWeapon({ refinement: v })} /></Labeled>
              </div>
              {(weaponInfo?.baseAtk != null || weaponInfo?.subStat) && (
                <div className="gs-wep-meta small muted">
                  {weaponInfo?.baseAtk != null && <span>Base ATK <b>{Math.round(weaponInfo.baseAtk)}</b></span>}
                  {weaponInfo?.subStat && <span>{weaponInfo.subStat}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="gs-card">
          <div className="gs-card-h">Talents</div>
          <div className="gs-talents">
            {(["normal", "skill", "burst"] as const).map((k) => (
              <div className="gs-talent" key={k}>
                <GameIcon
                  src={assetUrl("genshin", "talent", catalog?.iconKey ? `${catalog.iconKey}_${k}` : null)}
                  alt={k}
                  label={TALENT_ABBR[k]}
                  tint={theme.solid}
                  className="gs-talent-ico"
                />
                <div className="gs-talent-lab small muted">
                  {k === "normal" ? "Normal Attack" : k === "skill" ? "Elemental Skill" : "Elemental Burst"}
                </div>
                <Num value={talents[k]} min={1} max={10} onChange={(v) => setTalent(k, v)} />
              </div>
            ))}
          </div>
        </div>

        <div className="gs-card">
          <div className="gs-card-h">Artifacts</div>
          <div className="gs-plan">
            <Labeled label="Farming target (4-pc)">
              <Select value={plan.set} options={catalog?.gearSets ?? []} onChange={(v) => setPlan({ set: v })} />
            </Labeled>
            {(["sands", "goblet", "circlet"] as const).map((s) => (
              <Labeled key={s} label={`Wanted ${s} main`}>
                <Select
                  value={plan.mains?.[s]}
                  options={MAIN_STATS[s] ?? []}
                  onChange={(v) => setPlan({ mains: { ...(plan.mains ?? {}), [s]: v } })}
                />
              </Labeled>
            ))}
          </div>
          <div className="gs-arts">
            {GENSHIN_ARTIFACT_SLOTS.map((slot) => {
              const p = artifacts[slot.key] ?? {};
              const set = (partial: Partial<GearPiece>) => setArtifact(slot.key, { ...p, ...partial });
              return (
                <div className="gs-art" key={slot.key}>
                  <div className="gs-art-top">
                    <GameIcon
                      src={assetUrl("genshin", "gear", p.setName ? catalog?.gearPieceIcon?.(p.setName, slot.key) : null)}
                      fallback={communityAssetUrl("genshin", "gear", p.setName ? catalog?.gearPieceIcon?.(p.setName, slot.key) : null)}
                      alt={slot.label}
                      label={SLOT_ABBR[slot.key]}
                      tint={theme.solid}
                      className="gs-art-ico"
                    />
                    <span className="gs-art-slot">{slot.label}</span>
                    <span className="gs-art-lvl">+{p.level ?? 0}</span>
                  </div>
                  <Labeled label="Set">
                    <Select
                      value={p.setName ?? ""}
                      options={["", ...(catalog?.gearSets ?? [])]}
                      onChange={(v) => set({ setName: v || undefined })}
                    />
                  </Labeled>
                  <div className="gs-art-row2">
                    <Labeled label="Main stat">
                      <Select
                        value={p.mainStat ?? ""}
                        options={["", ...(MAIN_STATS[slot.key] ?? [])]}
                        onChange={(v) => set({ mainStat: v || undefined })}
                      />
                    </Labeled>
                    <Labeled label="Level">
                      <Num value={p.level} min={0} max={20} onChange={(v) => set({ level: v })} />
                    </Labeled>
                  </div>
                  <Labeled label="Substats">
                    <StatList value={p.substats} options={SUBSTATS} onChange={(rows) => set({ substats: rows })} />
                  </Labeled>
                </div>
              );
            })}
          </div>
        </div>

        <div className="gs-card">
          <div className="gs-card-h">Combat stats</div>
          <div className="gs-stats">
            {FINAL_STATS.map((s) => (
              <Labeled key={s} label={s}>
                <Num value={num(stats[s])} onChange={(v) => setStat(s, v)} />
              </Labeled>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
