import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CharacterDto, OwnershipDto, TaskPriority } from "@gacha/shared";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { useCatalog } from "../../lib/catalog";
import { Segmented } from "../ui";
import { Picker } from "../Picker";
import { assetUrl, communityAssetUrl } from "../../lib/assets";
import { TaskGeneratorPanel } from "../TaskGeneratorPanel";
import { WeaponFarm } from "../characters/WeaponFarm";
import type { InstanceListItem } from "../../lib/types";

type Kind = "gameplay" | "checklist" | "character" | "weapon";

/**
 * The goal maker (Georges, 2026-10-10: "I should be able to create anything
 * from that screen, including character build goals"): a gameplay goal
 * (finish the story, do X quests or events) done once or a number of times; a
 * checklist with its items; a character's build plan or a weapon's, picked
 * here and planned in place.
 */
export function GoalMaker({ games, onDone }: { games: InstanceListItem[]; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("gameplay");
  const [refId, setRefId] = useState(games[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [times, setTimes] = useState(1);
  const [items, setItems] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [unit, setUnit] = useState("");
  const gi = games.find((g) => g.id === refId);
  const planning = kind === "character" || kind === "weapon";
  const { catalog } = useCatalog(planning ? gi?.gameKey : undefined);
  const builds = useQuery({ queryKey: ["characters", refId], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${refId}/characters`), enabled: kind === "character" && Boolean(refId) });
  const ownership = useQuery({ queryKey: ["ownership", refId], queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${refId}/ownership`), enabled: planning && Boolean(refId) });
  const create = useMutation({
    mutationFn: () => {
      const labels = items.split("\n").map((l) => l.trim()).filter(Boolean);
      return api.post("/api/tasks", {
        scope: "game",
        refId,
        type: kind === "checklist" ? "checklist" : "goal",
        title: title.trim(),
        priority,
        ...(kind === "checklist" ? { items: labels.map((label) => ({ label, done: false })) } : { target: Math.max(1, times), progress: 0 }),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      onDone();
    },
    onError: () => toast("Could not add the goal: check the title and items", "err"),
  });

  const ownedIds = new Set((ownership.data ?? []).map((o) => `${o.kind}:${o.catalogId}`));
  const pool = kind === "character" ? (catalog?.characters ?? []) : (catalog?.weapons ?? []);
  const options = [...pool].sort((a, b) => Number(ownedIds.has(`${kind}:${b.id}`)) - Number(ownedIds.has(`${kind}:${a.id}`)) || b.rarity - a.rarity || a.name.localeCompare(b.name));
  const weapon = kind === "weapon" ? catalog?.weapons.find((w) => w.id === unit) : undefined;
  const doc = (builds.data ?? []).find((b) => b.catalogId === unit)?.doc as Record<string, unknown> | undefined;

  return (
    <form
      className="card tk-new"
      aria-label="New goal"
      onSubmit={(e) => {
        e.preventDefault();
        if (!planning) create.mutate();
      }}
    >
      <div className="tk-new-kind">
        <Segmented
          label="Kind of goal"
          options={[
            { value: "gameplay", label: "Gameplay" },
            { value: "checklist", label: "Checklist" },
            { value: "character", label: "Character build" },
            { value: "weapon", label: "Weapon" },
          ]}
          value={kind}
          onChange={(k) => {
            setKind(k);
            setUnit("");
          }}
        />
      </div>
      <div>
        <label htmlFor="tk-game">Game</label>
        <select
          id="tk-game"
          value={refId}
          onChange={(e) => {
            setRefId(e.target.value);
            setUnit("");
          }}
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      {!planning && (
        <>
          <div className="tk-new-title">
            <label htmlFor="tk-title">Title</label>
            <input id="tk-title" value={title} maxLength={200} placeholder={kind === "checklist" ? "Finish the Penacony story" : "Finish the Archon Quest · Do 20 commissions · Clear the event"} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {kind === "gameplay" ? (
            <div>
              <label htmlFor="tk-times">How many times</label>
              <input id="tk-times" type="number" min={1} max={1_000_000} value={times} onChange={(e) => setTimes(Number(e.target.value))} />
            </div>
          ) : (
            <div className="tk-new-items">
              <label htmlFor="tk-items">Items, one per line</label>
              <textarea id="tk-items" rows={3} value={items} placeholder={"Act 1\nAct 2"} onChange={(e) => setItems(e.target.value)} />
            </div>
          )}
          <div>
            <label htmlFor="tk-prio">Priority</label>
            <select id="tk-prio" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="high">high</option>
              <option value="normal">normal</option>
              <option value="low">low</option>
            </select>
          </div>
          <button className="btn primary" type="submit" disabled={!title.trim() || !refId || create.isPending}>
            Add goal
          </button>
        </>
      )}
      {planning && (
        <>
          <div className="tk-new-title">
            <span className="kpi-label">{kind === "character" ? "Character" : "Weapon"}</span>
            {catalog ? (
              <Picker
                label={kind === "character" ? "Character" : "Weapon"}
                placeholder="Name"
                value={options.find((u) => u.id === unit)?.name ?? ""}
                options={options.map((u) => ({ id: u.id, name: u.name, src: assetUrl(gi!.gameKey, kind, u.icon), fallback: communityAssetUrl(gi!.gameKey, kind, u.icon), sub: ownedIds.has(`${kind}:${u.id}`) ? undefined : "not owned" }))}
                onPick={(u) => setUnit(u?.id ?? "")}
              />
            ) : (
              <p className="mu">No catalog</p>
            )}
          </div>
          {unit && gi && (
            <div className="tk-new-plan">
              {kind === "character" ? <TaskGeneratorPanel instanceId={gi.id} gameKey={gi.gameKey} catalogId={unit} doc={doc ?? {}} /> : weapon && <WeaponFarm instanceId={gi.id} weapon={weapon} onDone={onDone} />}
            </div>
          )}
        </>
      )}
    </form>
  );
}
