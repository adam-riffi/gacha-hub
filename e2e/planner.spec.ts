import { expect, test } from "@playwright/test";

test("Planner: goals, their materials with have, need and missing, all goals, farm today @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
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
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  // The smoke journey adds Genshin through the Games page, so this one removes its profile.
  try {
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
  } finally {
    await page.request.delete(`/api/instances/${id}`);
  }
});

// Georges, round 4: "the tasks features like linking should also be available on the game planner screen".
test("Planner: each goal is the Tasks goal card: priority, notify, its plan, Link to another goal @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  for (const catalogId of ["1005", "1102"]) {
    expect((await page.request.post(`/api/instances/${id}/plans/generate`, { data: { kind: "character", catalogId, level: { from: 1, to: 30 } } })).ok()).toBe(true);
  }
  await page.goto(`/games/${id}/planner`);
  const goals = page.getByRole("region", { name: "Goals" });
  const seele = goals.getByRole("article", { name: /Farm Seele/ }).first();
  await expect(seele.getByRole("checkbox", { name: "Notify" })).toBeVisible();
  await expect(seele.getByRole("group", { name: "Priority" }).getByRole("button", { name: "Normal" })).toBeVisible();
  // A click opens the goal and picks it for the materials.
  await seele.getByRole("button", { name: /Farm Seele/ }).click();
  await expect(page.getByRole("region", { name: /^Materials/ })).toContainText("Farm Seele");
  await expect(seele.getByRole("list", { name: "Plan" })).toContainText("Lv");

  // Link Seele's goal under Kafka's (round 6): Seele's keeps its card, and its steps add to Kafka's.
  const kafka = goals.getByRole("article", { name: /Farm Kafka/ }).first();
  const steps = async (card: typeof kafka) => (await card.locator(".tk-prog .mn").first().textContent())!.split("/").map((s) => Number(s.trim()));
  const [, kafkaTotal] = await steps(kafka);
  const [, seeleTotal] = await steps(seele);
  await kafka.getByRole("button", { name: /Farm Kafka/ }).click();
  await seele.getByRole("combobox", { name: "Link to" }).fill("Kafka");
  await seele.getByRole("option", { name: /Kafka/ }).first().click();
  await expect(seele).toBeVisible();
  await expect.poll(async () => (await steps(kafka))[1]).toBe(kafkaTotal! + seeleTotal!);
  await expect(kafka.getByRole("list", { name: "Linked goals" })).toContainText("Farm Seele");

  const tasks = (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as { id: string; title: string }[];
  for (const t of tasks.filter((x) => x.title === "Farm Seele")) await page.request.delete(`/api/tasks/${t.id}`);
});

// Georges, round 6: "the planner screen is hard to read and gets crooked when opening a goal: the inner cards go over the outer cards
// into the background, and I get the information twice; I should be able to filter and sort goals; two rows of goals, and the
// materials a bit shorter without squishing them".
test("Planner: goals in rows of three, two rows until All; filtered and sorted; an open goal stays in its card, its materials once @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Seven characters no other journey plans.
  const names = ["March 7th", "Himeko", "Welt", "Silver Wolf", "Arlan", "Asta", "Herta"];
  for (const catalogId of ["1001", "1003", "1004", "1006", "1008", "1009", "1013"]) {
    expect((await page.request.post(`/api/instances/${id}/plans/generate`, { data: { kind: "character", catalogId, level: { from: 1, to: 30 } } })).ok()).toBe(true);
  }
  try {
    await page.goto(`/games/${id}/planner`);
    const goals = page.getByRole("region", { name: "Goals" });
    const cards = goals.getByRole("article");
    // Two rows of three, then All.
    await expect(cards).toHaveCount(6);
    const [a, c, d] = [(await cards.nth(0).boundingBox())!, (await cards.nth(2).boundingBox())!, (await cards.nth(3).boundingBox())!];
    expect(Math.abs(a.y - c.y)).toBeLessThan(2);
    expect(d.y).toBeGreaterThan(a.y + a.height - 2);
    const all = goals.getByRole("button", { name: /^All \d+ goals$/ });
    const count = Number((await all.textContent())!.replace(/\D/g, ""));
    await all.click();
    await expect(cards).toHaveCount(count);

    // Sorted by name, then filtered.
    await goals.getByRole("group", { name: "Sort" }).getByRole("button", { name: "Name" }).click();
    const titles = await cards.locator(".tk-title strong").allTextContents();
    expect(titles).toEqual([...titles].sort((x, y) => x.localeCompare(y)));
    await goals.getByRole("searchbox", { name: "Filter goals" }).fill("Asta");
    await expect(cards).toHaveCount(1);

    // Open, it shows its plan, inside its card and the page; its materials only in the Materials table.
    const asta = cards.first();
    await asta.getByRole("button", { name: /Farm Asta/ }).click();
    await expect(asta.getByRole("list", { name: "Plan" })).toBeVisible();
    await expect(asta.getByRole("spinbutton")).toHaveCount(0);
    await expect(page.getByRole("region", { name: /^Materials/ }).getByRole("spinbutton").first()).toBeVisible();
    const [card, grid] = [(await asta.boundingBox())!, (await goals.boundingBox())!];
    expect(card.x + card.width).toBeLessThanOrEqual(grid.x + grid.width + 1);
    expect(await asta.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

    // The materials beside Farm today, no taller than the screen.
    const [mats, today] = [(await page.getByRole("region", { name: /^Materials/ }).boundingBox())!, (await page.getByRole("region", { name: /^Farm today/ }).boundingBox())!];
    expect(Math.abs(mats.y - today.y)).toBeLessThan(2);
    expect(mats.height).toBeLessThanOrEqual(640);
  } finally {
    const tasks = (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as { id: string; title: string }[];
    for (const t of tasks.filter((x) => names.some((n) => x.title === `Farm ${n}`))) await page.request.delete(`/api/tasks/${t.id}`);
  }
});

// Making a goal streamlined (Georges, round 6): the Planner's New goal is the quick build, for any character.
test("Planner: New goal opens the quick build, for any character @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/planner`);
    const goals = page.getByRole("region", { name: "Goals" });
    await goals.getByRole("button", { name: "New goal" }).click();
    const quick = page.getByRole("dialog", { name: "Quick build goal" });
    await quick.getByRole("combobox", { name: "Character" }).fill("Welt");
    await page.getByRole("option", { name: /^Welt/ }).click();
    await quick.getByRole("button", { name: "Make goal" }).click();
    await goals.getByRole("searchbox", { name: "Filter goals" }).fill("Welt");
    await expect(goals.getByRole("article", { name: "Farm Welt" })).toBeVisible();
  } finally {
    const tasks = (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as { id: string; title: string; materialId: string | null }[];
    for (const t of tasks.filter((x) => x.title === "Farm Welt" && !x.materialId)) await page.request.delete(`/api/tasks/${t.id}`);
  }
});
