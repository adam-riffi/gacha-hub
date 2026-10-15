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

    // Equip on: a name typed, then picked (2026-10-15).
    await head.getByRole("combobox", { name: "Equip on" }).fill("Seele");
    await page.getByRole("option", { name: /^Seele/ }).click();
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

    // The sets from a window, with their icons, several at once (round 10: "filters might not be suited for all of the different sets").
    await filters.getByRole("button", { name: /^Pick sets/ }).click();
    const win = page.getByRole("dialog", { name: "Pick sets" });
    await expect(win.getByRole("button", { name: "Musketeer of Wild Wheat", exact: true }).getByRole("img")).toBeVisible();
    await win.getByRole("button", { name: "Musketeer of Wild Wheat", exact: true }).click();
    await expect(head).toBeVisible();
    await expect(body).toHaveCount(0);
    await win.getByRole("button", { name: "Hunter of Glacial Forest", exact: true }).click();
    await expect(head).toBeVisible();
    await expect(body).toBeVisible();
    await win.getByRole("button", { name: "Close" }).click();
    await expect(win).toHaveCount(0);
    // The picked sets stay in the filters, each with its own remove.
    await expect(filters.getByRole("button", { name: "Remove Musketeer of Wild Wheat" })).toBeVisible();
    await where.getByRole("button", { name: /^Bag/ }).click();
    await expect(body).toHaveCount(0);
    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(filters.getByRole("button", { name: "Remove Musketeer of Wild Wheat" })).toHaveCount(0);
    await expect(where.getByRole("button", { name: /^Bag/ })).toHaveAttribute("aria-pressed", "false");
    await expect(head).toBeVisible();
    await expect(body).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset filters" })).toBeDisabled();

    // Its substats in the chosen piece's column (round 10), in their fields (2026-10-15).
    await body.getByRole("button", { name: "Show Hunter of Glacial Forest · Body" }).click();
    await expect(page.getByRole("region", { name: "Chosen piece" }).getByRole("combobox", { name: "Substat 1" })).toHaveValue("SPD");

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
    // Its substats in their fields, to type in place (2026-10-15).
    await expect(column.getByRole("combobox", { name: "Substat 1" })).toHaveValue("SPD");
    await expect(column).toContainText("2pc");
    await expect(column.getByRole("link", { name: /Luka/ })).toBeVisible();

    // To the bag, then on Luka again, from the column.
    await column.getByRole("button", { name: "To bag" }).click();
    await expect(tile()).toContainText("Bag");
    await tile().getByRole("button", { name: "Show Hunter of Glacial Forest · Body" }).click();
    await column.getByRole("combobox", { name: "Equip on" }).fill("Luka");
    await page.getByRole("option", { name: /^Luka/ }).click();
    await expect(tile().getByRole("img", { name: "Luka" })).toBeVisible();
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
    const bag = (await (await page.request.get(`/api/instances/${id}/gear`)).json()) as { id: string; setName: string; level: number }[];
    for (const p of bag.filter((x) => x.setName === "Hunter of Glacial Forest" && x.level === 14)) await page.request.delete(`/api/gear/${p.id}`);
  }
});

// Georges, round 10, on version A: "filters might not be suited for all of the different sets".
test("Gear: the filters fit each game's gear: sets from a window in the game's kinds, slots where they have types, the main stats you have @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Tingyun, whom no other journey builds, in a Genius body; a Pan-Cosmic sphere in the bag.
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1202" } })).json()) as { id: string };
  await page.request.put(`/api/characters/${build.id}`, { data: { doc: { relics: { body: { setName: "Genius of Brilliant Stars", mainStat: "CRIT DMG", level: 11 } }, traces: {}, lightCone: {}, stats: {} } } });
  const sphere = (await (await page.request.post(`/api/instances/${id}/gear`, { data: { setName: "Pan-Cosmic Commercial Enterprise", slot: "sphere", mainStat: "Wind DMG Boost", level: 7 } })).json()) as { id: string };
  // The main stats on the pieces you have, all of them or one slot's.
  const mains = async (slot?: string) => {
    const builds = (await (await page.request.get(`/api/instances/${id}/characters`)).json()) as { doc: { relics?: Record<string, { mainStat?: string; setName?: string }> } }[];
    const bag = (await (await page.request.get(`/api/instances/${id}/gear`)).json()) as { slot: string; mainStat?: string }[];
    const all = [...builds.flatMap((b) => Object.entries(b.doc.relics ?? {}).filter(([, p]) => p?.setName).map(([s, p]) => [s, p.mainStat])), ...bag.map((p) => [p.slot, p.mainStat])];
    return [...new Set(all.filter(([s, m]) => m && (!slot || s === slot)).map(([, m]) => m!))].sort();
  };
  try {
    await page.goto(`/games/${id}/gear`);
    const filters = page.getByRole("region", { name: "Filters" });
    const mainGroup = filters.getByRole("group", { name: "Main stat" });
    await expect(mainGroup.getByRole("button", { name: "Wind DMG Boost" })).toBeVisible();
    expect((await mainGroup.getByRole("button").allTextContents()).map((t) => t.trim()).sort()).toEqual(await mains());
    // A slot picked: that slot's main stats only.
    await filters.getByRole("group", { name: "Slot" }).getByRole("button", { name: "Body" }).click();
    await expect(mainGroup.getByRole("button", { name: "Wind DMG Boost" })).toHaveCount(0);
    expect((await mainGroup.getByRole("button").allTextContents()).map((t) => t.trim()).sort()).toEqual(await mains("body"));
    await page.getByRole("button", { name: "Reset filters" }).click();

    // The window: the sets you hold first, each with its count; every set, in Star Rail's two kinds; a search.
    await filters.getByRole("button", { name: /^Pick sets/ }).click();
    const win = page.getByRole("dialog", { name: "Pick sets" });
    await expect(win.getByRole("button", { name: "Genius of Brilliant Stars", exact: true })).toBeVisible();
    await expect(win.getByText("none yet")).toHaveCount(0);
    await win.getByRole("button", { name: /^All \d+/ }).click();
    await expect(win.getByText("none yet").first()).toBeVisible();
    await expect(win.getByRole("group", { name: "Head · Hands · Body · Feet" }).getByRole("button", { name: "Genius of Brilliant Stars", exact: true })).toBeVisible();
    const planar = win.getByRole("group", { name: "Planar Sphere · Link Rope" });
    await expect(planar.getByRole("button", { name: "Pan-Cosmic Commercial Enterprise", exact: true })).toBeVisible();
    await win.getByRole("searchbox", { name: "Search a set" }).fill("Pan-Cosmic");
    await expect(win.getByRole("button", { name: "Genius of Brilliant Stars", exact: true })).toHaveCount(0);
    await planar.getByRole("button", { name: "Pan-Cosmic Commercial Enterprise", exact: true }).click();
    await win.getByRole("button", { name: /^Show \d+ piece/ }).click();
    await expect(win).toHaveCount(0);
    const pieces = page.getByRole("region", { name: "Pieces" });
    await expect(pieces.getByRole("article", { name: "Pan-Cosmic Commercial Enterprise · Planar Sphere" }).filter({ hasText: "+7" })).toBeVisible();
    await expect(pieces.getByRole("article", { name: "Genius of Brilliant Stars · Body" })).toHaveCount(0);

    // Wuthering Waves' echoes have no slot types: no Slot filter there.
    const wuwa = (await (await page.request.post("/api/instances", { data: { gameKey: "wuwa" } })).json()) as { id: string };
    await page.goto(`/games/${wuwa.id}/gear`);
    await expect(filters.getByRole("button", { name: /^Pick sets/ })).toBeVisible();
    await expect(filters.getByRole("group", { name: "Slot" })).toHaveCount(0);
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
    await page.request.delete(`/api/gear/${sphere.id}`);
  }
});

// Georges, 2026-10-15: "cant type substats in my gear" and "the quick equip thing ... only propose me 2 random characters
// ... and doesn't even list all of my own characters. i should be able to choose or type the name". Fu Xuan and Bailu:
// characters no other journey owns or builds.
test("Gear: a piece's substats typed in place, in the bag and on a build; Equip on lists every character you own, a build made where none is @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
  const id = created.ok()
    ? ((await created.json()) as { id: string }).id
    : ((await (await page.request.get("/api/instances")).json()) as { id: string; gameKey: string }[]).find((instance) => instance.gameKey === "hsr")!.id;
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1208", owned: true }] } });
  const bailu = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1211" } })).json()) as { id: string };
  const piece = (await (await page.request.post(`/api/instances/${id}/gear`, { data: { setName: "Musketeer of Wild Wheat", slot: "hands", mainStat: "ATK", level: 9 } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/gear`);
    const pieces = page.getByRole("region", { name: "Pieces" });
    const column = page.getByRole("region", { name: "Chosen piece" });
    const tile = () => pieces.getByRole("article", { name: "Musketeer of Wild Wheat · Hands" }).filter({ hasText: "+9" });
    const typeSubstat = async (row: number, stat: string, value: string) => {
      await column.getByRole("combobox", { name: `Substat ${row}` }).fill(stat);
      await page.getByRole("option", { name: stat, exact: true }).click();
      const field = column.getByLabel(`Substat ${row} value`);
      await field.fill(value);
      await field.press("Tab");
    };

    // In the bag: two substats typed, the crit value follows, and they stay after a reload.
    await tile().getByRole("button", { name: "Show Musketeer of Wild Wheat · Hands" }).click();
    await typeSubstat(1, "CRIT Rate", "10.5");
    await typeSubstat(2, "CRIT DMG", "21");
    await expect(column.locator(".gb-col-cv")).toContainText("42");
    await page.reload();
    await tile().getByRole("button", { name: "Show Musketeer of Wild Wheat · Hands" }).click();
    await expect(column.getByLabel("Substat 1 value")).toHaveValue("10.5");
    await expect(column.getByRole("combobox", { name: "Substat 2" })).toHaveValue("CRIT DMG");

    // Equip on: every character you own, typed or picked; Fu Xuan has no build yet, so one is made.
    const equipOn = column.getByRole("combobox", { name: "Equip on" });
    await equipOn.fill("Bai");
    await expect(page.getByRole("option", { name: /^Bailu/ })).toBeVisible();
    await equipOn.fill("Fu Xu");
    await page.getByRole("option", { name: /^Fu Xuan/ }).click();
    await expect(tile().getByRole("img", { name: "Fu Xuan" })).toBeVisible();

    // On Fu Xuan's build now: a third substat typed there stays too.
    await tile().getByRole("button", { name: "Show Musketeer of Wild Wheat · Hands" }).click();
    await typeSubstat(3, "SPD", "4");
    await page.reload();
    await tile().getByRole("button", { name: "Show Musketeer of Wild Wheat · Hands" }).click();
    await expect(column.getByLabel("Substat 3 value")).toHaveValue("4");
    await expect(column.getByLabel("Substat 1 value")).toHaveValue("10.5");
  } finally {
    const builds = (await (await page.request.get(`/api/instances/${id}/characters`)).json()) as { id: string; catalogId: string | null }[];
    for (const build of builds.filter((candidate) => candidate.catalogId === "1208" || candidate.id === bailu.id)) await page.request.delete(`/api/characters/${build.id}`);
    await page.request.delete(`/api/gear/${piece.id}`);
    await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1208", owned: false }, { kind: "character", catalogId: "1211", owned: false }] } });
  }
});
