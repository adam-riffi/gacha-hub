import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type BuildStatus } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { GameSheet, hasSheet } from "../render";
import { TaskGeneratorPanel } from "../components/TaskGeneratorPanel";
import { useCatalog } from "../lib/catalog";
import type { SheetCatalog } from "../render";
import type { CharacterDetail } from "../lib/types";

export function CharacterPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["character", id],
    queryFn: () => api.get<CharacterDetail>(`/api/characters/${id}`),
    enabled: Boolean(id),
  });

  if (isLoading || !data) return <div className="muted">Loading…</div>;
  // Keyed by id so the editor re-initializes when navigating between characters.
  return <CharacterEditor key={data.id} data={data} />;
}

function CharacterEditor({ data }: { data: CharacterDetail }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  // Local editable copy, seeded once from the fetched character.
  const [state, setState] = useState(() => ({
    name: data.name,
    portraitUrl: data.portraitUrl,
    doc: (data.doc as Record<string, unknown>) ?? {},
    buildStatus: data.buildStatus,
  }));

  const game = getGame(data.gameKey);
  const { index, catalog } = useCatalog(data.gameKey);
  const entry = data.catalogId ? index?.characters.get(data.catalogId) : undefined;
  const sheetCatalog: SheetCatalog | undefined = entry
    ? { element: entry.tag, weaponType: entry.weaponType, gearSets: catalog?.gear.map((g) => g.name) }
    : undefined;

  const save = useMutation({
    mutationFn: () =>
      api.put(`/api/characters/${data.id}`, {
        name: state.name,
        portraitUrl: state.portraitUrl,
        doc: state.doc,
        buildStatus: state.buildStatus,
      }),
    onSuccess: () => {
      toast("Saved");
      qc.invalidateQueries({ queryKey: ["character", data.id] });
    },
    onError: () => toast("Save failed — check the values (limits apply)", "err"),
  });

  const del = useMutation({
    mutationFn: () => api.del(`/api/characters/${data.id}`),
    onSuccess: () => {
      toast("Character deleted");
      qc.invalidateQueries();
      nav(-1);
    },
  });

  return (
    <>
      <div className="page-head">
        <div className="row">
          <button className="btn ghost sm" onClick={() => nav(-1)}>← Back</button>
          <h1 style={{ margin: 0 }}>{state.name || "Character"}</h1>
          {game && <span className="badge" style={{ color: game.accent }}>{game.name}</span>}
        </div>
        <div className="row">
          <select
            className={`prio build-${state.buildStatus}`}
            value={state.buildStatus}
            onChange={(e) => setState((s) => ({ ...s, buildStatus: e.target.value as BuildStatus }))}
            title="Build status (for unbuilt analytics)"
          >
            <option value="none">Unbuilt</option>
            <option value="building">Building</option>
            <option value="good">Good</option>
            <option value="perfect">Perfect</option>
          </select>
          <button className="btn primary" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </button>
          <button
            className="btn danger sm"
            onClick={() => {
              if (confirm("Delete this character?")) del.mutate();
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {hasSheet(data.gameKey) ? (
        <GameSheet
          gameKey={data.gameKey}
          doc={state.doc}
          setDoc={(updater) =>
            setState((s) => ({ ...s, doc: updater(s.doc) as Record<string, unknown> }))
          }
          name={state.name}
          portraitUrl={state.portraitUrl}
          onName={(name) => setState((s) => ({ ...s, name }))}
          onPortrait={(url) => setState((s) => ({ ...s, portraitUrl: url }))}
          catalog={sheetCatalog}
        />
      ) : (
        <div className="card empty">No sheet is registered for game "{data.gameKey}".</div>
      )}

      {data.catalogId && (
        <TaskGeneratorPanel
          instanceId={data.gameInstanceId}
          gameKey={data.gameKey}
          catalogId={data.catalogId}
          doc={state.doc}
        />
      )}
    </>
  );
}
