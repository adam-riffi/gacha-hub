import { expect, test } from "@playwright/test";

test("Planner: goals, their materials with have, need and missing, all goals, farm today @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const plan = await page.request.post(`/api/instances/${id}/plans/generate`, { data: { kind: "character", catalogId: "1005", level: { from: 1, to: 50 } } });
  expect(plan.ok()).toBe(true);

  await page.goto(`/games/${id}/planner`);
  await expect(page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Planner" })).toHaveAttribute("aria-current", "page");
  const goals = page.getByRole("region", { name: "Goals" });
  await goals.getByRole("button", { name: /Farm Kafka/ }).click();
  const materials = page.getByRole("region", { name: /^Materials/ });
  await expect(materials).toContainText("Farm Kafka");
  const first = materials.getByRole("row").nth(1);
  // The name from its field: the cell also holds the icon.
  const name = (await first.getByRole("spinbutton").getAttribute("aria-label"))!.replace(/ on hand$/, "");
  const need = Number((await first.getByTestId("need").textContent())!.replace(/\D/g, ""));
  await first.getByRole("spinbutton", { name: `${name} on hand` }).fill(String(need));
  await first.getByRole("spinbutton", { name: `${name} on hand` }).blur();
  await expect(materials.getByRole("row", { name: new RegExp(name) }).getByTestId("missing")).toHaveText("✓");

  await materials.getByRole("group", { name: "Materials for" }).getByRole("button", { name: "All goals" }).click();
  await expect(materials).toContainText("All goals");
  await expect(page.getByRole("region", { name: /^Farm today/ })).toBeVisible();
});

test("Planner: a material's farm days written out (Wed Sat), each goal and material with its icon @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  // Lisa's talents: Teachings of Ballad open Wednesday and Saturday (and Sunday, which opens every domain).
  const plan = await page.request.post(`/api/instances/${id}/plans/generate`, { data: { kind: "character", catalogId: "10000006", talents: { normal: { from: 1, to: 2 } } } });
  expect(plan.ok()).toBe(true);

  await page.goto(`/games/${id}/planner`);
  const goals = page.getByRole("region", { name: "Goals" });
  await goals.getByRole("button", { name: /Farm Lisa/ }).click();
  await expect(goals.getByRole("button", { name: /Farm Lisa/ }).getByRole("img", { name: "Lisa" })).toBeVisible();
  const materials = page.getByRole("region", { name: /^Materials/ });
  const book = materials.getByRole("row", { name: /Teachings of Ballad/ });
  await expect(book.getByRole("img", { name: "Teachings of Ballad" })).toBeVisible();
  await expect(book.getByTestId("days")).toHaveText("Wed Sat");
});
