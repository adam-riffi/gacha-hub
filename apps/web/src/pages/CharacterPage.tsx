import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { resolveSheet } from "../render";
import type { CharacterDetail } from "../lib/types";

export function CharacterPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["character", id],
    queryFn: () => api.get<CharacterDetail>(`/api/characters/${id}`),
    enabled: Boolean(id),
  });

  const [state, setState] = useState<{
    name: string;
    portraitUrl: string | null;
    doc: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    if (data) {
      setState({ name: data.name, portraitUrl: data.portraitUrl, doc: data.doc ?? {} });
    }
  }, [data?.id]);

  const save = useMutation({
    mutationFn: () =>
      api.put(`/api/characters/${id}`, {
        name: state!.name,
        portraitUrl: state!.portraitUrl,
        doc: state!.doc,
      }),
    onSuccess: () => {
      toast("Saved");
      qc.invalidateQueries({ queryKey: ["character", id] });
    },
    onError: () => toast("Save failed", "err"),
  });

  const del = useMutation({
    mutationFn: () => api.del(`/api/characters/${id}`),
    onSuccess: () => {
      toast("Character deleted");
      qc.invalidateQueries();
      nav(-1);
    },
  });

  if (isLoading || !data || !state) return <div className="muted">Loading…</div>;

  const Sheet = resolveSheet(data.gameKey);
  const game = getGame(data.gameKey);

  return (
    <>
      <div className="page-head">
        <div className="row">
          <button className="btn ghost sm" onClick={() => nav(-1)}>← Back</button>
          <h1 style={{ margin: 0 }}>{state.name || "Character"}</h1>
          {game && <span className="badge" style={{ color: game.accent }}>{game.name}</span>}
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </button>
          <button
            className="btn danger sm"
            onClick={() => { if (confirm("Delete this character?")) del.mutate(); }}
          >
            Delete
          </button>
        </div>
      </div>

      {Sheet ? (
        <Sheet
          doc={state.doc}
          setDoc={(updater) =>
            setState((s) => (s ? { ...s, doc: updater(s.doc) as Record<string, unknown> } : s))
          }
          name={state.name}
          portraitUrl={state.portraitUrl}
          onName={(name) => setState((s) => (s ? { ...s, name } : s))}
          onPortrait={(url) => setState((s) => (s ? { ...s, portraitUrl: url } : s))}
        />
      ) : (
        <div className="card empty">No sheet is registered for game "{data.gameKey}".</div>
      )}
    </>
  );
}
