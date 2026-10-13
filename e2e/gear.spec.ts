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
    await page.getByRole("group", { name: "Show" }).getByRole("button", { name: "Sets" }).click();
    const set = page.getByRole("article", { name: "Musketeer of Wild Wheat" });
    await set.getByRole("button", { name: "Open Musketeer of Wild Wheat" }).click();
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
    await expect(set).toContainText(/[1-4] \/ 4/);
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
    await page.getByRole("group", { name: "Show" }).getByRole("button", { name: "Sets" }).click();
    const set = page.getByRole("article").first();
    const name = (await set.getAttribute("aria-label"))!;
    await set.getByRole("button", { name: `Open ${name}` }).click();
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
  const bag = (await (await page.request.post(`/api/instances/${id}/gear`, { data: { setName: "Musketeer of Wild Wheat", slot: "head", mainStat: "HP", level: 15 } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/gear`);
    const pieces = page.getByRole("region", { name: "Pieces" });
    const body = pieces.getByRole("article", { name: "Hunter of Glacial Forest · Body" }).filter({ hasText: "+12" });
    await expect(body).toContainText("CRIT Rate");
    await expect(body).toContainText("SPD");
    await expect(body.getByRole("img", { name: "Pela" })).toBeVisible();
    const head = pieces.getByRole("article", { name: "Musketeer of Wild Wheat · Head" }).filter({ hasText: "+15" });
    await expect(head).toContainText("Bag");

    const filters = page.getByRole("region", { name: "Filters" });
    await filters.getByRole("group", { name: "Slot" }).getByRole("button", { name: "Body" }).click();
    await expect(head).toHaveCount(0);
    await expect(body).toBeVisible();
    await filters.getByRole("group", { name: "Slot" }).getByRole("button", { name: "Body" }).click();
    await filters.getByRole("group", { name: "Where" }).getByRole("button", { name: "Bag" }).click();
    await expect(body).toHaveCount(0);
    await expect(head).toBeVisible();
    await filters.getByRole("group", { name: "Where" }).getByRole("button", { name: "Bag" }).click();
    await filters.getByRole("group", { name: "Main stat" }).getByRole("button", { name: "CRIT Rate" }).click();
    await expect(body).toBeVisible();
    await expect(head).toHaveCount(0);
    await filters.getByRole("group", { name: "Main stat" }).getByRole("button", { name: "CRIT Rate" }).click();
    await filters.getByRole("combobox", { name: "Set" }).fill("Musketeer");
    await page.getByRole("option", { name: /^Musketeer of Wild Wheat/ }).click();
    await expect(head).toBeVisible();
    await expect(body).toHaveCount(0);
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
    await page.request.delete(`/api/gear/${bag.id}`);
  }
});
