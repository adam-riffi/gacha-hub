import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { nodeFileTrace } from "@vercel/nft";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));

// Vercel picks the function's files by tracing api/index.mjs with @vercel/nft,
// minus the function's excludeFiles, and type-checks every .ts file the trace
// reaches with default options.
describe("Vercel function trace", () => {
  it("ships only the entry, the server bundle and its runtime dependencies", async () => {
    execFileSync(process.execPath, ["scripts/build-server-bundle.mjs"], {
      cwd: root,
      stdio: "ignore",
    });
    const vercel = JSON.parse(readFileSync(`${root}vercel.json`, "utf8"));
    const { fileList } = await nodeFileTrace([`${root}api/index.mjs`], {
      base: root,
      processCwd: root,
      ts: true,
      mixedModules: true,
      ignore: vercel.functions["api/index.mjs"].excludeFiles,
    });
    const unexpected = [...fileList].filter(
      (f) => !/^(api|dist-server|node_modules)[\\/]/.test(f) || /(?<!\.d)\.[cm]?tsx?$/.test(f),
    );
    expect(unexpected.slice(0, 10)).toEqual([]);
  }, 120_000);
});
