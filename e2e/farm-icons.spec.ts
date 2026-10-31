import { expect, test } from "@playwright/test";

// Round 24 (Georges, 2026-10-29: "planner as main icons too small"): a Farm today chip is the unit it is for, large; the
// planner's goal cards carry a big unit icon. Round 28 ("the uncollapsing decollapsing thing for the all game task view is
// weird"): its materials stand beside it at once; nothing folds, nothing to click.
test("Farm today shows the unit large with its materials at once; the planner's goals carry a big unit icon @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Seele, whom no other journey plans at this level.
  expect((await page.request.post(`/api/instances/${id}/plans/generate`, { data: { kind: "character", catalogId: "1102", level: { from: 1, to: 40 } } })).ok()).toBe(true);
  try {
    await page.goto("/tasks?game=hsr");
    const farm = page.getByRole("region", { name: "Farm today" });
    const chip = farm.locator(".tk-chip", { has: page.getByRole("img", { name: "Seele" }) }).first();
    await expect(chip).toBeVisible();
    expect((await chip.getByRole("img", { name: "Seele" }).boundingBox())!.width, "the unit large").toBeGreaterThanOrEqual(56);
    await expect(chip.locator(".mat-icons .gicon").first()).toBeVisible();
    await expect(farm.getByRole("button", { name: /Seele/ })).toHaveCount(0);

    await page.goto(`/games/${id}/planner`);
    const card = page.getByRole("region", { name: "Goals" }).getByRole("article", { name: "Farm Seele" }).first();
    await expect(card).toBeVisible();
    expect((await card.getByRole("img", { name: "Seele" }).first().boundingBox())!.width, "a big unit icon").toBeGreaterThanOrEqual(64);
  } finally {
    const tasks = (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as { id: string; title: string }[];
    for (const task of tasks.filter((candidate) => candidate.title === "Farm Seele")) await page.request.delete(`/api/tasks/${task.id}`);
  }
});
