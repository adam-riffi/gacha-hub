import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GENSHIN_ARTIFACT_SLOTS, type CatalogGearSet, type CharacterDto, type GearPieceDto, type TaskDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { GameIcon } from "./GameIcon";

type Piece = { setName?: string; mainStat?: string };
type MainSlot = "sands" | "goblet" | "circlet";
type Plan = { set?: string; mains?: Partial<Record<MainSlot, string>> };

const SLOTS = GENSHIN_ARTIFACT_SLOTS.map((s) => s.key);
const SLOT_LABEL: Record<string, string> = Object.fromEntries(GENSHIN_ARTIFACT_SLOTS.map((s) => [s.key, s.label.split(" ")[0]!]));
const MAIN_SLOTS: MainSlot[] = ["sands", "goblet", "circlet"];
const SET_PIECES = 4; // a 4-pc bonus; the fifth slot is free for an off-piece

interface BuildNeed {
  build: CharacterDto;
  set: string;
  setCount: number;
  mains: { slot: MainSlot; want: string; ok: boolean }[];
  inBag: number;
  missing: string[];
}

/** What one build still needs to finish its artifact target, or null if it has none. */
function needOf(build: CharacterDto, bag: GearPieceDto[]): BuildNeed | null {
  const doc = build.doc as { artifacts?: Record<string, Piece>; artifactPlan?: Plan };
  const plan = doc.artifactPlan;
  if (!plan?.set) return null;
  const arts = doc.artifacts ?? {};
  const setCount = SLOTS.filter((s) => arts[s]?.setName === plan.set).length;
  const mains = MAIN_SLOTS.filter((s) => plan.mains?.[s]).map((s) => ({
    slot: s,
    want: plan.mains![s]!,
    ok: arts[s]?.mainStat === plan.mains![s],
  }));
  const needSet = Math.max(0, SET_PIECES - setCount);
  const missing = [
    ...mains.filter((m) => !m.ok).map((m) => `${SLOT_LABEL[m.slot]}: ${m.want}`),
    ...(needSet ? [`${needSet} more ${plan.set} piece${needSet > 1 ? "s" : ""}`] : []),
  ];
  // Bag pieces of the target set that would fill a slot not yet on-set, or fix a wanted main.
  const inBag = bag.filter(
    (p) =>
      p.setName === plan.set &&
      (arts[p.slot]?.setName !== plan.set || mains.some((m) => m.slot === p.slot && !m.ok && p.mainStat === m.want)),
  ).length;
  return { build, set: plan.set, setCount, mains, inBag, missing };
}

/** Farming plan from each build's artifact target, grouped by the domain that drops it. */
export function ArtifactPlanner({
  instanceId,
  gameKey,
  sets,
  builds,
}: {
  instanceId: string;
  gameKey: string;
  sets: CatalogGearSet[];
  builds: CharacterDto[];
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: bag } = useQuery({
    queryKey: ["gear", instanceId],
    queryFn: () => api.get<GearPieceDto[]>(`/api/instances/${instanceId}/gear`),
  });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskDto[]>("/api/tasks") });
  const taskFor = (domain: string) =>
    tasks?.find((t) => t.type === "checklist" && t.refId === instanceId && t.title === `Farm ${domain}`);

  // One checklist per domain: re-running updates it (keeping ticks on items still needed) instead of duplicating.
  const addTask = useMutation({
    mutationFn: (v: { domain: string; items: string[] }) => {
      const existing = taskFor(v.domain);
      const items = v.items.map((label) => ({
        label: label.slice(0, 200),
        done: existing?.items?.find((i) => i.label === label)?.done ?? false,
      }));
      return existing
        ? api.put(`/api/tasks/${existing.id}`, { items })
        : api.post("/api/tasks", { scope: "game", refId: instanceId, type: "checklist", title: `Farm ${v.domain}`, items });
    },
    onSuccess: () => {
      toast("Tasks updated");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast("Couldn't save the task", "err"),
  });

  const needs = builds.map((b) => needOf(b, bag ?? [])).filter((n): n is BuildNeed => n !== null);
  if (needs.length === 0) {
    return (
      <div className="card empty">
        No farming targets yet. Open a character and pick a <strong>Farming target</strong> on its Artifacts card.
      </div>
    );
  }

  const domainOf = (set: string) => sets.find((s) => s.name === set)?.source || "Boss / world drop";
  const byDomain = new Map<string, BuildNeed[]>();
  for (const n of needs) byDomain.set(domainOf(n.set), [...(byDomain.get(domainOf(n.set)) ?? []), n]);
  // Domains with the most work first.
  const domains = [...byDomain].sort((a, b) => b[1].flatMap((n) => n.missing).length - a[1].flatMap((n) => n.missing).length);

  return (
    <div className="plan-grid">
      {domains.map(([domain, rows]) => {
        const items = rows.flatMap((n) => n.missing.map((m) => `${n.build.name} — ${m}`));
        const drops = sets.filter((s) => s.source === domain).map((s) => s.name);
        return (
          <div className="card plan-card" key={domain}>
            <div className="spread">
              <div>
                <h3 style={{ margin: 0 }}>{domain}</h3>
                <div className="small muted">
                  {drops.length ? `Drops ${drops.join(" & ")}` : "Not a domain set"}
                  {drops.length ? " · 20 resin / run" : ""}
                </div>
              </div>
              <button
                className="btn sm primary"
                disabled={items.length === 0 || addTask.isPending}
                onClick={() => addTask.mutate({ domain, items })}
              >
                {items.length ? (taskFor(domain) ? "Update task" : "Add to Tasks") : "✓ Done"}
              </button>
            </div>
            {rows.map((n) => {
              const icon = sets.find((s) => s.name === n.set)?.icon;
              return (
                <div className="plan-row" key={n.build.id}>
                  <GameIcon
                    src={assetUrl(gameKey, "gear", icon)}
                    fallback={communityAssetUrl(gameKey, "gear", icon)}
                    alt={n.set}
                    className="plan-icon"
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="spread">
                      <Link to={`/characters/${n.build.id}`}><strong>{n.build.name}</strong></Link>
                      <span className={`small ${n.setCount >= SET_PIECES ? "plan-ok" : "muted"}`}>
                        {Math.min(n.setCount, SET_PIECES)}/{SET_PIECES} set
                      </span>
                    </div>
                    <div className="small muted plan-set">{n.set}</div>
                    <div className="chips">
                      {n.mains.map((m) => (
                        <span key={m.slot} className={`badge ${m.ok ? "done" : "todo"}`}>
                          {m.ok ? "✓" : "✗"} {SLOT_LABEL[m.slot]} {m.want}
                        </span>
                      ))}
                      {n.inBag > 0 && <span className="badge">{n.inBag} matching in bag</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
