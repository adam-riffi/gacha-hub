import type { ReactElement } from "react";
import type { SheetProps } from "./types";
import { GenshinSheet } from "../games/genshin/Sheet";
import { HsrSheet } from "../games/hsr/Sheet";
import { ZzzSheet } from "../games/zzz/Sheet";
import { EndfieldSheet } from "../games/endfield/Sheet";

// The registry is heterogeneous (each sheet has its own Doc type), so values
// are typed loosely; CharacterPage supplies the matching document.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySheet = (props: SheetProps<any>) => ReactElement;

const sheets: Record<string, AnySheet> = {
  genshin: GenshinSheet as AnySheet,
  hsr: HsrSheet as AnySheet,
  zzz: ZzzSheet as AnySheet,
  endfield: EndfieldSheet as AnySheet,
};

export function resolveSheet(gameKey: string): AnySheet | null {
  return sheets[gameKey] ?? null;
}

export type { SheetProps };
