import { expect, test } from "@playwright/test";

test("a game's Endgame tab: this cycle's rewards, a card per mode to type results in, upcoming resets @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "zzz" } });
  const { id } = (await created.json()) as { id: string };

  await page.goto(`/games/${id}`);
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Endgame" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/endgame$`));

  const assault = page.getByRole("region", { name: "Deadly Assault" });
  await assault.getByRole("button", { name: "Update Deadly Assault" }).click();
  await assault.getByLabel("Stars", { exact: true }).fill("6");
  await assault.getByLabel("Polychrome", { exact: true }).fill("200");
  await assault.getByRole("button", { name: "Save" }).click();
  await expect(assault).toContainText("6 / 9");
  await expect(assault).toContainText("200 / 300");

  // This cycle adds up what the open cycles offer: 780 + 300.
  const thisCycle = page.getByRole("region", { name: "This cycle" });
  await expect(thisCycle).toContainText("/ 1,080");
  const remind = thisCycle.getByRole("checkbox", { name: "Remind me 24 h before a reset with rewards left" });
  await remind.check();
  await page.reload();
  await expect(page.getByRole("region", { name: "This cycle" }).getByRole("checkbox", { name: /Remind me 24 h/ })).toBeChecked();
  const upcoming = page.getByRole("region", { name: "Upcoming resets" });
  for (const mode of ["Shiyu Defense", "Deadly Assault"]) await expect(upcoming).toContainText(mode);

  // Activities shows the result too.
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Activities" }).click();
  await expect(page.getByRole("region", { name: "Cycles" })).toContainText("6 / 9");
});

test("Endgame holds the teams: a team made here lists its members @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1005", owned: true }] } });

  await page.goto(`/games/${id}/endgame`);
  const teams = page.getByRole("region", { name: "Teams" });
  await teams.getByRole("textbox", { name: "New team name" }).fill("E2E DoT team");
  await teams.getByRole("button", { name: "+ Team" }).click();
  await expect(teams).toContainText("E2E DoT team");
  await teams.getByRole("combobox", { name: "Add a member to E2E DoT team" }).selectOption({ label: "Kafka" });
  await expect(teams).toContainText("Kafka");
});
