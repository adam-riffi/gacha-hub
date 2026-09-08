import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  levelCaps,
  talentMax,
  talentTable,
  type PlanGenerateResultDto,
  type PlanPreviewDto,
  type PlanRequestInput,
} from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";

const BASE_CAP = 20;
const TALENT_LABELS: Record<string, string> = {
  normal: "Normal Attack", skill: "Skill", burst: "Burst", basic: "Basic ATK", ultimate: "Ultimate",
  talent: "Talent", forte: "Forte Circuit", liberation: "Liberation", intro: "Intro Skill",
};

export function PlanTable({ preview }: { preview: PlanPreviewDto }) {
  const rows = preview.requirements;
  if (rows.length === 0) return <p className="small muted">Nothing needed for that range.</p>;
  const deficit = new Map(preview.deficit.map((d) => [d.materialId, d.qty]));
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr><th>Material</th><th>Need</th><th>Have</th><th>Missing</th><th>Today</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const m = preview.materials[r.materialId];
            const missing = deficit.get(r.materialId) ?? 0;
            return (
              <tr key={r.materialId}>
                <td>
                  {m?.name ?? r.materialId}
                  {m?.source ? <div className="small muted">{m.source}</div> : null}
                </td>
                <td>{r.qty}</td>
                <td>{preview.stock[r.materialId] ?? 0}</td>
                <td style={{ color: missing ? "var(--accent)" : "var(--success)" }}>{missing || "✓"}</td>
                <td>{m?.availability ? (m.farmableToday ? <span className="badge done">farmable</span> : <span className="badge">not today</span>) : <span className="muted small">—</span>}</td>
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
  const qc = useQueryClient();
  const { index } = useCatalog(gameKey);
  const entry = index?.characters.get(catalogId);

  const caps = useMemo(() => (entry ? levelCaps(entry.ascension, BASE_CAP) : [BASE_CAP]), [entry]);
  const currentLevel = typeof doc.level === "number" ? (doc.level as number) : BASE_CAP;
  const defaultFrom = caps.filter((c) => c <= currentLevel).at(-1) ?? BASE_CAP;

  const [levelFrom, setLevelFrom] = useState(defaultFrom);
  const [levelTo, setLevelTo] = useState(caps.at(-1) ?? BASE_CAP);
  const [talents, setTalents] = useState<Record<string, { from: number; to: number }>>({});
  const [preview, setPreview] = useState<PlanPreviewDto | null>(null);

  const docTalents = (doc.talents ?? doc.traces ?? doc.skills ?? {}) as Record<string, number | undefined>;

  const request = (): PlanRequestInput => ({
    kind: "character",
    catalogId,
    ...(levelTo > levelFrom ? { level: { from: levelFrom, to: levelTo } } : {}),
    talents: Object.fromEntries(
      (entry?.talents.keys ?? [])
        .map((k) => {
          const max = talentMax(talentTable(entry!, k));
          const t = talents[k] ?? { from: docTalents[k] ?? 1, to: max };
          return [k, t] as const;
        })
        .filter(([, t]) => t.to > t.from),
    ),
  });

  const previewMut = useMutation({
    mutationFn: () => api.post<PlanPreviewDto>(`/api/instances/${instanceId}/plans/preview`, request()),
    onSuccess: setPreview,
    onError: () => toast("Preview failed — check the ranges", "err"),
  });
  const generate = useMutation({
    mutationFn: () => api.post<PlanGenerateResultDto>(`/api/instances/${instanceId}/plans/generate`, request()),
    onSuccess: (r) => {
      toast(`${r.created} task(s) created, ${r.updated} updated`);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["needed", instanceId] });
    },
    onError: () => toast("Could not generate tasks", "err"),
  });

  if (!entry) return null;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="spread">
        <h3 style={{ margin: 0 }}>Plan farming</h3>
        <Link className="small" to="/tasks">View tasks →</Link>
      </div>
      <div className="row" style={{ marginTop: 10, alignItems: "flex-end" }}>
        <div>
          <label>Level from (cap)</label>
          <select value={levelFrom} onChange={(e) => setLevelFrom(Number(e.target.value))}>
            {caps.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label>to</label>
          <select value={levelTo} onChange={(e) => setLevelTo(Number(e.target.value))}>
            {caps.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {entry.talents.keys.map((k) => {
          const max = talentMax(talentTable(entry, k));
          const t = talents[k] ?? { from: docTalents[k] ?? 1, to: max };
          return (
            <div key={k} className="row" style={{ gap: 4 }}>
              <div>
                <label>{TALENT_LABELS[k] ?? k}</label>
                <input type="number" min={1} max={max} value={t.from} style={{ width: 64 }}
                  onChange={(e) => setTalents((s) => ({ ...s, [k]: { ...t, from: Number(e.target.value) } }))} />
              </div>
              <span className="muted" style={{ paddingBottom: 8 }}>→</span>
              <div>
                <label>&nbsp;</label>
                <input type="number" min={1} max={max} value={t.to} style={{ width: 64 }}
                  onChange={(e) => setTalents((s) => ({ ...s, [k]: { ...t, to: Number(e.target.value) } }))} />
              </div>
            </div>
          );
        })}
        <button className="btn" disabled={previewMut.isPending} onClick={() => previewMut.mutate()}>Preview</button>
        <button className="btn primary" disabled={generate.isPending} onClick={() => generate.mutate()}>Generate tasks</button>
      </div>
      {preview && <div style={{ marginTop: 12 }}><PlanTable preview={preview} /></div>}
    </div>
  );
}
