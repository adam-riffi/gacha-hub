import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@gacha/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Point env at the throwaway SQLite DB before any test module loads.
    setupFiles: ["src/test/env.ts"],
    // Integration tests share one sqlite file and reset it per test, so run
    // test files one at a time to avoid cross-file write races.
    fileParallelism: false,
  },
});
