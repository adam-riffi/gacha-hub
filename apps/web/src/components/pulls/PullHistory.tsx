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
  const contested = drops.filter((d) => d.banner.featuredRate < 1 && d.featured !== null);
  return (
    <section className="card pl-history" aria-label="History">
      <h3>History</h3>
      {drops.length === 0 ? (
        <p className="mu">None</p>
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
              {drops.slice(0, 30).map((d) =>
                editing === d.id ? (
                  <EditRow key={d.id} instanceId={instanceId} d={d} star={star} units={units} unitOf={unitOf} onDone={() => setEditing(null)} />
                ) : (
                  <tr key={d.id}>
                    <td className="mn">{DATE.format(new Date(d.at))}</td>
                    <td>{d.banner.label}</td>
                    <td>{unitOf(d.catalogId)?.name ?? star}</td>
                    <td className="num">{d.pity}</td>
                    <td>
                      {d.banner.featuredRate >= 1 || d.featured === null ? <span className="badge">—</span> : d.featured ? <span className="badge done">Won</span> : <span className="badge todo">Lost</span>}
                    </td>
                    <td className="num">
                      <button className="btn ghost sm" onClick={() => setEditing(d.id)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          <p className="mn mu pl-note">
            avg {Math.round(drops.reduce((t, d) => t + d.pity, 0) / drops.length)}
            {contested.length > 0 && ` · won ${contested.filter((d) => d.featured).length}/${contested.length}`}
          </p>
        </>
      )}
    </section>
  );
}

function EditRow({ instanceId, d, star, units, unitOf, onDone }: { instanceId: string; d: Drop; star: string; units: Unit[]; unitOf: (id: string | null) => Unit | undefined; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [pity, setPity] = useState(d.pity);
  const [featured, setFeatured] = useState<boolean | null>(d.featured);
  const [unit, setUnit] = useState<string | null>(d.catalogId);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["pulls", instanceId] }), qc.invalidateQueries({ queryKey: ["pull-history", instanceId] }), qc.invalidateQueries({ queryKey: ["dashboard"] })]);
  const save = useMutation({
    mutationFn: () => api.patch(`/api/instances/${instanceId}/pulls/${d.id}`, { ...(pity !== d.pity ? { pity } : {}), featured, catalogId: unit }),
    onSuccess: () => refresh().then(onDone),
    onError: () => toast("Not saved: the pity can't go before the run", "err"),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/instances/${instanceId}/pulls/${d.id}`),
    onSuccess: () => refresh().then(onDone),
  });
  const hasFeatured = d.banner.featuredRate < 1;
  return (
    <tr className="pl-edit">
      <td className="mn">{DATE.format(new Date(d.at))}</td>
      <td>{d.banner.label}</td>
      <td>
        <Picker label={`Which ${star}`} value={unitOf(unit)?.name ?? ""} options={units.map((u) => ({ id: u.id, name: u.name }))} icons={false} onPick={(u) => setUnit(u?.id ?? null)} />
      </td>
      <td className="num">
        <input type="number" aria-label="Pity" min={1} max={d.banner.hardPity} value={pity} onChange={(e) => setPity(Number(e.target.value))} />
      </td>
      <td>
        {hasFeatured && (
          <select aria-label="Result" value={featured === null ? "" : featured ? "won" : "lost"} onChange={(e) => setFeatured(e.target.value === "" ? null : e.target.value === "won")}>
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
export function BannerHistory({ instanceId, unitOf }: { instanceId: string; unitOf: (id: string | null) => Unit | undefined }) {
  const q = useQuery({ queryKey: ["pull-history", instanceId], queryFn: () => api.get<BannerHistoryDto>(`/api/instances/${instanceId}/pulls/history`) });
  if (!q.data?.length) return null;
  return (
    <section className="card pl-bhistory" aria-label="Banner history">
      <h3>Banner history</h3>
      <table>
        <thead>
          <tr>
            <th>Banner</th>
            <th>Dates</th>
            <th>Featured</th>
            <th className="num">Pulls</th>
            <th>Got</th>
          </tr>
        </thead>
        <tbody>
          {q.data.map((b) => (
            <tr key={b.key}>
              <td>{b.name}</td>
              <td className="mn mu">
                {DAY.format(new Date(b.startsAt))} → {DAY.format(new Date(b.endsAt))}
              </td>
              <td>
                {b.featured.map((f, i) => (
                  <span key={f.catalogId}>
                    {i > 0 && ", "}
                    {f.kind === "character" ? <Link to={`/games/${instanceId}/units/${f.catalogId}`}>{unitOf(f.catalogId)?.name ?? f.catalogId}</Link> : (unitOf(f.catalogId)?.name ?? f.catalogId)}
                  </span>
                ))}
              </td>
              <td className="num bh-pulls">{b.pulls}</td>
              <td>{b.fiveStars.map((f) => unitOf(f.catalogId)?.name ?? "?").join(", ") || <span className="mu">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
