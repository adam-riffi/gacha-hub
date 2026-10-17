import { useQuery } from "@tanstack/react-query";
import type { ArtSlot } from "@gacha/shared";
import { api } from "./api";

export type ArtSlotItem = ArtSlot & { url: string | null };

const fetchSlots = () => api.get<{ slots: ArtSlotItem[] }>("/api/art");

/** Every game's picture slots with the owner's upload, if any (Settings → Art). */
export const useArtSlots = () => useQuery({ queryKey: ["art"], queryFn: fetchSlots, staleTime: 5 * 60_000 });

/** The owner's picture for a slot (`artSlotKey`), or null: the card keeps what it shows without one. */
export function useSlotArt(key: string | null): string | null {
  const { data } = useQuery({ queryKey: ["art"], queryFn: fetchSlots, staleTime: 5 * 60_000, select: (result) => new Map(result.slots.map((slot) => [slot.key, slot.url])) });
  return (key && data?.get(key)) || null;
}
