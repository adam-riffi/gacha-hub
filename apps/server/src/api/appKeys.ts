import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin } from "../auth/plugin.js";
import { clearKey, isAppKey, listKeys, setKey } from "../lib/appKeys.js";

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
}
