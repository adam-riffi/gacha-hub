import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dupeLetter, getGame, weaponHolder, type CatalogWeapon, type CharacterDto, type OwnershipDto, type WishlistItemDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { GameTabs } from "../components/GameTabs";
import { Chips } from "../components/ui";
import { WeaponsTable, type WeaponMeta, type WeaponRow } from "../components/characters/WeaponsTable";
import type { InstanceDetail } from "../lib/types";

/**
 * A game's Weapons (Georges, 2026-10-11: "a weapons screen to add all of my
 * weapons, with their level, refinement…"): every weapon of the catalog,
 * owned ones first, each with its level, refinement and copies typed in place,
 * who wields it, the wishlist and farming; search, type and rarity filter.
 */
export function WeaponsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [rarity, setRarity] = useState("");
  const [shown, setShown] = useState<"all" | "owned" | "wishlist">("all");
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const ownership = useQuery({ queryKey: ["ownership", id], queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${id}/ownership`) });
  const wishlist = useQuery({ queryKey: ["wishlist", id], queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${id}/wishlist`) });
  const { catalog } = useCatalog(instance.data?.gameKey);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ownership", id] });
  const own = useMutation({
    mutationFn: (v: { catalogId: string; owned: boolean; meta?: WeaponMeta; qty?: number }) => api.put(`/api/instances/${id}/ownership`, { items: [{ kind: "weapon", ...v }] }),
    onSuccess: refresh,
    onError: () => toast("Not saved: check the values", "err"),
  });
  const wish = useMutation({
    mutationFn: (v: { catalogId: string; wished: boolean }) => api.put(`/api/instances/${id}/wishlist`, { kind: "weapon", ...v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist", id] }),
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError) return <LoadError what="Weapons" retry={() => instance.refetch()} />;
  if (!instance.data || !game || !catalog) return <div className="mu">Loading…</div>;

  const holder = weaponHolder(game);
  const dupeField = game.manifest.dupes.weapon?.field;
  const mine = new Map((ownership.data ?? []).filter((o) => o.kind === "weapon").map((o) => [o.catalogId, o]));
  const wished = new Set((wishlist.data ?? []).filter((w) => w.kind === "weapon").map((w) => w.catalogId));
  const rows: WeaponRow[] = catalog.weapons.map((w) => ({
    weapon: w,
    owned: mine.has(w.id),
    wished: wished.has(w.id),
    meta: (mine.get(w.id)?.meta ?? {}) as WeaponMeta,
    qty: mine.get(w.id)?.qty ?? 0,
    holders: (builds.data ?? []).flatMap((b) => {
      const held = holder ? ((b.doc as Record<string, unknown>)[holder] as Record<string, unknown> | undefined) : undefined;
      if (held?.catalogId !== w.id) return [];
      const dupe = dupeField ? held[dupeField.split(".").at(-1)!] : undefined;
      return [{ buildId: b.id, name: catalog.characters.find((c) => c.id === b.catalogId)?.name ?? b.name, dupe: `${dupeLetter(dupeField ?? "")}${typeof dupe === "number" ? dupe : 1}` }];
    }),
  }));
  const list = rows
    .filter((r) => !q || r.weapon.name.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => !type || r.weapon.type === type)
    .filter((r) => !rarity || String(r.weapon.rarity) === rarity)
    .filter((r) => (shown === "owned" ? r.owned : shown === "wishlist" ? r.wished : true))
    .sort((a, b) => Number(b.owned) - Number(a.owned) || b.holders.length - a.holders.length || b.weapon.rarity - a.weapon.rarity || a.weapon.name.localeCompare(b.weapon.name));
  const values = (pick: (w: CatalogWeapon) => string | undefined) => [...new Set(catalog.weapons.map(pick).filter((v): v is string => Boolean(v)))].sort();

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="weapons" gameKey={game.key} hasCatalog />
      </div>
      <section className="card ch-filters" aria-label="Filters">
        <label>
          Search
          <input type="search" aria-label="Search" placeholder="Name" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Chips label="Type" value={type} onChange={setType} options={values((w) => w.type)} />
        <Chips label="Rarity" value={rarity} onChange={setRarity} options={values((w) => String(w.rarity)).reverse()} text={(r) => `★${r}`} />
      </section>
      <div className="ch-counts" role="group" aria-label="Filter by count">
        {(
          [
            ["all", "All", rows.length],
            ["owned", "Owned", rows.filter((r) => r.owned).length],
            ["wishlist", "Wishlist", rows.filter((r) => r.wished).length],
          ] as const
        ).map(([v, label, n]) => (
          <button key={v} className="chip" aria-pressed={shown === v} onClick={() => setShown(shown === v ? "all" : v)}>
            {label} {n}
          </button>
        ))}
      </div>
      <WeaponsTable
        instanceId={id!}
        gameKey={game.key}
        dupeLabel={game.manifest.dupes.weapon?.label ?? "Refinement"}
        rows={list}
        onOwn={(catalogId, owned) => own.mutate({ catalogId, owned })}
        onMeta={(catalogId, meta, qty) => own.mutate({ catalogId, owned: true, meta, ...(qty ? { qty } : {}) })}
        onWish={(catalogId, w) => wish.mutate({ catalogId, wished: w })}
      />
    </>
  );
}
