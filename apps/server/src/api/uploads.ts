import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { requireUser } from "../auth/plugin.js";

const ALLOWED = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

/** Accept an image upload (portrait/icon) and return its served URL. */
export async function registerUploadRoutes(app: FastifyInstance) {
  app.post("/api/uploads", { preHandler: requireUser }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "no_file" });

    const ext = ALLOWED.get(data.mimetype);
    if (!ext) return reply.code(415).send({ error: "unsupported_type" });

    const buf = await data.toBuffer();
    if (data.file.truncated) {
      return reply.code(413).send({ error: "file_too_large" });
    }

    const name = randomBytes(16).toString("hex") + ext;
    await mkdir(config.uploadDir, { recursive: true });
    await writeFile(resolve(config.uploadDir, name), buf);
    return { url: `/uploads/${name}` };
  });
}
