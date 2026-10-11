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
    const set = page.getByRole("article", { name: "Musketeer of Wild Wheat" });
    await set.getByRole("button", { name: "Open Musketeer of Wild Wheat" }).click();
    const panel = page.getByRole("complementary", { name: "Musketeer of Wild Wheat" });
    await expect(panel.getByRole("listitem", { name: "Head" })).toContainText("—");

    const add = panel.getByRole("form", { name: "Add a piece" });
    await add.getByLabel("Slot").selectOption({ label: "Head" });
    await add.getByLabel("Level").fill("15");
    await add.getByRole("button", { name: "Add" }).click();
    const head = panel.getByRole("listitem", { name: "Head" });
    await expect(head).toContainText("bag");
    await expect(head).toContainText("+15");

    await head.getByRole("combobox", { name: "Equip on" }).selectOption({ label: "Seele" });
    await expect(head.getByRole("link", { name: /Seele/ })).toBeVisible();
    await expect(set).toContainText("1 / 4");
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
