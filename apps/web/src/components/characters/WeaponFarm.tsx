import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { levelCaps, type CatalogWeapon, type PlanGenerateResultDto, type PlanPreviewDto } from "@gacha/shared";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { PlanTable } from "../TaskGeneratorPanel";

/** Farm or pre-farm a weapon: its levels, the materials it needs, then the tasks. */
export function WeaponFarm({ instanceId, weapon, onDone }: { instanceId: string; weapon: CatalogWeapon; onDone: () => void }) {
  const toast = useToast();
  const caps = useMemo(() => levelCaps(weapon.ascension, 20), [weapon]);
  const [from, setFrom] = useState(caps[0] ?? 20);
  const [to, setTo] = useState(caps.at(-1) ?? 90);
  const [preview, setPreview] = useState<PlanPreviewDto | null>(null);
  const body = { kind: "weapon" as const, catalogId: weapon.id, level: { from, to } };
  const previewMut = useMutation({
    mutationFn: () => api.post<PlanPreviewDto>(`/api/instances/${instanceId}/plans/preview`, body),
    onSuccess: setPreview,
  });
  const generate = useMutation({
    mutationFn: () => api.post<PlanGenerateResultDto>(`/api/instances/${instanceId}/plans/generate`, body),
    onSuccess: (r) => {
      toast(`${r.created} task(s) created, ${r.updated} updated`);
      onDone();
    },
    onError: () => toast("Could not generate tasks", "err"),
  });
  return (
    <section aria-label={`Farm ${weapon.name}`} style={{ marginTop: 10 }}>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div><label>From cap</label><select aria-label="From cap" value={from} onChange={(e) => setFrom(Number(e.target.value))}>{caps.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label>To</label><select aria-label="To" value={to} onChange={(e) => setTo(Number(e.target.value))}>{caps.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <button className="btn sm" disabled={to <= from || previewMut.isPending} onClick={() => previewMut.mutate()}>Preview</button>
        <button className="btn sm primary" disabled={to <= from || generate.isPending} onClick={() => generate.mutate()}>Farm</button>
      </div>
      {preview && <div style={{ marginTop: 8 }}><PlanTable preview={preview} /></div>}
    </section>
  );
}
