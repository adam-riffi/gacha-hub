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

  // Kafka's sheet names it: that is a copy, at her sheet's Lv 80 S2 (round 6: every sheet's weapon is a copy). One card, which opens the weapon's panel.
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Lv 80 · S2");
  await cards.click();
  const panel = page.getByRole("complementary", { name: "Patience Is All You Need" });
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
  // Larger cards (Georges, round 7: "very small cards that are hard to identify their rarity and see the character icons"):
  // the art at least 88 px, the rarity as a band in its colour, the wielder at least 36 px.
  expect((await cards.first().getByRole("img", { name: "Patience Is All You Need" }).boundingBox())!.width).toBeGreaterThanOrEqual(88);
  await expect(cards.first().locator(".wp-rarity")).toHaveAttribute("data-rarity", "5");
  expect(await cards.first().locator(".wp-rarity").evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  expect((await cards.first().getByRole("img", { name: "Kafka" }).boundingBox())!.width).toBeGreaterThanOrEqual(36);

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

// The weapons and the characters synced (Georges, round 5: "check if I have the extra weapon copy and ask me if I either want to
// take it from a character or create a separate instance of the weapon shared between different builds or add a copy").
test("Weapons and characters synced: a build holds a copy; a held one is taken, shared or added @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await clearCopies(page, id);
  // Three The Hunt characters no other journey builds, and one Arrows at Lv 50, S2.
  const build = async (catalogId: string) => ((await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId } })).json()) as { id: string }).id;
  const [sushang, yanqing, danHeng] = [await build("1206"), await build("1209"), await build("1002")];
  await page.request.post(`/api/instances/${id}/weapons`, { data: { catalogId: "20000", level: 50, refinement: 2 } });
  const cone = async (b: string) => ((await (await page.request.get(`/api/characters/${b}`)).json()) as { doc: { lightCone?: { copyId?: string; level?: number; superimposition?: number } } }).doc.lightCone ?? {};
  const pickArrows = async () => {
    const card = page.getByRole("region", { name: "Weapon" });
    await card.getByRole("combobox", { name: "Weapon name" }).fill("Arrows");
    await page.getByRole("option", { name: /^Arrows/ }).click();
    return card;
  };

  // A free copy is taken as it is: its level and superimposition come with it.
  await page.goto(`/characters/${sushang}`);
  let card = await pickArrows();
  await expect(card.getByLabel("Level")).toHaveValue("50");
  await page.getByRole("button", { name: "Save" }).click();
  await expect.poll(async () => (await cone(sushang)).copyId).toBeTruthy();

  // The only copy is held: asked, and shared.
  await page.goto(`/characters/${yanqing}`);
  card = await pickArrows();
  const ask = card.getByRole("group", { name: "Which Arrows" });
  await expect(ask).toContainText("Sushang");
  await ask.getByRole("button", { name: "Share Sushang's" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect.poll(async () => (await cone(yanqing)).copyId).toBe((await cone(sushang)).copyId);

  // A level typed on Weapons reaches every build holding the copy.
  await page.goto(`/games/${id}/weapons`);
  await page.getByRole("article", { name: "Arrows" }).first().click();
  const panel = page.getByRole("complementary", { name: "Arrows" });
  await panel.getByRole("spinbutton", { name: "Level" }).fill("60");
  await panel.getByRole("spinbutton", { name: "Level" }).blur();
  await expect.poll(async () => [(await cone(sushang)).level, (await cone(yanqing)).level]).toEqual([60, 60]);
  await expect(page.getByRole("article", { name: "Arrows" }).first().getByRole("img", { name: "Yanqing" })).toBeVisible();

  // A copy added for a third, then one taken from a character.
  await page.goto(`/characters/${danHeng}`);
  card = await pickArrows();
  await card.getByRole("group", { name: "Which Arrows" }).getByRole("button", { name: "Add a copy" }).click();
  // The prompt closes once the new copy is on the sheet.
  await expect(card.getByRole("group", { name: "Which Arrows" })).toHaveCount(0);
  await page.getByRole("button", { name: "Save" }).click();
  await expect.poll(async () => (await cone(danHeng)).copyId).toBeTruthy();
  await expect.poll(async () => ((await (await page.request.get(`/api/instances/${id}/weapons`)).json()) as { catalogId: string }[]).filter((w) => w.catalogId === "20000").length).toBe(2);
  await page.goto(`/characters/${yanqing}`);
  await expect(page.getByRole("region", { name: "Weapon" }).getByLabel("Level")).toHaveValue("60");
  card = await pickArrows();
  await card.getByRole("group", { name: "Which Arrows" }).getByRole("button", { name: "Take it from Dan Heng" }).click();
  await expect(card.getByRole("group", { name: "Which Arrows" })).toHaveCount(0);
  await page.getByRole("button", { name: "Save" }).click();
  await expect.poll(async () => (await cone(danHeng)).copyId).toBeUndefined();
  await clearCopies(page, id);
});

// Every window closes on a click outside it (Georges, round 6).
test("Weapons: a weapon's panel closes on a click outside it @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto(`/games/${id}/weapons`);
  await page.getByRole("searchbox", { name: "Search" }).fill("Arrows");
  await page.getByRole("region", { name: "Weapons" }).getByRole("article", { name: "Arrows" }).first().click();
  await expect(page.getByRole("complementary", { name: "Arrows" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search" }).click();
  await expect(page.getByRole("complementary", { name: "Arrows" })).toHaveCount(0);
});

// Several at once, and the main stat as a filter (Georges, round 6: "I should be able to select multiple to do some change
// like mass modify level or ownership; also filter by main stat").
test("Weapons: several copies changed at once, level and ownership; the main stat as a filter @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  await clearCopies(page, id);
  // Two Steel Cushions (CRIT Rate).
  for (let i = 0; i < 2; i++) await page.request.post(`/api/instances/${id}/weapons`, { data: { catalogId: "14102" } });
  await page.goto(`/games/${id}/weapons`);
  const grid = page.getByRole("region", { name: "Weapons" });

  await page.getByRole("group", { name: "Main stat" }).getByRole("button", { name: "CRIT Rate" }).click();
  await expect(grid.getByRole("article").first()).toContainText("CRIT Rate");

  await page.getByRole("button", { name: "Select", exact: true }).click();
  const cushions = grid.getByRole("article", { name: "Steel Cushion" });
  await cushions.nth(0).click();
  await cushions.nth(1).click();
  const selection = page.getByRole("region", { name: "Selection" });
  await expect(selection).toContainText("2 selected");
  await selection.getByRole("spinbutton", { name: "Level" }).fill("50");
  await selection.getByRole("button", { name: "Set level" }).click();
  await expect.poll(async () => ((await (await page.request.get(`/api/instances/${id}/weapons`)).json()) as { level: number }[]).map((w) => w.level)).toEqual([50, 50]);
  await selection.getByRole("button", { name: "Remove", exact: true }).click();
  await expect.poll(async () => ((await (await page.request.get(`/api/instances/${id}/weapons`)).json()) as unknown[]).length).toBe(0);
});

// A window of big weapons on the sheet (Georges, round 7: "I'd rather have a window open with all of my weapons in big
// with their level, refinement, name, rarity and an info i that I can click on to read the effect").
test("Weapons on the sheet: a window of my copies first, then the rest; each with its effect; one picked @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await clearCopies(page, id);
  await page.request.post(`/api/instances/${id}/weapons`, { data: { catalogId: "23006", level: 70, refinement: 3 } });
  const sampo = ((await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1108" } })).json()) as { id: string }).id;

  await page.goto(`/characters/${sampo}`);
  await page.getByRole("region", { name: "Weapon" }).getByRole("button", { name: "Choose weapon" }).click();
  const box = page.getByRole("dialog", { name: "Choose weapon" });
  const mine = box.getByRole("region", { name: "Mine" }).getByRole("article", { name: "Patience Is All You Need" });
  await expect(mine).toContainText("Lv 70");
  await expect(mine).toContainText("S3");
  expect((await mine.getByRole("img").first().boundingBox())!.width).toBeGreaterThanOrEqual(80);
  // Its effect at its superimposition: S3's 32%.
  await mine.getByRole("button", { name: "Patience Is All You Need: effect" }).click();
  await expect(mine.getByRole("note")).toContainText("Spider Web");
  await expect(mine.getByRole("note")).toContainText("by 32%");
  // The path's other cones follow, those not held.
  await expect(box.getByRole("region", { name: "All" }).getByRole("article", { name: "Before the Tutorial Mission Starts" })).toBeVisible();
  await expect(box.getByRole("region", { name: "All" }).getByRole("article", { name: "Patience Is All You Need" })).toHaveCount(0);

  await mine.getByRole("button", { name: "Equip Patience Is All You Need" }).click();
  await expect(box).toHaveCount(0);
  const card = page.getByRole("region", { name: "Weapon" });
  await expect(card.getByRole("combobox", { name: "Weapon name" })).toHaveValue("Patience Is All You Need");
  await expect(card.getByLabel("Level")).toHaveValue("70");
  await clearCopies(page, id);
});
