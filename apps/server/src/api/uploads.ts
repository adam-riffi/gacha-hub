import type { FastifyInstance } from "fastify";
import { requireUser } from "../auth/plugin.js";
import { IMAGE_TYPES, storeImage } from "../lib/images.js";

/**
 * Accept an image upload and return its URL. Uses Vercel Blob when
 * BLOB_READ_WRITE_TOKEN is set (serverless has no persistent disk); otherwise
 * writes to the local upload directory served by the always-on server.
 */
export async function registerUploadRoutes(app: FastifyInstance) {
  app.post(
    "/api/uploads",
    { preHandler: requireUser, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "no_file" });

    if (!IMAGE_TYPES.has(data.mimetype)) return reply.code(415).send({ error: "unsupported_type" });

    const fileBuffer = await data.toBuffer();
    if (data.file.truncated) return reply.code(413).send({ error: "file_too_large" });

    return { url: await storeImage(fileBuffer, data.mimetype) };
    },
  );
}
