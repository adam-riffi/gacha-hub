// Vercel serverless entrypoint. Delegates every /api/* request to the bundled
// Fastify app produced by scripts/build-server-bundle.mjs during
// `npm run vercel-build` (see vercel.json rewrites).
// Must stay `.mjs`: Vercel compiles `.ts` here to CommonJS, which can't
// require() the ESM bundle (ERR_REQUIRE_ESM), and it ignores `.mts` entries.
export { handler as default } from "../dist-server/index.js";
