import { expect, test, type Page } from "@playwright/test";

/** Every copy this profile holds removed, whatever other journeys did. */
async function clearCopies(page: Page, id: string) {
  for (const w of (await (await page.request.get(`/api/instances/${id}/weapons`)).json()) as { id: string }[]) await page.request.delete(`/api/instances/${id}/weapons/${w.id}`);
}

// Each copy its own card (Georges, 2026-10-11: "dupes of the weapons as separate entries … make them cards, not a list, like the characters").
test("Weapons: every copy its own card with its level and refinement and who wields it; a weapon's panel adds copies, wishlists and farms @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc: { level: 80, lightCone: { catalogId: "23006", name: "Patience Is All You Need", level: 80, superimposition: 2 } } } })).json()) as { id: string };
  await page.request.put(`/api/characters/${build.id}`, { data: { isDefault: true } });
  await clearCopies(page, id);
  await page.request.put(`/api/instances/${id}/wishlist`, { data: { kind: "weapon", catalogId: "23006", wished: false } });

  await page.goto(`/games/${id}/characters`);
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Weapons" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/weapons$`));
  await page.getByRole("searchbox", { name: "Search" }).fill("Patience");
  const grid = page.getByRole("region", { name: "Weapons" });
  const cards = grid.getByRole("article", { name: "Patience Is All You Need" });

  // Not owned yet: one card, which opens the weapon's panel.
  await expect(cards).toHaveCount(1);
  await cards.click();
  const panel = page.getByRole("complementary", { name: "Patience Is All You Need" });
  await panel.getByRole("button", { name: "Add a copy" }).click();
  await panel.getByRole("button", { name: "Add a copy" }).click();
  await expect(cards).toHaveCount(2);

  const first = panel.getByRole("group", { name: "Copy 1" });
  await first.getByRole("spinbutton", { name: "Level" }).fill("80");
  await first.getByRole("spinbutton", { name: "Level" }).blur();
  await first.getByRole("spinbutton", { name: "Superimposition" }).fill("3");
  await first.getByRole("spinbutton", { name: "Superimposition" }).blur();
  await expect(cards.first()).toContainText("Lv 80 · S3");
  // Kafka wields one: her icon on the first copy's card.
  await expect(cards.first().getByRole("img", { name: "Kafka" })).toBeVisible();

  await panel.getByRole("button", { name: "Wishlist" }).click();
  await expect(panel.getByRole("button", { name: "Wishlist" })).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("button", { name: "Farm" }).click();
  await expect(page.getByRole("region", { name: "Farm Patience Is All You Need" })).toBeVisible();

  await panel.getByRole("group", { name: "Copy 2" }).getByRole("button", { name: "Remove" }).click();
  await expect(cards).toHaveCount(1);

  // Equipment's old link lands on Characters.
  await page.goto(`/games/${id}/equipment`);
  await expect(page).toHaveURL(new RegExp(`/games/${id}/characters$`));
});

// Every game has a weapon catalog since round 4 (NTE's Arcs, Endfield's weapons); a game scaffolded by game:new adds weapons by name until imported.
test("Weapons on every game: NTE's Arcs and Endfield's weapons from their catalogs @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "endfield" } })).json()) as { id: string };
  await clearCopies(page, id);

  await page.goto(`/games/${id}/characters`);
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Weapons" }).click();
  await expect(page.getByRole("region", { name: "Weapons" }).getByRole("article", { name: "Exemplar" })).toBeVisible();

  // NTE's Arcs come from its catalog.
  const nte = (await (await page.request.post("/api/instances", { data: { gameKey: "nte" } })).json()) as { id: string };
  await page.goto(`/games/${nte.id}/weapons`);
  await expect(page.getByRole("region", { name: "Weapons" }).getByRole("article", { name: "Eternal Waltz" })).toBeVisible();
});
