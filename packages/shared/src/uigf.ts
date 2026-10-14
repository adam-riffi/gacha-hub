import { z } from "zod";
import type { GameDefinition } from "./games/types.js";
import type { PullRecord } from "./pullImport.js";

/** Where each game's accounts sit in a UIGF file (https://uigf.org/en/standards/uigf.html). */
const SECTION: Record<string, "hk4e" | "hkrpg" | "nap"> = { genshin: "hk4e", hsr: "hkrpg", zzz: "nap" };
/** Records one file may hold: years of pulls on every banner, with room to spare. */
const MAX_RECORDS = 50_000;

const text = z.union([z.string(), z.number()]).transform(String);
const record = z.object({
  uigf_gacha_type: text.optional(),
  gacha_type: text,
  item_id: text,
  time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
  // Optional in UIGF, but without it no 5★ can be found.
  rank_type: text.pipe(z.string().regex(/^[1-5]$/)),
  id: z.string().regex(/^\d{1,19}$/),
});
const account = z.object({ uid: text, timezone: z.number().int().min(-12).max(14), lang: z.string().optional(), list: z.array(record).max(MAX_RECORDS) });
const uigfSchema = z.object({
  info: z.object({ export_timestamp: text, export_app: z.string(), export_app_version: z.string(), version: z.string().regex(/^v4\.\d+$/) }),
  hk4e: z.array(account).optional(),
  hkrpg: z.array(account).optional(),
  nap: z.array(account).optional(),
});

/** Whether a game's history can travel as UIGF. */
export const hasUigf = (gameKey: string) => gameKey in SECTION;

/** "YYYY-MM-DD HH:MM:SS" at UTC+`timezone` hours, as an instant. */
function fromServerTime(time: string, timezone: number): Date {
  return new Date(Date.parse(`${time.replace(" ", "T")}Z`) - timezone * 3_600_000);
}

/** An instant as "YYYY-MM-DD HH:MM:SS" at UTC+`timezone` hours, to the second. */
function toServerTime(at: Date, timezone: number): string {
  return new Date(Math.floor(at.getTime() / 1000) * 1000 + timezone * 3_600_000).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * The game's accounts in a UIGF v4 file (ADR 0005), each with its records in
 * UTC. Throws a ZodError when the file is not UIGF v4 or a record lacks its
 * rank, time or id; a file without the game gives no accounts.
 */
export function parseUigf(raw: unknown, game: GameDefinition): { uid: string; timezone: number; records: PullRecord[] }[] {
  const doc = uigfSchema.parse(raw);
  const section = SECTION[game.key];
  return (section ? (doc[section] ?? []) : []).map((account) => ({
    uid: account.uid,
    timezone: account.timezone,
    records: account.list.map((record) => ({ id: record.id, gachaType: record.gacha_type, time: fromServerTime(record.time, account.timezone), rank: Number(record.rank_type), itemId: record.item_id })),
  }));
}

/** What an imported pull keeps to travel again (`PullEntry.record`). */
export interface UigfPull {
  recordId: string;
  createdAt: Date;
  record: { gachaType: string; itemId: string | null; rank: number };
}

/** A profile's imported pulls as a UIGF v4.2 file, times at the account's timezone. */
export function toUigf(game: GameDefinition, account: { uid: string; timezone: number }, pulls: readonly UigfPull[], now: Date) {
  const section = SECTION[game.key];
  const list = pulls.map((pull) => ({
    // Genshin's alone: its second character banner (400) shares pity with the first.
    ...(section === "hk4e" ? { uigf_gacha_type: pull.record.gachaType === "400" ? "301" : pull.record.gachaType } : {}),
    gacha_type: pull.record.gachaType,
    item_id: pull.record.itemId ?? "",
    count: "1",
    time: toServerTime(pull.createdAt, account.timezone),
    rank_type: String(pull.record.rank),
    id: pull.recordId,
  }));
  return {
    info: { export_timestamp: Math.floor(now.getTime() / 1000), export_app: "Gacha Hub", export_app_version: "1", version: "v4.2" },
    ...(section ? { [section]: [{ uid: account.uid, timezone: account.timezone, lang: "en-us", list }] } : {}),
  } as { info: { export_timestamp: number; export_app: string; export_app_version: string; version: string } } & Partial<Record<"hk4e" | "hkrpg" | "nap", { uid: string; timezone: number; lang: string; list: typeof list }[]>>;
}
