import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const vercel = JSON.parse(readFileSync(new URL("../../../../vercel.json", import.meta.url), "utf8")) as { git?: { deploymentEnabled?: unknown } };

describe("deployments (Georges, 2026-10-10: deploy only at his command or a milestone)", () => {
  it("start from no Git push: main and every other branch merge without deploying", () => {
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });
});
