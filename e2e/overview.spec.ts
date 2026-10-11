import { expect, test } from "@playwright/test";

const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

// Each game's hub opens on its own Overview (Georges's designs, 2026-10-11).
test("a game's hub opens on its Overview: pulls, pity and banners at a glance, each opening its screen @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/stellarJade`, { data: { value: 1600 } });
  await page.request.put(`/api/instances/${id}/currencies/specialPass`, { data: { value: 3 } });
  await page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-overview", name: "E2E overview warp", kind: "character", startsAt: iso(-1), endsAt: iso(20) }] } });

  await page.goto(`/games/${id}`);
  const tabs = page.getByRole("navigation", { name: "Game screens" }).getByRole("link");
  await expect(tabs.first()).toHaveText(/overview/i);
  await expect(tabs.first()).toHaveAttribute("aria-current", "page");

  // 1,600 Stellar Jade make 10 warps, and 3 passes: 13.
  const pulls = page.getByRole("region", { name: "Pulls" });
  await expect(pulls.getByTestId("pulls-total")).toHaveText("13");
  await expect(pulls).toContainText("From Stellar Jade");
  await expect(page.getByRole("region", { name: "Pity" })).toContainText("/90");
  await expect(page.getByRole("region", { name: "Banners" })).toContainText("ends in");

  await pulls.getByRole("link", { name: "Pulls" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/pulls$`));
});

test("the Overview's second row: today's dailies ticked in place, the pass and the weeklies, stamina with its reserve @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/battery`, { data: { value: 120 } });

  await page.goto(`/games/${id}`);
  // A daily ticked on the card stays ticked; another journey may have ticked it, so this one flips it and back.
  const scratch = page.getByRole("region", { name: "Today" }).getByRole("checkbox", { name: "Scratch Card" });
  const was = await scratch.isChecked();
  await scratch.click();
  await expect(scratch).toBeChecked({ checked: !was });
  await page.reload();
  await expect(page.getByRole("region", { name: "Today" }).getByRole("checkbox", { name: "Scratch Card" })).toBeChecked({ checked: !was });
  await page.getByRole("region", { name: "Today" }).getByRole("checkbox", { name: "Scratch Card" }).click();

  await expect(page.getByRole("region", { name: /New Eridu City Fund and weekly/ })).toContainText("Level");
  const stamina = page.getByRole("region", { name: "Battery Charge" });
  await expect(stamina.getByTestId("stamina")).toHaveText("120 / 240");
  await expect(stamina).toContainText("Backup Battery Charge");
});

test("the Overview's third row: builds in progress with level, skills, weapon and gear, and the endgame cycle @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1102", doc: { level: 70, lightCone: { level: 60 } } } })).json()) as { id: string };
  await page.request.put(`/api/characters/${build.id}`, { data: { buildStatus: "building" } });

  // This cycle's Memory of Chaos, typed on the Endgame tab.
  await page.goto(`/games/${id}/endgame`);
  const moc = page.getByRole("region", { name: "Memory of Chaos" });
  await moc.getByRole("button", { name: "Update Memory of Chaos" }).click();
  await moc.getByLabel("Stars", { exact: true }).fill("30");
  await moc.getByRole("button", { name: "Save" }).click();
  await expect(moc).toContainText("30 / 36");

  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Overview" }).click();
  const seele = page.getByRole("region", { name: "Builds in progress" }).getByRole("row", { name: /Seele/ });
  await expect(seele.getByRole("cell").nth(1)).toHaveText("70");
  await expect(seele.getByRole("cell").nth(3)).toHaveText("60");
  await expect(page.getByRole("region", { name: "Endgame · cycle" }).getByRole("row", { name: /Memory of Chaos/ })).toContainText("30/36");
  await page.request.delete(`/api/characters/${build.id}`);
});

test("the Overview's last row: each goal's progress and their average, and the open goals over ten days @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "wuwa" } })).json()) as { id: string };
  const goal = (await (await page.request.post("/api/tasks", { data: { scope: "game", refId: id, type: "goal", title: "E2E overview goal", target: 10 } })).json()) as { id: string };
  await page.request.post(`/api/tasks/${goal.id}/progress`, { data: { progress: 4 } });

  await page.goto(`/games/${id}`);
  const goals = page.getByRole("region", { name: "Goals" });
  await expect(goals.getByRole("row", { name: /E2E overview goal/ })).toContainText("40%");
  await expect(goals.getByRole("img", { name: /% done on average/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Backlog" }).getByTestId("open")).toHaveText(/^\d+$/);
  await page.request.delete(`/api/tasks/${goal.id}`);
});

// Each game's own card (Georges's designs, 2026-10-11): NTE's city, Endfield's AIC and outposts.
test("the Overview's own card: NTE's city, its City Stamina capped by the Tycoon Level; Endfield's AIC and outposts @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const nte = (await (await page.request.post("/api/instances", { data: { gameKey: "nte" } })).json()) as { id: string };

  await page.goto(`/games/${nte.id}`);
  const city = page.getByRole("region", { name: "City" });
  await city.getByRole("spinbutton", { name: "Tycoon Level" }).fill("23");
  await city.getByRole("spinbutton", { name: "Tycoon Level" }).blur();
  await expect(city.getByTestId("cityStamina-cap")).toHaveText("/ 700");
  // A profile made before the card adds its daily from it.
  const cafe = city.getByRole("checkbox", { name: "Café income" });
  if (!(await cafe.count())) await city.getByRole("button", { name: "Add Café income" }).click();
  await expect(city.getByRole("checkbox", { name: "Café income" })).toBeVisible();

  const endfield = (await (await page.request.post("/api/instances", { data: { gameKey: "endfield" } })).json()) as { id: string };
  await page.goto(`/games/${endfield.id}`);
  const aic = page.getByRole("region", { name: "AIC and outposts" });
  await expect(aic.getByRole("spinbutton", { name: "Stock Bills" })).toBeVisible();
});

// Counted dailies (Georges's designs: "Engagement ▮▮▮▯"): a box per step, ticked up to the one clicked.
test("the Overview counts a daily's steps in boxes, kept after a reload @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  const tasks = (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as { id: string; title: string }[];
  const daily = tasks.find((t) => t.title === "Daily Missions")!;
  await page.request.post(`/api/tasks/${daily.id}/progress`, { data: { progress: 0 } });

  await page.goto(`/games/${id}`);
  const steps = page.getByRole("region", { name: "Today" }).getByRole("group", { name: "Daily Missions" });
  await expect(steps.getByRole("button")).toHaveCount(4);
  await steps.getByRole("button", { name: "3 of 4" }).click();
  await expect(steps.getByRole("button", { name: "3 of 4" })).toHaveAttribute("aria-pressed", "true");
  await expect(steps.getByRole("button", { name: "4 of 4" })).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByRole("region", { name: "Today" }).getByRole("group", { name: "Daily Missions" }).getByRole("button", { name: "2 of 4" })).toHaveAttribute("aria-pressed", "true");
  await page.request.post(`/api/tasks/${daily.id}/progress`, { data: { progress: 0 } });
});
