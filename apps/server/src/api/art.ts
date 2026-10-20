import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { artSlots, gameList, type ArtSlot } from "@gacha/shared";
import { requireAdmin, requireUser } from "../auth/plugin.js";
import { IMAGE_TYPES, storeImage } from "../lib/images.js";
import { prisma } from "../lib/prisma.js";
import { getCatalog } from "./util.js";
import { ART_SOURCES as SOURCES } from "../art/sources.js";
const SOURCE_KEYS = new Set(SOURCES.map((source) => source.slot));

const WIKI_FILE = /^(https:\/\/[^/]+)\/wiki\/Special:FilePath\/(.+)$/;
const PLAIN_AGENT = "gacha-hub/1.0 (private project)";
/** The static hosts of the wikis answer a bare client with a challenge page; a browser's own headers pass. */
const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "sec-fetch-dest": "image",
  "sec-fetch-mode": "no-cors",
  "sec-fetch-site": "cross-site",
};

/** A source's picture: a wiki file is resolved through the wiki's API first; the bytes come back with their type. */
async function fetchSource(url: string): Promise<{ bytes: Buffer; type: string } | { error: string }> {
  let target = url;
  const wiki = WIKI_FILE.exec(url);
  if (wiki) {
    const api = `${wiki[1]}/api.php?action=query&titles=File:${wiki[2]}&prop=imageinfo&iiprop=url&format=json`;
    const info = (await (await fetch(api, { headers: { "user-agent": PLAIN_AGENT } })).json()) as { query?: { pages?: Record<string, { imageinfo?: { url: string }[] }> } };
    const resolved = Object.values(info.query?.pages ?? {})[0]?.imageinfo?.[0]?.url;
    if (!resolved) return { error: "not_on_the_wiki" };
    target = resolved;
  }
  const response = await fetch(target, { redirect: "follow", headers: { ...BROWSER_HEADERS, referer: wiki ? `${wiki[1]}/` : `${new URL(target).origin}/` } });
  if (!response.ok) return { error: `http_${response.status}` };
  const type = (response.headers.get("content-type") ?? "").split(";")[0]!.trim();
  if (!IMAGE_TYPES.has(type)) return { error: "not_a_picture" };
  return { bytes: Buffer.from(await response.arrayBuffer()), type };
}

const fetchInput = z.object({ keys: z.array(z.string().max(120)).max(50).optional(), limit: z.number().int().min(1).max(20).default(8) });

const distinct = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value) && value !== "None"))].sort();

type Entry = { name: string; icon?: string | null };

/** Every game's slots: its catalog's elements and weapon types, and its entries without an icon or of a kind it has no source for. */
async function allSlots(): Promise<ArtSlot[]> {
  const perGame = await Promise.all(
    gameList.map(async (game) => {
      const catalog = (await getCatalog(game))?.catalog;
      const characters = catalog?.characters ?? [];
      const lists: [ArtSlot["kind"] & ("character" | "weapon" | "gear" | "material"), Entry[]][] = [
        ["character", [...characters, ...((catalog as { companions?: Entry[] } | undefined)?.companions ?? [])]],
        ["weapon", catalog?.weapons ?? []],
        ["gear", catalog?.gear ?? []],
        ["material", catalog?.materials ?? []],
      ];
      const gaps = lists.flatMap(([kind, entries]) => entries.filter((entry) => !entry.icon || !game.manifest.art[kind]).map((entry) => ({ kind, name: entry.name })));
      return artSlots(game, { elements: distinct(characters.map((character) => character.tag)), weaponTypes: distinct(characters.map((character) => character.weaponType)), gaps });
    }),
  );
  return perGame.flat();
}

const slotKey = (req: FastifyRequest) => (req.params as { "*": string })["*"];
const writes = { preHandler: requireAdmin, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } };

/**
 * The owner's pictures for the art slots (Georges, 2026-10-17: "an exhaustive list of assets you need"): the list with
 * whether a source has each and the owner's upload, if any; an upload or a removal per slot, owner only and audited.
 */
export async function registerArtRoutes(app: FastifyInstance) {
  app.get("/api/art", { preHandler: requireUser }, async () => {
    const uploads = new Map((await prisma.artSlot.findMany()).map((row) => [row.key, row]));
    return { slots: (await allSlots()).map((slot) => ({ ...slot, url: uploads.get(slot.key)?.url ?? null, invert: uploads.get(slot.key)?.invert ?? false, fetchable: SOURCE_KEYS.has(slot.key) })) };
  });

  // The pictures found for the slots, fetched into the store at one click: the named keys, or the next batch not yet held.
  app.post("/api/art/fetch", { preHandler: requireAdmin, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (req) => {
    const { keys, limit } = fetchInput.parse(req.body ?? {});
    const held = new Set((await prisma.artSlot.findMany({ select: { key: true } })).map((row) => row.key));
    const wanted = keys ?? SOURCES.filter((source) => !held.has(source.slot)).slice(0, limit).map((source) => source.slot);
    const fetched: { key: string; url: string }[] = [];
    const failed: { key: string; error: string }[] = [];
    for (const key of wanted) {
      const source = SOURCES.find((candidate) => candidate.slot === key);
      if (!source) {
        failed.push({ key, error: "no_source" });
        continue;
      }
      try {
        const picture = await fetchSource(source.url);
        if ("error" in picture) {
          failed.push({ key, error: picture.error });
          continue;
        }
        const url = await storeImage(picture.bytes, picture.type);
        const invert = Boolean(source.invert);
        await prisma.$transaction([
          prisma.artSlot.upsert({ where: { key }, create: { key, url, invert }, update: { url, invert } }),
          prisma.auditLog.create({ data: { actorUserId: req.user!.id, action: "fetch", targetKind: "art", targetKey: key } }),
        ]);
        held.add(key);
        fetched.push({ key, url });
      } catch {
        failed.push({ key, error: "failed" });
      }
    }
    return { fetched, failed, left: SOURCES.filter((source) => !held.has(source.slot)).length };
  });

  app.put("/api/art/*", writes, async (req, reply) => {
    const key = slotKey(req);
    if (!(await allSlots()).some((slot) => slot.key === key)) return reply.code(404).send({ error: "not_found" });
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "no_file" });
    if (!IMAGE_TYPES.has(data.mimetype)) return reply.code(415).send({ error: "unsupported_type" });
    const fileBuffer = await data.toBuffer();
    if (data.file.truncated) return reply.code(413).send({ error: "file_too_large" });
    const url = await storeImage(fileBuffer, data.mimetype);
    await prisma.$transaction([
      prisma.artSlot.upsert({ where: { key }, create: { key, url }, update: { url } }),
      prisma.auditLog.create({ data: { actorUserId: req.user!.id, action: "set", targetKind: "art", targetKey: key } }),
    ]);
    return { url };
  });

  app.delete("/api/art/*", writes, async (req) => {
    const key = slotKey(req);
    await prisma.$transaction([
      prisma.artSlot.deleteMany({ where: { key } }),
      prisma.auditLog.create({ data: { actorUserId: req.user!.id, action: "clear", targetKind: "art", targetKey: key } }),
    ]);
    return { ok: true };
  });
}
