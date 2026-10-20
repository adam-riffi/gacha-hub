import { useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gameList, type ArtSlotKind } from "@gacha/shared";
import { api, ApiError } from "../../lib/api";
import { useArtSlots, type ArtSlotItem } from "../../lib/art";
import { GameMark } from "../GameMark";
import { Segmented } from "../ui";

const KIND: Record<ArtSlotKind, string> = {
  logo: "Logo",
  mode: "Endgame mode",
  "battle-pass": "Battle pass",
  "monthly-pass": "30-day pass",
  banner: "Banner",
  shop: "Monthly shop",
  currency: "Currency",
  task: "Task",
  element: "Element",
  "weapon-type": "Weapon type",
  character: "Character",
  weapon: "Weapon",
  gear: "Gear set",
  material: "Material",
};
const SIZE = { square: "256 × 256", wide: "1280 × 720" } as const;
/** Vercel takes a request of 4.5 MB at most. */
const MAX_BYTES = 4 * 1024 * 1024;
const UPLOAD_ERROR: Record<number, string> = { 413: "Too large: up to 4 MB", 415: "Not a picture: PNG, JPEG, WebP or GIF" };

const stateOf = (slot: ArtSlotItem) => (slot.url ? "uploaded" : slot.sourced ? "sourced" : "needed");
const STATE = { uploaded: "Uploaded", sourced: "From a source", needed: "Needed" } as const;

/**
 * Settings → Art (Georges, 2026-10-17: "make me an exhaustive list of assets you need"): every picture a card can show
 * that no catalog names, game by game, most visible first; each takes the owner's upload in place, stored in Vercel
 * Blob, never committed (ADR 0006). It opens on the pictures no source has.
 */
export function ArtSettings() {
  const { data } = useArtSlots();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"needed" | "all">("needed");
  const [progress, setProgress] = useState<{ fetched: number; failed: string[]; running: boolean } | null>(null);
  const slots = data?.slots ?? [];
  const count = (state: ReturnType<typeof stateOf>) => slots.filter((slot) => stateOf(slot) === state).length;
  const fetchable = slots.filter((slot) => slot.fetchable && !slot.url).length;
  const nameOf = (key: string) => slots.find((slot) => slot.key === key)?.name ?? key;
  // The pictures found on the sources (Georges, 2026-10-20: "find me all of the assets"), fetched by the server in batches.
  const fetchAll = async () => {
    const tally = { fetched: 0, failed: [] as string[], running: true };
    setProgress({ ...tally });
    for (let batch = 0; batch < 40; batch++) {
      let result: { fetched: { key: string }[]; failed: { key: string; error: string }[]; left: number };
      try {
        result = await api.post("/api/art/fetch", { limit: 8 });
      } catch {
        tally.failed.push("the server");
        break;
      }
      tally.fetched += result.fetched.length;
      tally.failed.push(...result.failed.map((failure) => nameOf(failure.key)));
      setProgress({ ...tally });
      await queryClient.invalidateQueries({ queryKey: ["art"] });
      if (result.left === 0 || result.fetched.length === 0) break;
    }
    setProgress({ ...tally, running: false });
  };
  return (
    <>
      <section className="card art-intro" aria-label="About art">
        <h3>Art</h3>
        <div className="art-counts">
          {(["needed", "uploaded", "sourced"] as const).map((state) => (
            <span key={state} className={`art-count is-${state}`}>
              <b className="font-display">{count(state)}</b> {STATE[state]}
            </span>
          ))}
        </div>
        <p className="text-muted">PNG, JPEG, WebP or GIF · up to 4 MB · icons {SIZE.square}, wide pictures {SIZE.wide}</p>
        {(fetchable > 0 || progress) && (
          <div className="row art-fetch">
            {fetchable > 0 && (
              <button type="button" className="btn primary" disabled={progress?.running} onClick={() => void fetchAll()}>
                {progress?.running ? "Fetching…" : `Fetch ${fetchable} from the sources`}
              </button>
            )}
            {progress && (
              <span role="status" className="art-fetch-status">
                {progress.fetched} fetched · {progress.failed.length} failed{progress.failed.length ? `: ${progress.failed.join(", ")}` : ""}
              </span>
            )}
          </div>
        )}
        <Segmented
          label="Show"
          value={view}
          onChange={setView}
          options={[
            { value: "needed", label: "Needed" },
            { value: "all", label: "All" },
          ]}
        />
      </section>
      {gameList.map((game) => {
        // Needed: the pictures only the owner can give, uploaded or not, so a tile stays in place once filled.
        const shown = slots.filter((slot) => slot.gameKey === game.key && (view === "all" || !slot.sourced));
        if (!shown.length) return null;
        return (
          <section key={game.key} className="card art-game" aria-label={game.name}>
            <h3 className="row">
              <GameMark gameKey={game.key} className="art-mark" />
              {game.name}
              <span className="text-muted font-mono">{shown.length}</span>
            </h3>
            <div className="art-grid">
              {shown.map((slot) => (
                <SlotTile key={slot.key} slot={slot} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function SlotTile({ slot }: { slot: ArtSlotItem }) {
  const queryClient = useQueryClient();
  const [problem, setProblem] = useState<string | null>(null);
  const done = () => {
    setProblem(null);
    return queryClient.invalidateQueries({ queryKey: ["art"] });
  };
  const upload = useMutation({
    mutationFn: (file: File) => api.upload(file, `/api/art/${slot.key}`, "PUT"),
    onSuccess: done,
    onError: (caught) => setProblem((caught instanceof ApiError && UPLOAD_ERROR[caught.status]) || "Not uploaded"),
  });
  const remove = useMutation({ mutationFn: () => api.del(`/api/art/${slot.key}`), onSuccess: done });
  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) return setProblem(UPLOAD_ERROR[413]!);
    upload.mutate(file);
  };
  const state = stateOf(slot);
  return (
    <div className={`art-slot is-${slot.shape}`} role="group" aria-label={slot.name}>
      <div className="art-frame">{slot.url ? <img className="art-preview" src={slot.url} alt="" /> : <span className="font-mono">{SIZE[slot.shape]}</span>}</div>
      <strong className="art-name">{slot.name}</strong>
      <span className="kpi-label">{KIND[slot.kind]}</span>
      <span className={`tag art-state is-${state}`}>{STATE[state]}</span>
      <span className="row art-actions">
        <label className={`btn ${slot.url ? "" : "primary"}`}>
          {upload.isPending ? "Uploading…" : slot.url ? "Replace" : "Upload"}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={pick} disabled={upload.isPending} />
        </label>
        {slot.url && (
          <button type="button" className="btn ghost" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Remove
          </button>
        )}
      </span>
      {problem && (
        <span role="alert" className="st-bad">
          {problem}
        </span>
      )}
    </div>
  );
}
