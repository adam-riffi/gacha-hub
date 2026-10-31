import { BannerKind } from "../BannerKind";
import { bannerGlyph } from "../Glyph";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BannerHistoryDto, PullBannerLogDto } from "@gacha/shared";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Picker } from "../Picker";
import type { Unit } from "./BannerCard";

const DATE = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

type Drop = PullBannerLogDto["fiveStars"][number] & { banner: PullBannerLogDto };

/**
 * Every top pull you logged, newest first, each corrected in place (Georges,
 * 2026-10-11: "logged as the tenth, it was the seventh"): the pull it came at,
 * won or lost, which unit; or deleted.
 */
export function PullHistory({ instanceId, drops, star, unitOf, units }: { instanceId: string; drops: Drop[]; star: string; unitOf: (id: string | null) => Unit | undefined; units: Unit[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const contested = drops.filter((drop) => drop.banner.featuredRate < 1 && drop.featured !== null);
  return (
    <section className="card pl-history" aria-label="History">
      <h3>History</h3>
      {drops.length === 0 ? (
        <p className="text-muted">None</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Banner</th>
                <th>{star}</th>
                <th className="num">Pity</th>
                <th>Result</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {drops.slice(0, 30).map((drop) =>
                editing === drop.id ? (
                  <EditRow key={drop.id} instanceId={instanceId} drop={drop} star={star} units={units} unitOf={unitOf} onDone={() => setEditing(null)} />
                ) : (
                  <tr key={drop.id}>
                    <td className="font-mono">{DATE.format(new Date(drop.at))}</td>
                    <td>{drop.banner.label}</td>
                    <td>{unitOf(drop.catalogId)?.name ?? star}</td>
                    <td className="num">{drop.pity}</td>
                    <td>
                      {drop.banner.featuredRate >= 1 || drop.featured === null ? <span className="badge">—</span> : drop.featured ? <span className="badge done">Won</span> : <span className="badge todo">Lost</span>}
                    </td>
                    <td className="num">
                      <button className="btn ghost sm" onClick={() => setEditing(drop.id)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          <p className="font-mono text-muted pl-note">
            avg {Math.round(drops.reduce((total, drop) => total + drop.pity, 0) / drops.length)}
            {contested.length > 0 && ` · won ${contested.filter((drop) => drop.featured).length}/${contested.length}`}
          </p>
        </>
      )}
    </section>
  );
}

function EditRow({ instanceId, drop, star, units, unitOf, onDone }: { instanceId: string; drop: Drop; star: string; units: Unit[]; unitOf: (id: string | null) => Unit | undefined; onDone: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pity, setPity] = useState(drop.pity);
  const [featured, setFeatured] = useState<boolean | null>(drop.featured);
  const [unit, setUnit] = useState<string | null>(drop.catalogId);
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["pulls", instanceId] }), queryClient.invalidateQueries({ queryKey: ["pull-history", instanceId] }), queryClient.invalidateQueries({ queryKey: ["dashboard"] })]);
  const save = useMutation({
    mutationFn: () => api.patch(`/api/instances/${instanceId}/pulls/${drop.id}`, { ...(pity !== drop.pity ? { pity } : {}), featured, catalogId: unit }),
    onSuccess: () => refresh().then(onDone),
    onError: () => toast("Not saved: the pity can't go before the run", "err"),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/instances/${instanceId}/pulls/${drop.id}`),
    onSuccess: () => refresh().then(onDone),
  });
  const hasFeatured = drop.banner.featuredRate < 1;
  return (
    <tr className="pl-edit">
      <td className="font-mono">{DATE.format(new Date(drop.at))}</td>
      <td>{drop.banner.label}</td>
      <td>
        <Picker label={`Which ${star}`} value={unitOf(unit)?.name ?? ""} options={units.map((unitOption) => ({ id: unitOption.id, name: unitOption.name }))} icons={false} onPick={(unitOption) => setUnit(unitOption?.id ?? null)} />
      </td>
      <td className="num">
        <input type="number" aria-label="Pity" min={1} max={drop.banner.hardPity} value={pity} onChange={(event) => setPity(Number(event.target.value))} />
      </td>
      <td>
        {hasFeatured && (
          <select aria-label="Result" value={featured === null ? "" : featured ? "won" : "lost"} onChange={(event) => setFeatured(event.target.value === "" ? null : event.target.value === "won")}>
            <option value="">—</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        )}
      </td>
      <td className="num">
        <span className="row">
          <button className="btn primary sm" disabled={save.isPending || pity < 1} onClick={() => save.mutate()}>
            Save
          </button>
          <button className="btn ghost sm" onClick={() => confirm(`Delete this ${star}?`) && remove.mutate()}>
            Delete
          </button>
          <button className="btn ghost sm" onClick={onDone}>
            Cancel
          </button>
        </span>
      </td>
    </tr>
  );
}

/** The game's banners that began, newest first: dates, your pulls and the top pulls you got, featured characters opening their pages. */
export function BannerHistory({ instanceId, gameKey, unitOf }: { instanceId: string; gameKey: string; unitOf: (id: string | null) => Unit | undefined }) {
  const historyQuery = useQuery({ queryKey: ["pull-history", instanceId], queryFn: () => api.get<BannerHistoryDto>(`/api/instances/${instanceId}/pulls/history`) });
  if (!historyQuery.data?.length) return null;
  return (
    <section className="card pl-bhistory" aria-label="Banner history">
      <h3>Banner history</h3>
      <table>
        <thead>
          <tr>
            <th>Kind</th>
            <th>Dates</th>
            <th>Featured</th>
            <th className="num">Pulls</th>
            <th>Got</th>
          </tr>
        </thead>
        <tbody>
          {historyQuery.data.map((bannerRow) => (
            <tr key={bannerRow.key}>
              <td>
                {/* The kind's mark, never the banner's name (round 28, Georges: "i do not care about banner names"). */}
                <BannerKind kind={bannerGlyph(bannerRow.kind)} gameKey={gameKey} className="bh-kind" />
              </td>
              <td className="font-mono text-muted">
                {DAY.format(new Date(bannerRow.startsAt))} → {DAY.format(new Date(bannerRow.endsAt))}
              </td>
              <td>
                {bannerRow.featured.map((featuredUnit, featuredUnitIndex) => (
                  <span key={featuredUnit.catalogId}>
                    {featuredUnitIndex > 0 && ", "}
                    {featuredUnit.kind === "character" ? <Link to={`/games/${instanceId}/units/${featuredUnit.catalogId}`}>{unitOf(featuredUnit.catalogId)?.name ?? featuredUnit.catalogId}</Link> : (unitOf(featuredUnit.catalogId)?.name ?? featuredUnit.catalogId)}
                  </span>
                ))}
              </td>
              <td className="num bh-pulls">{bannerRow.pulls}</td>
              <td>{bannerRow.fiveStars.map((fiveStar) => unitOf(fiveStar.catalogId)?.name ?? "?").join(", ") || <span className="text-muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
