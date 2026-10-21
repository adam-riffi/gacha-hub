import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets a second checkout run its journeys beside this one's (each has its own database file).
const PORT = Number(process.env.E2E_PORT ?? 3100);

/** Smoke journeys against the built app on a throwaway SQLite database (DESIGN.md §10). */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // The app has one desktop layout from 1440 px (round 8): the journeys see it at that width, without a sideways scroll.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `http://localhost:${PORT}/api/me`,
    env: { PORT: String(PORT) },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
