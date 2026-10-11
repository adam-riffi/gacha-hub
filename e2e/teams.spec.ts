import { expect, test } from "@playwright/test";

test("Teams: a tab of its own to make, fill, rename and delete teams; the sheet's Used in adds to one @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1005", owned: true }] } });

  // The hub has a Teams tab (Georges, 2026-10-10: "no obvious way to make teams").
  await page.goto(`/games/${id}/characters`);
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Teams" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/teams$`));

  await page.getByRole("textbox", { name: "New team name" }).fill("E2E Teams tab");
  await page.getByRole("button", { name: "Create team" }).click();
  const team = page.getByRole("region", { name: "E2E Teams tab" });
  await team.getByRole("combobox", { name: "Add a member to E2E Teams tab" }).fill("Kaf");
  await team.getByRole("option", { name: "Kafka" }).click();
  await expect(team.getByRole("link", { name: "Kafka" })).toBeVisible();

  await team.getByRole("textbox", { name: "Team name" }).fill("E2E Teams renamed");
  await team.getByRole("textbox", { name: "Team name" }).blur();
  const renamed = page.getByRole("region", { name: "E2E Teams renamed" });
  await expect(renamed).toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await renamed.getByRole("button", { name: "Delete team" }).click();
  await expect(renamed).toHaveCount(0);

  // The sheet's Used in adds the character to a team, and links to the tab.
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005" } })).json()) as { id: string };
  await page.request.post(`/api/instances/${id}/teams`, { data: { name: "E2E Sheet team", members: [] } });
  await page.goto(`/characters/${build.id}`);
  const usedIn = page.getByRole("region", { name: "Used in" });
  await usedIn.getByRole("combobox", { name: "Add to a team" }).selectOption({ label: "E2E Sheet team" });
  await expect(usedIn.getByRole("link", { name: "E2E Sheet team" })).toBeVisible();
  await expect(usedIn.getByRole("link", { name: "Manage teams →" })).toBeVisible();
});
