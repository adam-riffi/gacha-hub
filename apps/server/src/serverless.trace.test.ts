import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { nodeFileTrace } from "@vercel/nft";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));

// Vercel picks the function's files by tracing api/index.mjs with @vercel/nft,
// and type-checks every .ts file the trace reaches with default options.
describe("Vercel function trace", () => {
  it("ships only the entry, the server bundle and its runtime dependencies", async () => {
    execFileSync(process.execPath, ["scripts/build-server-bundle.mjs"], {
      cwd: root,
      stdio: "ignore",
    });
    const { fileList } = await nodeFileTrace([`${root}api/index.mjs`], {
      base: root,
      processCwd: root,
      ts: true,
      mixedModules: true,
    });
    const unexpected = [...fileList].filter(
      (f) => !/^(api|dist-server|node_modules)[\\/]/.test(f) || /(?<!\.d)\.[cm]?tsx?$/.test(f),
    );
    expect(unexpected.slice(0, 10)).toEqual([]);
  }, 120_000);
});
