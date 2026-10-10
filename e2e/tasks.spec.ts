import { expect, test } from "@playwright/test";

const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

test("Tasks: farm today, goals with their steps, filtering, and an event goal claimed from its card @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const parent = (await (await page.request.post("/api/tasks", { data: { scope: "game", refId: id, type: "goal", title: "Farm Asta" } })).json()) as { id: string };
  await page.request.post("/api/tasks", { data: { scope: "game", refId: id, type: "goal", title: "Farm Lifeless Blade", target: 5, materialId: "110112", parentId: parent.id } });
  await page.request.post("/api/admin/payload", {
    data: {
      kind: "events",
      gameKey: "hsr",
      items: [{ key: "e2e-tasks", name: "E2E tasks reward", startsAt: iso(-1), endsAt: iso(5), effects: [{ kind: "unit.copy", unit: "character", catalogId: "1013", count: 1 }, { kind: "goal.create", title: "Stages", stages: ["Stage 1", "Stage 2"] }] }],
    },
  });
  const events = (await (await page.request.get("/api/games/hsr/events")).json()) as { id: string; key: string }[];
  await page.request.post(`/api/events/${events.find((e) => e.key === "e2e-tasks")!.id}/goal`, { data: { instanceId: id } });

  await page.goto("/tasks?game=hsr");
  await expect(page.getByRole("heading", { name: "Tasks and reminders" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Farm today" }).getByText("Star Rail · materials for Asta (any day)")).toBeVisible();

  const goals = page.getByRole("region", { name: "Goals" });
  const event = goals.getByRole("article", { name: "E2E tasks reward" });
  await expect(event).toContainText("when done: Herta new → E0");
  await event.getByRole("button", { name: "Expand" }).click();
  await event.getByRole("checkbox", { name: "Stage 1" }).check();
  await expect(event).toContainText("1 / 2");
  await event.getByRole("button", { name: "Claim" }).click();
  await expect(event).toContainText("Claimed");
  const owned = (await (await page.request.get(`/api/instances/${id}/ownership`)).json()) as { catalogId: string }[];
  expect(owned.some((o) => o.catalogId === "1013")).toBe(true);

  const farm = goals.getByRole("article", { name: "Farm Asta" });
  await farm.getByRole("button", { name: "Expand" }).click();
  await expect(farm.getByText("Lifeless Blade")).toBeVisible();
  await expect(farm).toContainText("0 / 5");

  await page.getByRole("textbox", { name: "Filter" }).fill("Asta");
  await expect(farm).toBeVisible();
  await expect(event).toHaveCount(0);
});
