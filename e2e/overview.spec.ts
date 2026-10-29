import { expect, test } from "@playwright/test";

const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

// Home with a game picked is that game's dashboard (Georges's designs, 2026-10-11; on Home since round 4).
test("Home with a game picked shows its dashboard: pulls, pity and banners at a glance, each opening its screen @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/stellarJade`, { data: { value: 1600 } });
  await page.request.put(`/api/instances/${id}/currencies/specialPass`, { data: { value: 3 } });
  await page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-overview", name: "E2E overview warp", kind: "character", startsAt: iso(-1), endsAt: iso(20) }] } });

  await page.goto("/?game=hsr");
  await expect(page.getByRole("navigation", { name: "Scope" }).getByRole("link", { name: "Honkai: Star Rail" })).toHaveAttribute("aria-current", "page");

  // 1,600 Stellar Jade make 10 warps, and 3 passes: 13.
  const pulls = page.getByRole("region", { name: "Pulls" });
  await expect(pulls.getByTestId("pulls-total")).toHaveText("13");
  await expect(pulls).toContainText("From Stellar Jade");
  await expect(page.getByRole("region", { name: "Pity" })).toContainText("/90");
  // Home's carousel, for this game alone: its banners rotate, nearest deadline first.
  await expect(page.locator(".banner-card")).toContainText("Honkai: Star Rail");

  await pulls.getByRole("link", { name: "Pulls" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/pulls$`));
});

// Round 11's review: Home's banners said nothing of what is on them. Each banner shows its featured units as icons, the
// ones you own marked, and your chance at its top unit with the pulls you hold. Blade: a 5★ no other journey owns (the
// journeys share one database).
test("Home's banners show each banner's featured units, the ones you own marked, and your chance with your pulls @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
  const id = created.ok()
    ? ((await created.json()) as { id: string }).id
    : ((await (await page.request.get("/api/instances")).json()) as { id: string; gameKey: string }[]).find((instance) => instance.gameKey === "hsr")!.id;
  await page.request.put(`/api/instances/${id}/currencies/stellarJade`, { data: { value: 1600 } });
  await page.request.put(`/api/instances/${id}/currencies/specialPass`, { data: { value: 3 } });
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1001", owned: true }] } });
  const featuring = (...catalogIds: string[]) => catalogIds.map((catalogId) => ({ catalogId, kind: "character", rateUp: true }));
  await page.request.post("/api/admin/payload", {
    data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-featured", name: "E2E featured warp", kind: "character", startsAt: iso(-1), endsAt: iso(0.2), featured: featuring("1009", "1205", "1001") }] },
  });

  await page.goto("/?game=hsr");
  const card = page.locator(".banner-card");
  // The pointer on the card holds it on this banner (the carousel steps on its own otherwise); it ends first, so it shows first.
  await card.hover();
  // Round 24: the card is titled by its 5★, not by the banner's name.
  await expect(card.locator(".carousel-title")).toHaveText("Blade");
  const featured = card.getByRole("list", { name: "Featured units" });
  await expect(featured.getByRole("listitem")).toHaveCount(3);
  // The 5★ first, then the 4★; the one you own says so.
  await expect(featured.getByRole("listitem").first()).toHaveAccessibleName("Blade, not owned");
  await expect(featured.getByRole("listitem", { name: "March 7th, owned" })).toBeVisible();
  // 1,600 Stellar Jade and 3 passes: 13 warps toward Blade.
  await expect(card.getByTestId("banner-chance")).toHaveText(/^\d+% with 13 pulls$/);
});

// A hybrid of the Overview and the designs, in the Overview's language (Georges, round 5): its gauges and charts on top,
// the banners where the Overview has the battle pass, the battle pass beside the stamina, the dailies' heatmap.
test("a game's dashboard: the Overview's gauges and charts for the game, its banners up top, the pass beside the stamina @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.request.post("/api/instances", { data: { gameKey: "zzz" } });

  await page.goto("/?game=zzz");
  await expect(page.getByRole("img", { name: /^(Dailies|Weeklies) done: \d+ of \d+/ })).toBeVisible();
  for (const name of ["Goals", "Goal types", "Backlog", "Pull history"]) await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Dailies, last 26 weeks" })).toBeVisible();

  const box = async (name: string) => (await page.getByRole("region", { name, exact: true }).boundingBox())!;
  const [ticks, banners, stamina, pass] = [await box("Dailies & weeklies"), (await page.locator(".banner-card").boundingBox())!, await box("Battery Charge"), await box("New Eridu City Fund")];
  expect(Math.abs(ticks.y - banners.y)).toBeLessThan(4);
  expect(Math.abs(stamina.y - pass.y)).toBeLessThan(4);
  expect(banners.y).toBeLessThan(pass.y);
  // One dashboard: the all-games Overview's battle-pass carousel is not on it.
  await expect(page.locator(".pass-card")).toHaveCount(0);
});

test("the Overview's second row: today's dailies ticked in place, the pass and the weeklies, stamina with its reserve @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/battery`, { data: { value: 120 } });

  await page.goto("/?game=zzz");
  // A daily ticked on the card stays ticked; another journey may have ticked it, so this one flips it and back.
  const scratch = page.getByRole("region", { name: "Dailies & weeklies" }).getByRole("checkbox", { name: "Scratch Card" });
  const was = await scratch.isChecked();
  await scratch.click();
  await expect(scratch).toBeChecked({ checked: !was });
  await page.reload();
  await expect(page.getByRole("region", { name: "Dailies & weeklies" }).getByRole("checkbox", { name: "Scratch Card" })).toBeChecked({ checked: !was });
  await page.getByRole("region", { name: "Dailies & weeklies" }).getByRole("checkbox", { name: "Scratch Card" }).click();

  // Drawn with Home's pieces: the pass's level as a tile over its segmented bar, beside the stamina (round 5).
  await expect(page.getByRole("region", { name: "New Eridu City Fund", exact: true })).toContainText("Level");
  await expect(page.getByRole("region", { name: "New Eridu City Fund", exact: true }).getByRole("img", { name: /New Eridu City Fund level \d+ of \d+/ })).toBeVisible();
  const stamina = page.getByRole("region", { name: "Battery Charge" });
  await expect(stamina.getByTestId("stamina")).toHaveText("120 / 240");
  await expect(stamina).toContainText("Backup Battery Charge");
});

test("the Overview's third row: builds in progress with level, skills, weapon and gear, and the endgame cycle @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
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

  await page.goto("/?game=hsr");
  const seele = page.getByRole("region", { name: "Builds in progress" }).getByRole("row", { name: /Seele/ });
  await expect(seele.getByRole("cell").nth(1)).toHaveText("70");
  await expect(seele.getByRole("cell").nth(3)).toHaveText("60");
  await expect(page.getByRole("region", { name: "Endgame · cycle" }).getByRole("row", { name: /Memory of Chaos/ })).toContainText("30/36");
  await page.request.delete(`/api/characters/${build.id}`);
});

test("the Overview's last row: each goal's progress and their average, and the open goals over ten days @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "wuwa" } })).json()) as { id: string };
  const goal = (await (await page.request.post("/api/tasks", { data: { scope: "game", refId: id, type: "goal", title: "E2E overview goal", target: 10 } })).json()) as { id: string };
  await page.request.post(`/api/tasks/${goal.id}/progress`, { data: { progress: 4 } });

  await page.goto("/?game=wuwa");
  await expect(page.getByRole("region", { name: "Goal progress" }).getByRole("row", { name: /E2E overview goal/ })).toContainText("40%");
  await expect(page.getByRole("region", { name: "Goals", exact: true }).getByRole("img", { name: /^Overall goal completion/ })).toBeVisible();
  // Home's backlog chart, for this game.
  await expect(page.getByRole("region", { name: "Backlog" }).getByRole("img", { name: /Open goals over time, latest \d+/ })).toBeVisible();
  await page.request.delete(`/api/tasks/${goal.id}`);
});

// Each game's own card (Georges's designs, 2026-10-11): NTE's city, Endfield's AIC and outposts.
test("the Overview's own card: NTE's city, its City Stamina capped by the Tycoon Level; Endfield's AIC and outposts @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const nte = (await (await page.request.post("/api/instances", { data: { gameKey: "nte" } })).json()) as { id: string };

  await page.goto("/?game=nte");
  const city = page.getByRole("region", { name: "City" });
  await city.getByRole("spinbutton", { name: "Tycoon Level" }).fill("23");
  await city.getByRole("spinbutton", { name: "Tycoon Level" }).blur();
  await expect(city.getByTestId("cityStamina-cap")).toHaveText("/ 700");
  // A profile made before the card adds its daily from it.
  const cafe = city.getByRole("checkbox", { name: "Café income" });
  if (!(await cafe.count())) await city.getByRole("button", { name: "Add Café income" }).click();
  await expect(city.getByRole("checkbox", { name: "Café income" })).toBeVisible();

  const endfield = (await (await page.request.post("/api/instances", { data: { gameKey: "endfield" } })).json()) as { id: string };
  await page.goto("/?game=endfield");
  const aic = page.getByRole("region", { name: "AIC and outposts" });
  await expect(aic.getByRole("spinbutton", { name: "Stock Bills" })).toBeVisible();
});

// Counted dailies (Georges's designs: "Engagement ▮▮▮▯"): a box per step, ticked up to the one clicked.
test("the Overview counts a daily's steps in boxes, kept after a reload @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  const tasks = (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as { id: string; title: string }[];
  const daily = tasks.find((t) => t.title === "Daily Missions")!;
  await page.request.post(`/api/tasks/${daily.id}/progress`, { data: { progress: 0 } });

  await page.goto("/?game=zzz");
  const steps = page.getByRole("region", { name: "Dailies & weeklies" }).getByRole("group", { name: "Daily Missions" });
  await expect(steps.getByRole("button")).toHaveCount(4);
  await steps.getByRole("button", { name: "3 of 4" }).click();
  await expect(steps.getByRole("button", { name: "3 of 4" })).toHaveAttribute("aria-pressed", "true");
  await expect(steps.getByRole("button", { name: "4 of 4" })).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByRole("region", { name: "Dailies & weeklies" }).getByRole("group", { name: "Daily Missions" }).getByRole("button", { name: "2 of 4" })).toHaveAttribute("aria-pressed", "true");
  await page.request.post(`/api/tasks/${daily.id}/progress`, { data: { progress: 0 } });
});

// A profile made before an item joined the game's defaults adds it from the card.
test("the Overview adds a game's daily the profile lacks with + @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  const tasks = (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as { id: string; title: string }[];
  const coffee = tasks.find((t) => t.title === "Coffee");
  if (coffee) await page.request.delete(`/api/tasks/${coffee.id}`);

  await page.goto("/?game=zzz");
  const today = page.getByRole("region", { name: "Dailies & weeklies" });
  await today.getByRole("button", { name: "Add Coffee" }).click();
  await expect(today.getByRole("checkbox", { name: "Coffee" })).toBeVisible();
});

test("the Overview's pity shows Endfield's featured guarantee toward its spark @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "endfield" } })).json()) as { id: string };
  await page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "endfield", items: [{ key: "e2e-spark", name: "E2E spark headhunting", kind: "character", startsAt: iso(-1), endsAt: iso(20) }] } });
  await page.goto("/?game=endfield");
  await expect(page.getByRole("region", { name: "Pity" })).toContainText(/Featured guarantee\s*\d+\/120/);
});

// Georges, round 7: "daily/weekly data entry needs to be reworked: the centering is crooked and the colour should be on theme
// with the rest instead of basic white … heatmap for individual games doesn't show depth of completion".
test("Dailies and weeklies: one tick control in the game's colour, its boxes in one column; the game's heatmap by depth @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  const tasks = (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as { id: string; title: string }[];
  const daily = tasks.find((t) => t.title === "Daily Missions")!;
  await page.request.post(`/api/tasks/${daily.id}/progress`, { data: { progress: 2 } });

  await page.goto("/?game=zzz");
  const card = page.getByRole("region", { name: "Dailies & weeklies" });
  const on = card.getByRole("group", { name: "Daily Missions" }).getByRole("button", { name: "2 of 4" });
  await expect(on).toHaveAttribute("aria-pressed", "true");
  // The game's colour, not white.
  const [fill, accent] = await on.evaluate((el) => {
    const probe = document.createElement("i");
    probe.style.color = "var(--accent)";
    el.parentElement!.append(probe);
    const out = [getComputedStyle(el).backgroundColor, getComputedStyle(probe).color];
    probe.remove();
    return out;
  });
  expect(fill).toBe(accent);
  // Every row's boxes start in one column.
  const lefts = await card.locator(".tick-boxes").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(lefts.length).toBeGreaterThan(2);
  expect(new Set(lefts.slice(0, 4)).size).toBe(1);

  // Today pinned on the game's heatmap: its dailies done out of all, not only whether the game is done.
  const heat = page.getByRole("group", { name: /Dailies over the last 26 weeks/ });
  await heat.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(page.locator(".heat-readout")).toContainText(/\d+ \/ \d+\s*DAILIES/i);
  await page.request.post(`/api/tasks/${daily.id}/progress`, { data: { progress: 0 } });
});

// Georges, round 7: "add a daily login currency bonus thing, like the Blessing of the Welkin Moon: if it's active, how many days,
// and count it towards pull predictions".
test("A game's dashboard: the 30-day pass's days left, what it still pays and in pulls; 30 more days in one click @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/passes/monthly`, { data: { daysLeft: 10 } });

  await page.goto("/?game=hsr");
  const card = page.getByRole("region", { name: "Express Supply Pass" });
  await expect(card.getByRole("group", { name: "Days left" })).toContainText("10");
  // Ten days at 90 Stellar Jade: 900, five warps at 160 (Star Rail: the smoke journey adds Genshin).
  await expect(card.getByRole("group", { name: "Still to collect" })).toContainText("900");
  await expect(card.getByRole("group", { name: "Still to collect" })).toContainText("5 pulls");
  await card.getByRole("button", { name: "Add 30 days" }).click();
  await expect(card.getByRole("group", { name: "Days left" })).toContainText("40");
  const { monthly } = (await (await page.request.get(`/api/instances/${id}/passes`)).json()) as { monthly: { endsAt: string } };
  expect(Math.ceil((Date.parse(monthly.endsAt) - Date.now()) / 86_400_000)).toBe(40);
});

// Georges, round 7: "add icons wherever there can be; I have an eye condition … I need icons to understand quickly".
test("Currencies by their icons: a game's pulls and stamina on its dashboard, the Pulls page's table @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };

  await page.goto("/?game=zzz");
  const pulls = page.getByRole("region", { name: "Pulls", exact: true });
  await expect(pulls.locator(".cur-icon[data-kind=premium]")).toBeVisible();
  await expect(pulls.locator(".cur-icon[data-kind=ticket]")).toBeVisible();
  await expect(page.getByRole("region", { name: "Battery Charge" }).locator(".cur-icon[data-kind=stamina]").first()).toBeVisible();

  await page.goto(`/games/${id}/pulls`);
  const table = page.getByRole("region", { name: "Pulls available" });
  for (const kind of ["premium", "ticket", "standard"]) await expect(table.locator(`.cur-icon[data-kind=${kind}]`).first()).toBeVisible();
});
