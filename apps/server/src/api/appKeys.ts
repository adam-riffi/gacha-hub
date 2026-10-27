import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin } from "../auth/plugin.js";
import { clearKey, isAppKey, listKeys, readKey, setKey } from "../lib/appKeys.js";
import { parseKeyPaste, type PasteKeyName } from "../lib/keysPaste.js";

const keyInput = z.object({ value: z.string().max(4096) });
const writes = { preHandler: requireAdmin, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } };

/** Settings → Keys (ADR 0012): the owner's keys, sealed; a secret is never sent back. */
export async function registerAppKeyRoutes(app: FastifyInstance) {
  app.get("/api/settings/keys", { preHandler: requireAdmin }, async () => listKeys());

  app.put<{ Params: { name: string } }>("/api/settings/keys/:name", writes, async (req, reply) => {
    const { name } = req.params;
    if (!isAppKey(name)) return reply.code(404).send({ error: "not_found" });
    const result = await setKey(name, keyInput.parse(req.body).value, req.user!.id);
    if (result === "set_on_host") return reply.code(409).send({ error: result });
    if (result === "bad_value") return reply.code(400).send({ error: result });
    return { ok: true };
  });

  app.delete<{ Params: { name: string } }>("/api/settings/keys/:name", writes, async (req, reply) => {
    const { name } = req.params;
    if (!isAppKey(name)) return reply.code(404).send({ error: "not_found" });
    await clearKey(name, req.user!.id);
    return { ok: true };
  });

  // One paste for the Art store's values (Georges, 2026-10-27): placed by shape and label, saved in the page's order;
  // a Blob address left in the override is cleared with them, so the new bucket is read at once. No value is echoed.
  app.post("/api/settings/keys/paste", writes, async (req) => {
    const { values, unplaced } = parseKeyPaste(pasteInput.parse(req.body).text);
    const saved: PasteKeyName[] = [];
    const skipped: { name: PasteKeyName; reason: string }[] = [];
    for (const name of PASTE_ORDER) {
      const value = values[name];
      if (!value) continue;
      const result = await setKey(name, value, req.user!.id);
      if (result === "saved") saved.push(name);
      else skipped.push({ name, reason: result });
    }
    let overrideCleared = false;
    if (saved.includes("R2_PUBLIC_URL") && /\.public\.blob\.vercel-storage\.com\//.test(await readKey("ASSET_BASE"))) {
      await clearKey("ASSET_BASE", req.user!.id);
      overrideCleared = true;
    }
    return { saved, skipped, unplaced, overrideCleared };
  });
}

const pasteInput = z.object({ text: z.string().max(20_000) });
const PASTE_ORDER: PasteKeyName[] = ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_URL", "CF_ANALYTICS_TOKEN"];
