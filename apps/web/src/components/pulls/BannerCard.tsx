import { useState } from "react";
import { artSlotKey, featuredWithin, fiveStarDistribution, rateAt, savingsPlan, topStar, type BannerDto, type PullBannerLogDto } from "@gacha/shared";
import { officialArt } from "../../lib/assets";
import { FeaturedUnits } from "../FeaturedUnits";
import { Glyph, bannerGlyph } from "../Glyph";
import { BannerKind } from "../BannerKind";
import { Segmented } from "../ui";
import { PullCurve } from "./PullCurve";
import { SlotArt } from "../SlotArt";

export type Unit = { id: string; name: string; icon?: string; kind: "character" | "weapon" };
export type AddBody = { bannerKey: string; count: number; fiveStarAt?: number; featured?: boolean; catalogId?: string };
export type CalibrateBody = { bannerKey: string; pity: number; guaranteed: boolean };

const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const percentText = (value: number) => `${value >= 0.995 && value < 1 ? ">99" : (value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
const split = (rate: number) => `${Math.round(rate * 100)}/${100 - Math.round(rate * 100)}`;

/**
 * One banner on Pulls (WIREFRAMES.md G3), every banner type the same: an
 * event banner's status as a two-state switch with the reason, the 5★ pity
 * with soft pity marked, the odds (estimates), the curve, the headline chance
 * with your pulls (and with a simulated top-up), and the actions. Round 16: the
 * official key art of the running banner across the top, when it came with one.
 */
export function BannerCard(props: {
  banner: PullBannerLogDto;
  gameKey: string;
  /** The game profile, so a featured character links to its page. */
  instanceId?: string;
  /** Every running banner of this kind (Genshin often runs two character banners); `live` is the first. */
  running?: BannerDto[];
  available: number;
  /** Pulls a simulated top-up adds to this banner's. */
  extra?: number;
  live?: BannerDto;
  units: Unit[];
  unitOf: (id: string | null) => Unit | undefined;
  onAdd: (body: AddBody) => void;
  onCalibrate: (body: CalibrateBody) => void;
  onUndo: (entryId: string) => void;
  onHide: () => void;
}) {
  const { banner, live, available, extra = 0 } = props;
  const [mode, setMode] = useState<"five" | "set" | null>(null);
  const savedState = banner.state;
  const state = { pity: savedState.pity, guaranteed: savedState.guaranteed };
  const distribution = fiveStarDistribution(banner, savedState.pity);
  const within = (pulls: number) => distribution.slice(0, pulls).reduce((total, probability) => total + probability, 0);
  const hasFeatured = banner.featuredRate < 1;
  const featured = live?.featured.find((featuredUnit) => (featuredUnit.rarity ?? 0) >= 5);
  const running = props.running ?? (live ? [live] : []);
  // Every featured unit of the running banners (round 24, Georges: "just the featured characters"), the top rarity first.
  const featuredUnits = running.flatMap((liveBanner) => liveBanner.featured);
  const star = topStar(props.gameKey);
  const target = featured?.name ?? `the featured ${star}`;
  const keyArt = running.map((liveBanner) => officialArt(liveBanner.payload)).find(Boolean);

  const actions = (
    <div className="pl-actions">
      <button className="btn" onClick={() => props.onAdd({ bannerKey: banner.key, count: 1 })}>+1</button>
      <button className="btn" onClick={() => props.onAdd({ bannerKey: banner.key, count: 10 })}>+10</button>
      <button className="btn" aria-pressed={mode === "five"} onClick={() => setMode(mode === "five" ? null : "five")}>Log a {star}</button>
      <button className="btn" aria-pressed={mode === "set"} onClick={() => setMode(mode === "set" ? null : "set")}>Set pity</button>
      {banner.recent[0] && (
        <button className="btn ghost" title="Delete the latest entry" onClick={() => props.onUndo(banner.recent[0]!.id)}>Undo</button>
      )}
      <button className="btn ghost" title="Hide this banner type from Pulls and Home" onClick={props.onHide}>Hide</button>
    </div>
  );
  const forms = (
    <>
      {mode === "five" && <FiveStarForm banner={banner} star={star} units={props.units} onSave={(body) => { props.onAdd(body); setMode(null); }} />}
      {mode === "set" && <SetPityForm banner={banner} onSave={(body) => { props.onCalibrate(body); setMode(null); }} />}
    </>
  );
  const pity = (
    <span className="pl-pity font-mono">
      <span data-testid="pity">{savedState.pity}</span> / {banner.hardPity}
    </span>
  );

  const [worst] = savingsPlan([{ label: target, rules: banner, state }], available, 0, "worst");
  const [average] = savingsPlan([{ label: target, rules: banner, state }], available, 0, "average");
  const soft = banner.softPity !== undefined && savedState.pity < banner.softPity;

  return (
    <section className="card pl-banner" aria-label={banner.label}>
      <div className="pl-banner-main">
      {running.length <= 1 && keyArt && <img className="key-art pl-key-art" src={keyArt} alt="" onError={(event) => (event.currentTarget.hidden = true)} />}
      {/* The head (round 24): the kind's mark, the banner type, the day it ends, then its featured units with their names; never the
          phase's own name (Georges: "just the featured characters"). */}
      <div className="pl-banner-head">
        <BannerKind kind={bannerGlyph(banner.key)} className="pl-kind" />
        {!featuredUnits.length && <SlotArt slot={artSlotKey(props.gameKey, "banner", banner.key)} className="pl-art" fallback={<Glyph kind={bannerGlyph(banner.key)} label={banner.label} className="pl-art" />} />}
        <div className="pl-banner-title">
          <h3>{banner.label}</h3>
          {running.length === 1 && <span className="pl-ends">Ends {ENDS.format(new Date(running[0]!.endsAt))}</span>}
          {running.length === 0 && <span className="font-mono text-muted">not running</span>}
        </div>
        {running.length <= 1 && featuredUnits.length > 0 && <FeaturedUnits gameKey={props.gameKey} instanceId={props.instanceId ?? ""} units={featuredUnits} shown={8} names className="pl-featured" />}
        {/* Several banners of this kind at once (round 28, Georges: "more accommodating to multiple banners such as featured new and
            rerun characters"): a block each, with its own key art, its units and its end. */}
        {running.length > 1 && (
          <div className="pl-runs">
            {running.map((liveBanner) => {
              const art = officialArt(liveBanner.payload);
              return (
                <div key={liveBanner.key} className="pl-run" role="group" aria-label={liveBanner.name}>
                  {art && <img className="key-art pl-run-art" src={art} alt="" onError={(event) => (event.currentTarget.hidden = true)} />}
                  <FeaturedUnits gameKey={props.gameKey} instanceId={props.instanceId ?? ""} units={liveBanner.featured} shown={6} names />
                  <span className="pl-ends">Ends {ENDS.format(new Date(liveBanner.endsAt))}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {hasFeatured && (
        <div className="pl-status">
          <span className="kpi-label">Status</span>
          <Segmented
            label="Status"
            options={[{ value: "open", label: split(banner.featuredRate) }, { value: "guaranteed", label: "Guaranteed" }]}
            value={savedState.guaranteed ? "guaranteed" : "open"}
            onChange={(choice) => props.onCalibrate({ bannerKey: banner.key, pity: savedState.pity, guaranteed: choice === "guaranteed" })}
          />
        </div>
      )}

      <div className="pl-meter-row">
        <span className="kpi-label">{star} pity</span>
        <span className="pl-meter" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (savedState.pity / banner.hardPity) * 100)}%` }} />
          {banner.softPity !== undefined && <i style={{ left: `${(banner.softPity / banner.hardPity) * 100}%` }} />}
        </span>
        {pity}
      </div>

      {/* The odds as three tiles of one size (round 24, Georges: "the odds/estimate thing is a bit weird"): the next pull, by soft
          pity (past it, the next ten), with the pulls you hold (and with a top-up, when one is simulated). */}
      <div className="odds" role="group" aria-label="Odds">
        <div className="odds-tile">
          <span className="kpi-label">Next pull</span>
          <span className="odds-figure font-display">{percentText(rateAt(banner, savedState.pity + 1))}</span>
        </div>
        {soft ? (
          <div className="odds-tile">
            <span className="kpi-label">By soft pity · {banner.softPity}</span>
            <span className="odds-figure font-display">{percentText(within(banner.softPity! - savedState.pity))}</span>
          </div>
        ) : (
          <div className="odds-tile">
            <span className="kpi-label">Next 10 pulls</span>
            <span className="odds-figure font-display">{percentText(within(10))}</span>
          </div>
        )}
        <div className="odds-tile">
          <span className="kpi-label">With {available}{extra > 0 ? ` · +${extra}` : ""}</span>
          <span className="odds-figure font-display">
            {percentText(featuredWithin(banner, state, available))}
            {extra > 0 && <small> → {percentText(featuredWithin(banner, state, available + extra))}</small>}
          </span>
        </div>
      </div>
      </div>

      <div className="pl-banner-side">
      <PullCurve rules={banner} state={state} available={available} extra={extra} star={star} />

      <div className="pl-headline">
        <span className="kpi-value">{percentText(worst!.chance)}</span>
        <span>
          with {available}
          {extra > 0 && <strong> · +{extra} {percentText(featuredWithin(banner, state, available + extra))}</strong>}
          <span className="font-mono text-muted"> · avg {average!.needs} · max {Number.isFinite(worst!.needs) ? worst!.needs : "—"}</span>
        </span>
      </div>
      {actions}
      {forms}
      </div>
    </section>
  );
}

function FiveStarForm({ banner, star, units, onSave }: { banner: PullBannerLogDto; star: string; units: Unit[]; onSave: (body: AddBody) => void }) {
  const [count, setCount] = useState(10);
  const [at, setAt] = useState(10);
  const [featured, setFeatured] = useState(true);
  const [unit, setUnit] = useState("");
  const hasFeatured = banner.featuredRate < 1;
  return (
    <form
      className="pl-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ bannerKey: banner.key, count, fiveStarAt: Math.min(at, count), ...(hasFeatured ? { featured } : {}), ...(unit ? { catalogId: unit } : {}) });
      }}
    >
      <label>Pulls in the batch <input type="number" min={1} max={200} value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>
      <label>{star} at pull <input type="number" min={1} max={count} value={at} onChange={(event) => setAt(Number(event.target.value))} /></label>
      {hasFeatured && (
        <label className="pl-check">
          <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> Featured
        </label>
      )}
      <select value={unit} onChange={(event) => setUnit(event.target.value)} aria-label={`Which ${star}`}>
        <option value="">Which {star} (optional)</option>
        {units.map((unitOption) => <option key={unitOption.id} value={unitOption.id}>{unitOption.name}</option>)}
      </select>
      <button className="btn primary" type="submit">Save {star}</button>
    </form>
  );
}

function SetPityForm({ banner, onSave }: { banner: PullBannerLogDto; onSave: (body: CalibrateBody) => void }) {
  const [pity, setPity] = useState(banner.state.pity);
  const [guaranteed, setGuaranteed] = useState(banner.state.guaranteed);
  const hasFeatured = banner.featuredRate < 1;
  return (
    <form
      className="pl-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ bannerKey: banner.key, pity, guaranteed: hasFeatured && guaranteed });
      }}
    >
      <label>Current pity <input type="number" min={0} max={banner.hardPity - 1} value={pity} onChange={(event) => setPity(Number(event.target.value))} /></label>
      {hasFeatured && (
        <label className="pl-check">
          <input type="checkbox" checked={guaranteed} onChange={(event) => setGuaranteed(event.target.checked)} /> Guaranteed
        </label>
      )}
      <button className="btn primary" type="submit">Save pity</button>
    </form>
  );
}
