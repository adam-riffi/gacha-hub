import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getGame, type CharacterDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import type { InstanceDetail } from "../lib/types";
import { CharacterEditor, CharacterPage } from "./CharacterPage";

/**
 * A unit from the game's catalog (Georges, 2026-10-10: every character opens, owned or not). Round 10: "on the not owned
 * characters there's almost nothing; I want the same thing as owned characters": it opens its default build's sheet, or the
 * same sheet unsaved, seeded from the catalog, whose first save makes a build to try.
 */
export function UnitPage() {
  const { id, catalogId } = useParams<{ id: string; catalogId: string }>();
  const instance = useQuery({
    queryKey: ["instance", id],
    queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`),
  });
  const builds = useQuery({
    queryKey: ["characters", id],
    queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`),
  });
  const { index } = useCatalog(instance.data?.gameKey);

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || builds.isError)
    return (
      <LoadError
        what="This unit"
        retry={() => void instance.refetch().then(() => builds.refetch())}
      />
    );
  if (!instance.data || !game || !index || !builds.data) return <div className="text-muted">Loading…</div>;
  const entry = index.characters.get(catalogId ?? "");
  if (!entry) {
    return (
      <p className="text-muted">
        No unit {catalogId} in {game.name}&apos;s catalog.{" "}
        <Link to={`/games/${id}/characters`}>← Characters</Link>
      </p>
    );
  }

  const mine = builds.data.filter((build) => build.catalogId === entry.id);
  const shown = mine.find((build) => build.isDefault) ?? mine[0];
  if (shown) return <CharacterPage buildId={shown.id} />;
  return (
    <CharacterEditor
      key={entry.id}
      data={{
        id: "",
        gameInstanceId: id!,
        gameKey: game.key,
        catalogId: entry.id,
        name: entry.name,
        portraitUrl: null,
        doc: {
          ...(game.emptyDoc() as object),
          ...((game.seedDoc?.(entry) as object) ?? {}),
        } as CharacterDto["doc"],
        docVersion: game.docVersion,
        buildStatus: "none",
        role: null,
        targets: null,
        isDefault: false,
        cardStats: null,
        misc: null,
        createdAt: "",
        updatedAt: "",
        defaultTargets: instance.data.kpiTargets,
      }}
    />
  );
}
