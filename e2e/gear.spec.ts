import { expect, test } from "@playwright/test";

// Georges, round 4: one gear screen for every game. Each set as a card; a click shows the pieces you
// have of it (on whom, or in the bag); Farm picks the pieces you need and makes a goal, a step per piece.
test("Gear: a set's pieces by slot, on a build or in the bag; one added and equipped @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1102" } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/gear`);
    await page.getByRole("combobox", { name: "Open a set" }).fill("Musketeer");
    await page.getByRole("option", { name: /^Musketeer of Wild Wheat/ }).click();
    const panel = page.getByRole("complementary", { name: "Musketeer of Wild Wheat" });
    // Other journeys' builds may wear this set already: this one checks its own piece.
    await expect(panel.getByRole("listitem", { name: "Head" })).not.toContainText("bag");

    const add = panel.getByRole("form", { name: "Add a piece" });
    await add.getByLabel("Slot").selectOption({ label: "Head" });
    await add.getByLabel("Level").fill("15");
    await add.getByRole("button", { name: "Add" }).click();
    const head = panel.getByRole("listitem", { name: "Head" });
    await expect(head).toContainText("bag");
    await expect(head).toContainText("+15");

    await head.getByRole("combobox", { name: "Equip on" }).selectOption({ label: "Seele" });
    await expect(head.getByRole("link", { name: /Seele/ })).toBeVisible();
    await expect(head).not.toContainText("bag");
    // Its card among the pieces: the set's icon, Head, and Seele wearing it.
    const card = page.getByRole("region", { name: "Pieces" }).getByRole("article", { name: "Musketeer of Wild Wheat · Head" }).filter({ has: page.getByRole("img", { name: "Seele" }) });
    await expect(card.getByRole("img", { name: "Musketeer of Wild Wheat" })).toBeVisible();
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
    for (const p of (await (await page.request.get(`/api/instances/${id}/gear`)).json()) as { id: string }[]) await page.request.delete(`/api/gear/${p.id}`);
  }
});

test("Gear: Farm picks the pieces you need from a set and makes a goal, a step per piece, on every game @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  for (const [gameKey, unwanted] of [["wuwa", ["Echo 3", "Echo 4", "Echo 5"]], ["zzz", ["Slot 3", "Slot 4", "Slot 5", "Slot 6"]]] as const) {
    const { id } = (await (await page.request.post("/api/instances", { data: { gameKey } })).json()) as { id: string };
    await page.goto(`/games/${id}/gear`);
    await page.getByRole("combobox", { name: "Open a set" }).click();
    const first = page.getByRole("listbox", { name: "Open a set" }).getByRole("option").first();
    const name = (await first.textContent())!.trim();
    await first.click();
    const panel = page.getByRole("complementary", { name });
    await panel.getByRole("button", { name: "Farm" }).click();
    const pick = panel.getByRole("group", { name: "Pieces to farm" });
    for (const label of unwanted) await pick.getByRole("checkbox", { name: label }).uncheck();
    await pick.getByRole("button", { name: "Make goal" }).click();
    await expect(page.getByText("Goal made")).toBeVisible();

    const tasks = (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as { id: string; title: string; type: string; items: { label: string }[] | null; origin: { kind: string } | null }[];
    const goal = tasks.find((t) => t.title === `Farm ${name}`)!;
    expect(goal.type).toBe("checklist");
    expect(goal.origin?.kind).toBe("gear");
    expect(goal.items?.length).toBe(2);
    await page.request.delete(`/api/tasks/${goal.id}`);
  }
  // The old Equipment tab stays gone.
  await expect(page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Equipment" })).toHaveCount(0);
});

// Every piece you have, filtered in the game's words (Georges, round 6: "I can't even look at my pieces; make it show all the
// pieces I have, then filter by set, main stat and type for each game depending on their system").
test("Gear: every piece you have, on a build or in the bag, filtered by set, slot, main stat and where @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Pela, whom no other journey builds, in a Hunter body; a Musketeer head in the bag.
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1106" } })).json()) as { id: string };
  await page.request.put(`/api/characters/${build.id}`, { data: { doc: { relics: { body: { setName: "Hunter of Glacial Forest", mainStat: "CRIT Rate", level: 12, substats: [{ stat: "SPD", value: 4 }] } }, traces: {}, lightCone: {}, stats: {} } } });
  const bag = (await (await page.request.post(`/api/instances/${id}/gear`, { data: { setName: "Musketeer of Wild Wheat", slot: "head", mainStat: "HP", level: 13 } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/gear`);
    const pieces = page.getByRole("region", { name: "Pieces" });
    const body = pieces.getByRole("article", { name: "Hunter of Glacial Forest · Body" }).filter({ hasText: "+12" });
    await expect(body).toContainText("CRIT Rate");
    await expect(body.getByRole("img", { name: "Pela" })).toBeVisible();
    // Other journeys equip Musketeer heads too: this one is the bag's +13.
    const head = pieces.getByRole("article", { name: "Musketeer of Wild Wheat · Head" }).filter({ hasText: "Bag" }).filter({ hasText: "+13" });
    await expect(head).toBeVisible();

    // Each piece shows its set's icon and its type (round 9: "I see the set icon and the type of piece + its stats").
    await expect(body.getByRole("img", { name: "Hunter of Glacial Forest" })).toBeVisible();
    await expect(body).toContainText("Body");

    // Filtered the way the characters are (round 9): chips in the filters, where as counts, one Reset.
    const filters = page.getByRole("region", { name: "Filters" });
    const where = page.getByRole("group", { name: "Where" });
    await filters.getByRole("group", { name: "Slot" }).getByRole("button", { name: "Body" }).click();
    await expect(head).toHaveCount(0);
    await expect(body).toBeVisible();
    await filters.getByRole("group", { name: "Slot" }).getByRole("button", { name: "Body" }).click();
    await where.getByRole("button", { name: /^Bag/ }).click();
    await expect(body).toHaveCount(0);
    await expect(head).toBeVisible();
    await where.getByRole("button", { name: /^Bag/ }).click();
    await filters.getByRole("group", { name: "Main stat" }).getByRole("button", { name: "CRIT Rate" }).click();
    await expect(body).toBeVisible();
    await expect(head).toHaveCount(0);
    await filters.getByRole("group", { name: "Main stat" }).getByRole("button", { name: "CRIT Rate" }).click();

    // The sets as chips with their icons, several at once.
    const sets = filters.getByRole("group", { name: "Set" });
    await expect(sets.getByRole("button", { name: "Musketeer of Wild Wheat" }).getByRole("img")).toBeVisible();
    await sets.getByRole("button", { name: "Musketeer of Wild Wheat" }).click();
    await expect(head).toBeVisible();
    await expect(body).toHaveCount(0);
    await sets.getByRole("button", { name: "Hunter of Glacial Forest" }).click();
    await expect(head).toBeVisible();
    await expect(body).toBeVisible();
    await where.getByRole("button", { name: /^Bag/ }).click();
    await expect(body).toHaveCount(0);
    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(sets.getByRole("button", { name: "Musketeer of Wild Wheat" })).toHaveAttribute("aria-pressed", "false");
    await expect(where.getByRole("button", { name: /^Bag/ })).toHaveAttribute("aria-pressed", "false");
    await expect(head).toBeVisible();
    await expect(body).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset filters" })).toBeDisabled();

    // Its substats in the chosen piece's column (round 10).
    await body.getByRole("button", { name: "Show Hunter of Glacial Forest · Body" }).click();
    await expect(page.getByRole("region", { name: "Chosen piece" })).toContainText("SPD");

    // The search reads sets, stats and wearers.
    await filters.getByRole("searchbox", { name: "Search" }).fill("Pela");
    await expect(body).toBeVisible();
    await expect(head).toHaveCount(0);
    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(filters.getByRole("searchbox", { name: "Search" })).toHaveValue("");
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
    await page.request.delete(`/api/gear/${bag.id}`);
  }
});

// Georges, round 7: "where can I create gear pieces that I have in a vacuum? … the artifact screen is a mess, I can barely read it; the sets
// part is even worse, the window opening and moving everything".
test("Gear: a piece added from the pieces, its card readable with its set's and stats' icons; a set opens over the page without moving it @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/gear`);
    await page.getByRole("button", { name: "Add a piece" }).click();
    const form = page.getByRole("form", { name: "New piece" });
    await form.getByRole("combobox", { name: "Piece set" }).fill("Musketeer");
    await page.getByRole("option", { name: /^Musketeer of Wild Wheat/ }).click();
    await form.getByLabel("Slot").selectOption({ label: "Body" });
    await form.getByLabel("Main stat").selectOption("CRIT Rate");
    await form.getByLabel("Level").fill("9");
    await form.getByRole("button", { name: "Add", exact: true }).click();
    const piece = page.getByRole("region", { name: "Pieces" }).getByRole("article", { name: "Musketeer of Wild Wheat · Body" }).filter({ hasText: "+9" });
    await expect(piece).toContainText("Bag");
    // Its set's icon on the piece itself (round 9).
    await expect.poll(async () => (await piece.getByRole("img", { name: "Musketeer of Wild Wheat" }).boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(48);
    await expect(piece.locator("svg.stat-icon[data-stat=critRate]")).toBeVisible();

    // The set over the page, from its piece's column: the cards stay where they were.
    const first = page.getByRole("region", { name: "Pieces" }).getByRole("article").first();
    const before = (await first.boundingBox())!;
    await piece.getByRole("button", { name: "Show Musketeer of Wild Wheat · Body" }).click();
    await page.getByRole("region", { name: "Chosen piece" }).getByRole("button", { name: "Open the set" }).click();
    const panel = page.getByRole("complementary", { name: "Musketeer of Wild Wheat" });
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
    const after = (await first.boundingBox())!;
    expect([after.x, after.width]).toEqual([before.x, before.width]);
  } finally {
    const bag = (await (await page.request.get(`/api/instances/${id}/gear`)).json()) as { id: string; setName: string; slot: string; level: number }[];
    for (const p of bag.filter((x) => x.setName === "Musketeer of Wild Wheat" && x.slot === "body" && x.level === 9)) await page.request.delete(`/api/gear/${p.id}`);
  }
});

// Georges, round 10, picking version A of four: "this one" (a bag of tiles like the games' own, the filters on the left, the chosen piece in full on the right).
test("Gear: every piece a tile with its art; the chosen piece in full beside them, sent to the bag and equipped from there @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Luka, whom no other journey builds, in a Hunter body.
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1111" } })).json()) as { id: string };
  await page.request.put(`/api/characters/${build.id}`, { data: { doc: { relics: { body: { setName: "Hunter of Glacial Forest", mainStat: "CRIT DMG", level: 14, substats: [{ stat: "SPD", value: 5 }, { stat: "CRIT Rate", value: 6.2 }] } }, traces: {}, lightCone: {}, stats: {} } } });
  try {
    await page.goto(`/games/${id}/gear`);
    const pieces = page.getByRole("region", { name: "Pieces" });
    const tile = () => pieces.getByRole("article", { name: "Hunter of Glacial Forest · Body" }).filter({ hasText: "+14" });
    // The tile: the piece's art, large; its level, its wearer, its main stat and its type.
    await expect.poll(async () => (await tile().getByRole("img", { name: "Hunter of Glacial Forest" }).boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(80);
    await expect(tile().getByRole("img", { name: "Luka" })).toBeVisible();
    await expect(tile()).toContainText("CRIT DMG");
    await expect(tile()).toContainText("Body");

    // The filters on the left, the tiles, the chosen piece on the right.
    const filters = (await page.getByRole("region", { name: "Filters" }).boundingBox())!;
    const grid = (await pieces.boundingBox())!;
    const column = page.getByRole("region", { name: "Chosen piece" });
    expect(filters.x + filters.width).toBeLessThanOrEqual(grid.x);
    expect(grid.x + grid.width).toBeLessThanOrEqual((await column.boundingBox())!.x);

    // Chosen: its set, type and level, its main stat and substats, the set's bonuses, its wearer.
    await tile().getByRole("button", { name: "Show Hunter of Glacial Forest · Body" }).click();
    await expect(tile()).toHaveAttribute("aria-current", "true");
    await expect(column.getByRole("heading", { name: "Hunter of Glacial Forest" })).toBeVisible();
    await expect(column).toContainText("Body · +14");
    await expect(column).toContainText("CRIT DMG");
    await expect(column).toContainText("SPD");
    await expect(column).toContainText("2pc");
    await expect(column.getByRole("link", { name: /Luka/ })).toBeVisible();

    // To the bag, then on Luka again, from the column.
    await column.getByRole("button", { name: "To bag" }).click();
    await expect(tile()).toContainText("Bag");
    await tile().getByRole("button", { name: "Show Hunter of Glacial Forest · Body" }).click();
    await column.getByRole("combobox", { name: "Equip on" }).selectOption({ label: "Luka" });
    await expect(tile().getByRole("img", { name: "Luka" })).toBeVisible();
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
    const bag = (await (await page.request.get(`/api/instances/${id}/gear`)).json()) as { id: string; setName: string; level: number }[];
    for (const p of bag.filter((x) => x.setName === "Hunter of Glacial Forest" && x.level === 14)) await page.request.delete(`/api/gear/${p.id}`);
  }
});
