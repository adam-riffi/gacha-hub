// Vercel serverless entrypoint. Delegates every /api/* request to the bundled
// Fastify app produced by scripts/build-server-bundle.mjs during
// `npm run vercel-build` (see vercel.json rewrites).
// Must stay `.mts`: Vercel compiles `.ts` here to CommonJS, which can't
// require() the ESM bundle (ERR_REQUIRE_ESM on every request).
import type { IncomingMessage, ServerResponse } from "node:http";
// @ts-ignore — built at deploy time into dist-server/ (gitignored).
import { handler } from "../dist-server/index.js";

export default function vercelHandler(req: IncomingMessage, res: ServerResponse) {
  return handler(req, res);
}
