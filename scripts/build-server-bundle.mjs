// Bundle the Fastify app into one ESM file for the Vercel serverless function
// (api/index.ts imports it). Bundling avoids TypeScript-in-node_modules issues
// with the workspace package; Prisma stays external so its engine is traced.
import { mkdirSync, writeFileSync } from "node:fs";
import { build } from "esbuild";

const outdir = "dist-server";

await build({
  entryPoints: ["apps/server/src/serverless.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: `${outdir}/index.js`,
  external: ["@prisma/client", ".prisma/client", "@vercel/blob"],
  // CommonJS deps (fastify plugins etc.) need `require` inside an ESM bundle.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  sourcemap: false,
  logLevel: "info",
});

// Mark the output as ESM so Node/Vercel never have to guess the module type.
mkdirSync(outdir, { recursive: true });
writeFileSync(`${outdir}/package.json`, JSON.stringify({ type: "module" }, null, 2) + "\n");
