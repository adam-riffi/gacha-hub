import { expect, test } from "@playwright/test";

// Round 29 (Georges, 2026-10-31, on the navigation mockup: "let's go with that"): the four roster lists (characters, teams,
// weapons, the gear sets) are one screen in the top bar, Roster, with a switch inside; the switch keeps the list when the
// side bar moves to another game.
test("the roster is one screen with a switch for its four lists @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const zzz = ((await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string }).id;

  await page.goto(`/games/${id}`);
  const screens = page.getByRole("navigation", { name: "Game screens" });
  await expect(screens.getByRole("link", { name: "Roster" })).toBeVisible();
  for (const name of ["Characters", "Teams", "Weapons", "Relics"]) await expect(screens.getByRole("link", { name, exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Roster" })).toHaveCount(0);

  await screens.getByRole("link", { name: "Roster" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/characters$`));
  const roster = page.getByRole("navigation", { name: "Roster" });
  await expect(roster.getByRole("link")).toHaveText(["Characters", "Teams", "Weapons", "Relics"]);
  await expect(roster.getByRole("link", { name: "Characters" })).toHaveAttribute("aria-current", "page");
  await expect(screens.getByRole("link", { name: "Roster" })).toHaveAttribute("aria-current", "page");

  await roster.getByRole("link", { name: "Weapons" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/weapons$`));
  await expect(roster.getByRole("link", { name: "Weapons" })).toHaveAttribute("aria-current", "page");
  await expect(screens.getByRole("link", { name: "Roster" })).toHaveAttribute("aria-current", "page");

  // Another game from the side bar keeps the list (round 4).
  await page.getByRole("navigation", { name: "Scope" }).getByRole("link", { name: "Zenless Zone Zero" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${zzz}/weapons$`));
  await expect(page.getByRole("navigation", { name: "Roster" }).getByRole("link", { name: "Weapons" })).toHaveAttribute("aria-current", "page");
});
