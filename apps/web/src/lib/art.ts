import { useQuery } from "@tanstack/react-query";
import type { ArtSlot } from "@gacha/shared";
import { api } from "./api";

export type ArtSlotItem = ArtSlot & { url: string | null; invert: boolean; fetchable: boolean };

const fetchSlots = () => api.get<{ slots: ArtSlotItem[] }>("/api/art");

/** Every game's picture slots with the owner's upload, if any (Settings → Art). */
export const useArtSlots = () => useQuery({ queryKey: ["art"], queryFn: fetchSlots, staleTime: 5 * 60_000 });

/** Whether a slot's picture is a dark icon to show inverted on the dark UI (the logo and the shop icon from the sources). */
export function useSlotInverted(key: string | null): boolean {
  const { data } = useQuery({ queryKey: ["art"], queryFn: fetchSlots, staleTime: 5 * 60_000, select: (result) => new Set(result.slots.filter((slot) => slot.invert).map((slot) => slot.key)) });
  return Boolean(key && data?.has(key));
}

/** The owner's picture for a slot (`artSlotKey`), or null: the card keeps what it shows without one. */
export function useSlotArt(key: string | null): string | null {
  const { data } = useQuery({ queryKey: ["art"], queryFn: fetchSlots, staleTime: 5 * 60_000, select: (result) => new Map(result.slots.map((slot) => [slot.key, slot.url])) });
  return (key && data?.get(key)) || null;
}
