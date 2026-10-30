import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, hubResets, utcLabel } from "@gacha/shared";
import { api } from "../../lib/api";
import type { InstanceDetail } from "../../lib/types";
import { Countdown } from "../ui";
import { GameMark } from "../GameMark";
import { HeroArt } from "../HeroArt";

const DATE = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const SHORT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
/** "7•••••••6": the hub shows a UID without spelling it out. */
export const masked = (uid: string) => (uid.length > 2 ? `${uid[0]}${"•".repeat(uid.length - 2)}${uid.at(-1)}` : uid);

/**
 * The game hub's header (WIREFRAMES.md, Game hub): the game's icon, its name
 * and account level, the next daily and weekly resets and the version's end
 * on the profile's server, on a solid block at the left; the key art whole on
 * the right (round 27, Georges: "i wanna be able to see it as well as see the
 * info + i don't need my region + UID at all times"). Edit sets the server,
 * UID and account level.
 */
export function HubHeader({ instanceId }: { instanceId: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["instance", instanceId], queryFn: () => api.get<InstanceDetail>(`/api/instances/${instanceId}`) });
  const [editing, setEditing] = useState(false);
  const save = useMutation({
    mutationFn: (body: { regionKey?: string; uid: string | null; accountLevel: number | null }) => api.put(`/api/instances/${instanceId}`, body),
    onSuccess: () => {
      setEditing(false);
      for (const queryKey of [["instance", instanceId], ["instances"], ["dashboard"]]) queryClient.invalidateQueries({ queryKey });
    },
  });
  const game = data && getGame(data.gameKey);
  if (!data || !game) return null;

  const region = game.regions.find((candidate) => candidate.key === data.regionKey) ?? game.regions[0]!;
  const level = game.manifest.accountLevel;
  const world = game.manifest.worldLevel;
  const resets = hubResets(game, region, new Date());
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const uid = String(formData.get("uid") ?? "").trim();
    const levelText = String(formData.get("level") ?? "").trim();
    save.mutate({ regionKey: formData.get("region") ? String(formData.get("region")) : undefined, uid: uid || null, accountLevel: levelText ? Number(levelText) : null });
  };

  return (
    <section className="hub-head" aria-label={data.name}>
      {/* The key art whole on the right half (round 27), beside the block, not under it. */}
      <HeroArt gameKey={game.key} className="hub-hero" />
      <div className="hub-block">
        {/* The game's icon (round 27: "use the top icons for the games like paimon"): the owner's, else the store's, else the emblem. */}
        <GameMark gameKey={game.key} className="hub-icon" />
        <div className="hub-id">
        <h1 className="hub-name">{data.name}</h1>
        {editing ? (
          <form className="hub-edit" onSubmit={submit}>
            {game.regions.length > 1 && (
              <label>
                <span>Server</span>
                <select name="region" defaultValue={region.key}>
                  {game.regions.map((regionOption) => (
                    <option key={regionOption.key} value={regionOption.key}>
                      {regionOption.label} · {utcLabel(regionOption.utcOffsetMinutes)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>UID</span>
              <input name="uid" defaultValue={data.uid ?? ""} maxLength={32} pattern="[A-Za-z0-9-]*" autoComplete="off" />
            </label>
            <label>
              <span>{level.name}</span>
              <input name="level" type="number" min={1} max={100} defaultValue={data.accountLevel ?? ""} />
            </label>
            <button type="submit" className="btn primary" disabled={save.isPending}>
              Save
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
            {save.isError && <span className="hub-error">Not saved: check the UID and level.</span>}
          </form>
        ) : (
          <div className="hub-chips">
            {/* The server and UID live in the form and on Profile (round 27); the level stays. */}
            {data.accountLevel !== null && (
              <span className="badge" title={level.name}>
                {level.label} {data.accountLevel}
                {world && data.worldLevel !== null && ` · ${world.label} ${data.worldLevel}`}
              </span>
            )}
            <button type="button" className="btn" aria-label="Edit profile" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
        )}
        </div>
        <dl className="hub-resets">
          <div>
            <dt>Daily reset</dt>
            <dd>
              <Countdown at={resets.daily.toISOString()} kind="reset" prefix="in" />
            </dd>
          </div>
          <div>
            <dt>Weekly reset</dt>
            <dd>{DATE.format(resets.weekly)}</dd>
          </div>
          <div>
            <dt>Version {game.manifest.version.name}</dt>
            <dd>ends {SHORT.format(resets.versionEnd)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
