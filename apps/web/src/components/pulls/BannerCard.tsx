import { useState } from "react";
import { featuredWithin, fiveStarDistribution, rateAt, savingsPlan, type BannerDto, type PullBannerLogDto } from "@gacha/shared";
import { assetUrl, communityAssetUrl } from "../../lib/assets";
import { GameIcon } from "../GameIcon";
import { Segmented } from "../ui";
import { PullCurve } from "./PullCurve";

export type Unit = { id: string; name: string; icon?: string; kind: "character" | "weapon" };
export type AddBody = { bannerKey: string; count: number; fiveStarAt?: number; featured?: boolean; catalogId?: string };
export type CalibrateBody = { bannerKey: string; pity: number; guaranteed: boolean };

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const pct = (v: number) => `${v >= 0.995 && v < 1 ? ">99" : (v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
const split = (rate: number) => `${Math.round(rate * 100)}/${100 - Math.round(rate * 100)}`;

/**
 * One banner on Pulls (WIREFRAMES.md G3). An event banner shows its status
 * as a two-state switch with the reason, the 5★ pity with soft pity marked,
 * the odds (estimates), the curve, the headline chance with your pulls, and
 * the actions; `compact` keeps the numbers and actions on one row.
 */
export function BannerCard(props: {
  b: PullBannerLogDto;
  gameKey: string;
  available: number;
  live?: BannerDto;
  units: Unit[];
  unitOf: (id: string | null) => Unit | undefined;
  compact?: boolean;
  onAdd: (body: AddBody) => void;
  onCalibrate: (body: CalibrateBody) => void;
  onUndo: (entryId: string) => void;
}) {
  const { b, live, available } = props;
  const [mode, setMode] = useState<"five" | "set" | null>(null);
  const s = b.state;
  const state = { pity: s.pity, guaranteed: s.guaranteed };
  const dist = fiveStarDistribution(b, s.pity);
  const within = (n: number) => dist.slice(0, n).reduce((t, p) => t + p, 0);
  const hasFeatured = b.featuredRate < 1;
  const feat = live?.featured.find((f) => (f.rarity ?? 0) >= 5);
  const target = feat?.name ?? "the featured 5★";

  const actions = (
    <div className="pl-actions">
      <button className="btn" onClick={() => props.onAdd({ bannerKey: b.key, count: 1 })}>+1</button>
      <button className="btn" onClick={() => props.onAdd({ bannerKey: b.key, count: 10 })}>+10</button>
      <button className="btn" aria-pressed={mode === "five"} onClick={() => setMode(mode === "five" ? null : "five")}>Log a 5★</button>
      <button className="btn" aria-pressed={mode === "set"} onClick={() => setMode(mode === "set" ? null : "set")}>Set pity</button>
      {b.recent[0] && (
        <button className="btn ghost" title="Delete the latest entry" onClick={() => props.onUndo(b.recent[0]!.id)}>Undo</button>
      )}
    </div>
  );
  const forms = (
    <>
      {mode === "five" && <FiveStarForm b={b} units={props.units} onSave={(body) => { props.onAdd(body); setMode(null); }} />}
      {mode === "set" && <SetPityForm b={b} onSave={(body) => { props.onCalibrate(body); setMode(null); }} />}
    </>
  );
  const pity = (
    <span className="pl-pity mn">
      <span data-testid="pity">{s.pity}</span> / {b.hardPity}
    </span>
  );

  if (props.compact) {
    return (
      <section className="card pl-compact" aria-label={b.label}>
        <div className="pl-compact-row">
          <div>
            <strong>{b.label}</strong>
            <div className="mn mu">{hasFeatured ? `${split(b.featuredRate)}${s.guaranteed ? " · guaranteed" : ""}` : "no 50/50"} · {s.toHardPity} to a certain 5★</div>
          </div>
          <span className="mn mu">next 5★ {pct(rateAt(b, s.pity + 1))} · 10 pulls {pct(within(10))}</span>
          {pity}
        </div>
        {actions}
        {forms}
      </section>
    );
  }

  const last = b.fiveStars[0];
  const lastName = last && (props.unitOf(last.catalogId)?.name ?? "a 5★");
  const reason = !last
    ? "No 5★ logged on this banner yet."
    : last.featured === false
      ? `You lost the ${split(b.featuredRate)} on ${DATE.format(new Date(last.at))} (${lastName}, pity ${last.pity}), so your next 5★ is the featured one.`
      : `Your last 5★ was ${lastName} on ${DATE.format(new Date(last.at))} at pity ${last.pity}${hasFeatured && !s.guaranteed ? `: the next is a ${split(b.featuredRate)}` : ""}.`;
  const [worst] = savingsPlan([{ label: target, rules: b, state }], available, 0, "worst");
  const [average] = savingsPlan([{ label: target, rules: b, state }], available, 0, "average");
  const soft = b.softPity !== undefined && s.pity < b.softPity;

  return (
    <section className="card pl-banner" aria-label={b.label}>
      <div className="pl-banner-head">
        {feat ? (
          <GameIcon src={assetUrl(props.gameKey, feat.kind, feat.icon)} fallback={communityAssetUrl(props.gameKey, feat.kind, feat.icon)} alt={feat.name ?? feat.catalogId} className="pl-art" />
        ) : (
          <GameIcon src={null} alt={b.label} label="5★" className="pl-art" />
        )}
        <div>
          <h3>{b.label}</h3>
          <div className="mn mu">{live ? `${live.name}${feat?.name ? ` · ${feat.name}` : ""} · ends ${ENDS.format(new Date(live.endsAt))}` : "no banner of this kind running"}</div>
        </div>
      </div>

      {hasFeatured && (
        <div className="pl-status">
          <span className="kpi-label">Status</span>
          <Segmented
            label="Status"
            options={[{ value: "open", label: split(b.featuredRate) }, { value: "guaranteed", label: "Guaranteed" }]}
            value={s.guaranteed ? "guaranteed" : "open"}
            onChange={(v) => props.onCalibrate({ bannerKey: b.key, pity: s.pity, guaranteed: v === "guaranteed" })}
          />
        </div>
      )}
      <p className="pl-reason">{reason}</p>

      <div className="pl-meter-row">
        <span className="kpi-label">5★ pity</span>
        <span className="pl-meter" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (s.pity / b.hardPity) * 100)}%` }} />
          {b.softPity !== undefined && <i style={{ left: `${(b.softPity / b.hardPity) * 100}%` }} />}
        </span>
        {pity}
      </div>

      <table className="pl-odds">
        <thead>
          <tr><th>Odds · estimates</th><th className="num">5★</th></tr>
        </thead>
        <tbody>
          <tr><td>Next pull</td><td className="num">{pct(rateAt(b, s.pity + 1))}</td></tr>
          <tr><td>Next 10 pulls</td><td className="num">{pct(within(10))}</td></tr>
          {soft && <tr><td>By soft pity (pity {b.softPity})</td><td className="num">{pct(within(b.softPity! - s.pity))}</td></tr>}
          <tr><td>Featured by your {available} pulls</td><td className="num">{pct(featuredWithin(b, state, available))}</td></tr>
        </tbody>
      </table>

      <PullCurve rules={b} state={state} available={available} />

      <div className="pl-headline">
        <span className="kpi-value">{pct(worst!.chance)}</span>
        <span>
          chance of {target} with your {available} pulls
          <span className="mn mu"> · {average!.needs} pulls on average · {Number.isFinite(worst!.needs) ? `${worst!.needs} at most` : "no cap"}</span>
        </span>
      </div>
      {actions}
      {forms}
    </section>
  );
}

function FiveStarForm({ b, units, onSave }: { b: PullBannerLogDto; units: Unit[]; onSave: (body: AddBody) => void }) {
  const [count, setCount] = useState(10);
  const [at, setAt] = useState(10);
  const [featured, setFeatured] = useState(true);
  const [unit, setUnit] = useState("");
  const hasFeatured = b.featuredRate < 1;
  return (
    <form
      className="pl-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ bannerKey: b.key, count, fiveStarAt: Math.min(at, count), ...(hasFeatured ? { featured } : {}), ...(unit ? { catalogId: unit } : {}) });
      }}
    >
      <label>Pulls in the batch <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label>
      <label>5★ at pull <input type="number" min={1} max={count} value={at} onChange={(e) => setAt(Number(e.target.value))} /></label>
      {hasFeatured && (
        <label className="pl-check">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured
        </label>
      )}
      <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Which 5★">
        <option value="">Which 5★ (optional)</option>
        {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <button className="btn primary" type="submit">Save 5★</button>
    </form>
  );
}

function SetPityForm({ b, onSave }: { b: PullBannerLogDto; onSave: (body: CalibrateBody) => void }) {
  const [pity, setPity] = useState(b.state.pity);
  const [guaranteed, setGuaranteed] = useState(b.state.guaranteed);
  const hasFeatured = b.featuredRate < 1;
  return (
    <form
      className="pl-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ bannerKey: b.key, pity, guaranteed: hasFeatured && guaranteed });
      }}
    >
      <label>Current pity <input type="number" min={0} max={b.hardPity - 1} value={pity} onChange={(e) => setPity(Number(e.target.value))} /></label>
      {hasFeatured && (
        <label className="pl-check">
          <input type="checkbox" checked={guaranteed} onChange={(e) => setGuaranteed(e.target.checked)} /> Guaranteed
        </label>
      )}
      <button className="btn primary" type="submit">Save pity</button>
    </form>
  );
}
