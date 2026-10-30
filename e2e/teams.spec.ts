import { expect, test } from "@playwright/test";

test("Teams: a tab of its own to make, fill, rename and delete teams; the sheet's Used in adds to one @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
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

// Each game's party size, and ZZZ's Bangboo (Georges, round 6: "adapt the teams layout to any games, some use 3 some use 4; add Bangboos to ZZZ").
test("Teams: the slots in the game's party size; a ZZZ team's Bangboo @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  const team = (await (await page.request.post(`/api/instances/${id}/teams`, { data: { name: "E2E Bangboo team", members: [] } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/teams`);
    const card = page.getByRole("region", { name: "E2E Bangboo team" });
    const columns = await card.locator(".tm-slots").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(3);
    await card.getByRole("combobox", { name: "Bangboo of E2E Bangboo team" }).fill("Penguin");
    await page.getByRole("option", { name: /^Penguinboo/ }).click();
    await expect(card.locator(".tm-companion").getByRole("img", { name: "Penguinboo" })).toBeVisible();
    await expect.poll(async () => ((await (await page.request.get(`/api/instances/${id}/teams`)).json()) as { id: string; companion: string | null }[]).find((t) => t.id === team.id)?.companion).toBe("53001");
  } finally {
    await page.request.delete(`/api/instances/${id}/teams/${team.id}`);
  }
});

// Round 26 (Georges, 2026-10-30: "for the teams i need bigger character icons, i only need to see the characters, and
// their weapons and their sets, nothing more"): a member is its face at 88 px or more, under it its weapon and the sets
// its gear completes, each with its size; no status words.
test("Teams: a member is its face, its weapon and its sets, nothing more @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Arlan, whom no other journey builds, with a 4-star cone and two pieces of one set.
  const doc = { level: 70, lightCone: { catalogId: "21012", name: "A Secret Vow", level: 70, superimposition: 1 }, relics: { head: { setName: "Hunter of Glacial Forest" }, body: { setName: "Hunter of Glacial Forest" } } };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1008", doc } })).json()) as { id: string };
  const team = (await (await page.request.post(`/api/instances/${id}/teams`, { data: { name: "E2E gear team", members: ["1008"] } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/teams`);
    const slot = page.getByRole("region", { name: "E2E gear team" }).locator(".tm-slot").first();
    const face = slot.getByRole("img", { name: "Arlan" });
    await expect(face).toBeVisible();
    expect((await face.boundingBox())!.width).toBeGreaterThanOrEqual(88);
    await expect(slot.getByRole("img", { name: "A Secret Vow" })).toBeVisible();
    await expect(slot.getByRole("img", { name: "Hunter of Glacial Forest" })).toBeVisible();
    await expect(slot.locator(".ch-set-icon b")).toHaveText("2");
    await expect(slot).not.toContainText(/unbuilt|no build|not owned|perfect|good|building|arlan/i);
    // The face opens the build.
    await slot.getByRole("link", { name: "Arlan" }).click();
    await expect(page).toHaveURL(new RegExp(`/characters/${build.id}$`));
  } finally {
    await page.request.delete(`/api/instances/${id}/teams/${team.id}`);
    await page.request.delete(`/api/characters/${build.id}`);
  }
});
