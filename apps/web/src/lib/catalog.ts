import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGame, indexCatalog, type Catalog } from "@gacha/shared";

/**
 * Load a game's catalog on demand (it's a separate chunk per game) and index
 * it for lookups. Games without a catalog resolve to null.
 */
export function useCatalog(gameKey: string | undefined) {
  const query = useQuery({
    queryKey: ["catalog", gameKey],
    queryFn: async (): Promise<Catalog | null> => {
      const game = gameKey ? getGame(gameKey) : undefined;
      return game?.loadCatalog ? game.loadCatalog() : null;
    },
    enabled: Boolean(gameKey),
    staleTime: Infinity,
  });
  const index = useMemo(() => (query.data ? indexCatalog(query.data) : null), [query.data]);
  return { catalog: query.data ?? null, index, isLoading: query.isLoading };
}
