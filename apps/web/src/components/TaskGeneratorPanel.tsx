import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  levelCaps,
  talentCap,
  talentTable,
  type PlanGenerateResultDto,
  type PlanPreviewDto,
  type PlanRequestInput,
} from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";

const BASE_CAP = 20;
export const TALENT_LABELS: Record<string, string> = {
  normal: "Normal Attack", skill: "Skill", burst: "Burst", basic: "Basic ATK", ultimate: "Ultimate",
  talent: "Talent", forte: "Forte Circuit", liberation: "Liberation", intro: "Intro Skill",
};

export function PlanTable({ preview }: { preview: PlanPreviewDto }) {
  const rows = preview.requirements;
  if (rows.length === 0) return <p className="small muted">Nothing needed for that range.</p>;
  const deficit = new Map(preview.deficit.map((deficitRow) => [deficitRow.materialId, deficitRow.qty]));
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr><th>Material</th><th>Need</th><th>Have</th><th>Missing</th><th>Today</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const material = preview.materials[row.materialId];
            const missing = deficit.get(row.materialId) ?? 0;
            return (
              <tr key={row.materialId}>
                <td>
                  {material?.name ?? row.materialId}
                  {material?.source ? <div className="small muted">{material.source}</div> : null}
                </td>
                <td>{row.qty}</td>
                <td>{preview.stock[row.materialId] ?? 0}</td>
                <td className={missing ? "" : "muted"}>{missing || "✓"}</td>
                <td>{material?.availability ? (material.farmableToday ? <span className="badge done">farmable</span> : <span className="badge">not today</span>) : <span className="muted small">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * "Generate tasks" from a character screen: pick level + talent targets, see
 * the material breakdown against your stock, then create farming goals.
 */
export function TaskGeneratorPanel({
  instanceId,
  gameKey,
  catalogId,
  doc,
}: {
  instanceId: string;
  gameKey: string;
  catalogId: string;
  doc: Record<string, unknown>;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { index } = useCatalog(gameKey);
  const entry = index?.characters.get(catalogId);

  const caps = useMemo(() => (entry ? levelCaps(entry.ascension, BASE_CAP) : [BASE_CAP]), [entry]);
  const currentLevel = typeof doc.level === "number" ? (doc.level as number) : BASE_CAP;
  const defaultFrom = caps.filter((cap) => cap <= currentLevel).at(-1) ?? BASE_CAP;

  // Unset until changed, so the defaults follow the catalog once it has loaded.
  const [fromPicked, setLevelFrom] = useState<number | null>(null);
  const [toPicked, setLevelTo] = useState<number | null>(null);
  const levelFrom = fromPicked ?? defaultFrom;
  const levelTo = toPicked ?? caps.at(-1) ?? BASE_CAP;
  const [talents, setTalents] = useState<Record<string, { from: number; to: number }>>({});
  const [preview, setPreview] = useState<PlanPreviewDto | null>(null);

  const docTalents = (doc.talents ?? doc.traces ?? doc.skills ?? {}) as Record<string, number | undefined>;

  const request = (): PlanRequestInput => ({
    kind: "character",
    catalogId,
    ...(levelTo > levelFrom ? { level: { from: levelFrom, to: levelTo } } : {}),
    talents: Object.fromEntries(
      (entry?.talents.keys ?? [])
        .map((talentKey) => {
          const max = talentCap(entry!, talentKey, 10);
          const talentRange = talents[talentKey] ?? { from: docTalents[talentKey] ?? 1, to: max };
          return [talentKey, talentRange] as const;
        })
        .filter(([, talentRange]) => talentRange.to > talentRange.from),
    ),
  });

  const { mutate: runPreview } = useMutation({
    mutationFn: () => api.post<PlanPreviewDto>(`/api/instances/${instanceId}/plans/preview`, request()),
    onSuccess: setPreview,
  });
  // The materials follow the levels as they change (Georges, 2026-10-11: no Preview step).
  const asked = JSON.stringify([levelFrom, levelTo, talents]);
  useEffect(() => {
    if (!entry) return;
    const timer = setTimeout(() => runPreview(), 250);
    return () => clearTimeout(timer);
  }, [entry, asked, runPreview]);
  const generate = useMutation({
    mutationFn: () => api.post<PlanGenerateResultDto>(`/api/instances/${instanceId}/plans/generate`, request()),
    onSuccess: (result) => {
      toast(`${result.created} task(s) created, ${result.updated} updated`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["needed", instanceId] });
    },
    onError: () => toast("Could not generate tasks", "err"),
  });

  if (!entry) return null;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="spread">
        <h3 style={{ margin: 0 }}>Plan farming</h3>
        <Link className="small" to="/">View on Home →</Link>
      </div>
      <div className="row" style={{ marginTop: 10, alignItems: "flex-end" }}>
        <div>
          <label>Level from (cap)</label>
          <select aria-label="Level from (cap)" value={levelFrom} onChange={(event) => setLevelFrom(Number(event.target.value))}>
            {caps.map((cap) => <option key={cap} value={cap}>{cap}</option>)}
          </select>
        </div>
        <div>
          <label>to</label>
          <select aria-label="Level to (cap)" value={levelTo} onChange={(event) => setLevelTo(Number(event.target.value))}>
            {caps.map((cap) => <option key={cap} value={cap}>{cap}</option>)}
          </select>
        </div>
        {entry.talents.keys.map((key) => {
          const max = talentCap(entry, key, 10);
          const talentRange = talents[key] ?? { from: docTalents[key] ?? 1, to: max };
          return (
            <div key={key} className="row" style={{ gap: 4 }}>
              <div>
                <label>{TALENT_LABELS[key] ?? key}</label>
                <input type="number" aria-label={`${TALENT_LABELS[key] ?? key} from`} min={1} max={max} value={talentRange.from} style={{ width: 64 }}
                  onChange={(event) => setTalents((talentsBefore) => ({ ...talentsBefore, [key]: { ...talentRange, from: Number(event.target.value) } }))} />
              </div>
              <span className="muted" style={{ paddingBottom: 8 }}>→</span>
              <div>
                <label>&nbsp;</label>
                <input type="number" aria-label={`${TALENT_LABELS[key] ?? key} to`} min={1} max={max} value={talentRange.to} style={{ width: 64 }}
                  onChange={(event) => setTalents((talentsBefore) => ({ ...talentsBefore, [key]: { ...talentRange, to: Number(event.target.value) } }))} />
              </div>
            </div>
          );
        })}
        <button type="button" className="btn primary" disabled={generate.isPending} onClick={() => generate.mutate()}>Generate tasks</button>
      </div>
      {preview && <div style={{ marginTop: 12 }}><PlanTable preview={preview} /></div>}
    </div>
  );
}
