import { expect, test } from "@playwright/test";

test("Characters: splash cards with their KPIs, counts, search, wishlist and owning @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const kafkaBuild = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc: { level: 80, eidolon: 1, lightCone: { catalogId: "23006", name: "Patience Is All You Need", level: 80, superimposition: 2 }, stats: { "CRIT Rate": 60, "CRIT DMG": 150, SPD: 134 } } } })).json()) as { id: string };
  // The card shows the default build: this one.
  await page.request.put(`/api/characters/${kafkaBuild.id}`, { data: { isDefault: true } });
  // Welt starts unowned and off the wishlist, whatever other journeys did.
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1004", owned: false }] } });
  await page.request.put(`/api/instances/${id}/wishlist`, { data: { kind: "character", catalogId: "1004", wished: false } });

  await page.goto(`/games/${id}/characters`);
  await expect(page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Characters" })).toHaveAttribute("aria-current", "page");
  // Every unit at once: no paging, no compact view.
  await expect(page.getByRole("article").nth(12)).toBeVisible();
  await expect(page.getByRole("button", { name: "Show more" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Compact" })).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Search" }).fill("Kafka");
  const kafka = page.getByRole("article", { name: "Kafka" });
  await expect(kafka).toContainText("E1");
  await expect(kafka).toContainText("Lv 80");
  await expect(kafka).toContainText("Crit value");
  await expect(kafka).toContainText("60 / 150");
  await expect(page.getByRole("article")).toHaveCount(1);
  // The card shows the weapon type (Star Rail's path) and tints to the element.
  await expect(kafka).toContainText("Nihility");
  // Its default build's weapon on the coloured name card, its level and refinement on the icon (Georges, round 4),
  // on the right of the name, the level top-left and the refinement bottom-right (round 5).
  const weapon = kafka.locator(".ch-namebox .ch-weapon");
  await expect(weapon.getByRole("img", { name: "Patience Is All You Need" })).toBeVisible();
  await expect(weapon.locator(".ch-weapon-lv")).toHaveText("80");
  await expect(weapon.locator(".ch-weapon-r")).toHaveText("S2");
  const [w, name, lv, r] = await Promise.all([weapon, kafka.getByRole("heading", { name: "Kafka" }), weapon.locator(".ch-weapon-lv"), weapon.locator(".ch-weapon-r")].map(async (l) => (await l.boundingBox())!));
  expect(w.x).toBeGreaterThan(name.x);
  expect(Math.abs(lv.x - w.x) + Math.abs(lv.y - w.y)).toBeLessThan(2);
  expect(Math.abs(r.x + r.width - (w.x + w.width)) + Math.abs(r.y + r.height - (w.y + w.height))).toBeLessThan(2);
  await expect(kafka.locator(".ch-foot .ch-weapon")).toHaveCount(0);
  // The name card's line leaves the refinement to the icon.
  await expect(kafka.locator(".ch-namebox-line")).not.toContainText("S2");
  expect(await kafka.evaluate((e) => getComputedStyle(e).getPropertyValue("--el").trim())).not.toBe("");
  // The whole card opens the build.
  await kafka.click();
  await expect(page).toHaveURL(/\/characters\/[a-z0-9]+$/);
  await page.goBack();

  await page.getByRole("searchbox", { name: "Search" }).fill("Welt");
  const welt = page.getByRole("article", { name: "Welt" });
  await expect(welt).toContainText("Not owned");
  await welt.getByRole("button", { name: "Wishlist" }).click();
  await expect(welt.getByRole("button", { name: "Wishlist" })).toHaveAttribute("aria-pressed", "true");
  await welt.getByRole("button", { name: "Own" }).click();
  await expect(welt).not.toContainText("Not owned");

  // Element, weapon and rarity filter as chips (Georges, 2026-10-11: icons, not lists).
  await page.getByRole("searchbox", { name: "Search" }).fill("");
  const lightning = page.getByRole("group", { name: "Element" }).getByRole("button", { name: "Lightning" });
  await lightning.click();
  await expect(lightning).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("article", { name: "Kafka" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Welt" })).toHaveCount(0);
  await lightning.click();
  await expect(page.getByRole("combobox", { name: "Element" })).toHaveCount(0);

  // The counts are filters: Wishlist shows only the wishlisted, pressed until clicked again.
  await page.getByRole("searchbox", { name: "Search" }).fill("");
  const wishlist = page.getByRole("button", { name: /^Wishlist \d+$/ });
  await wishlist.click();
  await expect(wishlist).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("article", { name: "Welt" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Kafka" })).toHaveCount(0);
  await wishlist.click();
  await expect(page.getByRole("article", { name: "Kafka" })).toBeVisible();

  // A unit with no build opens too: its page, to own, wishlist, plan or start a build.
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1004", owned: false }] } });
  await page.reload();
  await page.getByRole("searchbox", { name: "Search" }).fill("Welt");
  await page.getByRole("article", { name: "Welt" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/units/1004$`));
  await expect(page.getByRole("heading", { name: "Welt", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Own", exact: true }).click();
  // The unit's page is its sheet (round 10): saved, it is a build.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/characters\/[a-z0-9]+$/);
});

test("Characters: every build in one table, and several characters at once @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1009", doc: { level: 60 } } });
  // Arlan and Herta start unowned, whatever other journeys did.
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: ["1008", "1013"].map((catalogId) => ({ kind: "character", catalogId, owned: false })) } });
  await page.goto(`/games/${id}/characters`);

  // Builds: every build of the game in one table, its status changed in place (Georges, 2026-10-10: "where can I see my builds").
  await page.getByRole("group", { name: "Show" }).getByRole("button", { name: "Builds" }).click();
  const asta = page.getByRole("table", { name: "Builds" }).getByRole("row", { name: /Asta/ }).first();
  await expect(asta.getByRole("link", { name: /Asta/ })).toBeVisible();
  await asta.getByRole("combobox", { name: /status/ }).selectOption("good");
  await expect
    .poll(async () => ((await (await page.request.get(`/api/instances/${id}/characters`)).json()) as { catalogId: string; buildStatus: string }[]).some((b) => b.catalogId === "1009" && b.buildStatus === "good"))
    .toBe(true);

  // Several characters at once: select two unowned ones and own both.
  await page.getByRole("group", { name: "Show" }).getByRole("button", { name: "Characters" }).click();
  await page.getByRole("button", { name: "Select", exact: true }).click();
  // A click anywhere on the card selects it; it no longer opens the character.
  // The whole card lights up, not a small box (Georges, round 5).
  await page.getByRole("article", { name: "Arlan" }).click();
  await expect(page.getByRole("checkbox", { name: "Select Arlan" })).toBeChecked();
  await expect(page.getByRole("article", { name: "Arlan" })).toHaveClass(/is-picked/);
  await expect(page.getByRole("checkbox", { name: "Select Arlan" })).toHaveCSS("opacity", "0");
  await expect(page).toHaveURL(new RegExp(`/games/${id}/characters$`));
  await page.getByRole("checkbox", { name: "Select Herta" }).check();
  const selection = page.getByRole("region", { name: "Selection" });
  await expect(selection).toContainText("2 selected");
  await selection.getByRole("button", { name: "Own", exact: true }).click();
  await expect(page.getByRole("article", { name: "Arlan" })).not.toContainText("Not owned");
  await expect(page.getByRole("article", { name: "Herta", exact: true })).not.toContainText("Not owned");
});

// The stats each card shows, picked for the game (Georges, round 5: "if i wanna see my HP EM and DEF for example i should be able to"),
// and a set's bonus on top "in another colour", the stat and the bonus on hover or click.
test("Characters: the stats the cards show, picked for the game; a set's bonus added in another colour @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Qingque, whom no other journey builds, in four Hunter of Glacial Forest relics: CRIT DMG +25% after her Ultimate.
  const { id: build } = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1201" } })).json()) as { id: string };
  const hunter = { setName: "Hunter of Glacial Forest" };
  await page.request.put(`/api/characters/${build}`, { data: { doc: { relics: { head: hunter, hands: hunter, body: hunter, feet: hunter }, traces: {}, lightCone: {}, stats: { HP: 3000, "CRIT DMG": 100, SPD: 110 } } } });

  await page.goto(`/games/${id}/characters`);
  await page.getByRole("searchbox", { name: "Search" }).fill("Qingque");
  const card = page.getByRole("article", { name: "Qingque" });
  const pick = page.getByRole("group", { name: "Card stats" });
  for (const stat of ["HP", "CRIT DMG", "SPD"]) await pick.getByRole("button", { name: stat, exact: true }).click();
  await expect(card.locator(".ch-kpis .kpi-label")).toHaveText(["HP", "CRIT DMG", "SPD"]);
  const crit = card.getByRole("button", { name: /^CRIT DMG 125%/ });
  await expect(crit).toHaveAttribute("title", "100% + 25% · Hunter of Glacial Forest 4pc");
  await crit.click();
  await expect(crit).toContainText("100% + 25%");
  // The completed set as its icon with its count, not its name in words (round 6).
  await expect(card.locator(".ch-set").getByRole("img", { name: "Hunter of Glacial Forest" })).toBeVisible();
  await expect(card.locator(".ch-set")).toContainText("4");

  // Saved for the game.
  await page.reload();
  await page.getByRole("searchbox", { name: "Search" }).fill("Qingque");
  await expect(page.getByRole("article", { name: "Qingque" }).locator(".ch-kpis .kpi-label")).toHaveText(["HP", "CRIT DMG", "SPD"]);
  // Three at most (round 8): a fourth pick drops the oldest.
  await page.getByRole("group", { name: "Card stats" }).getByRole("button", { name: "ATK", exact: true }).click();
  await expect(page.getByRole("article", { name: "Qingque" }).locator(".ch-kpis .kpi-label")).toHaveText(["CRIT DMG", "SPD", "ATK"]);
  // Back to the role's stats, for the journeys after this one.
  await page.getByRole("group", { name: "Card stats" }).getByRole("button", { name: "Role" }).click();
  await expect.poll(async () => ((await (await page.request.get(`/api/instances/${id}`)).json()) as { cardStats: unknown }).cardStats).toBeNull();
});

// Ownership apart from builds, and the selection's actions doing what they say (Georges, round 6: "I cannot change the status
// from owned to not owned; selecting multiple characters achieves nothing, I should be able to change their status").
test("Characters: a built character can be marked not owned; the selection sets owned and build status @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Natasha, whom no other journey builds.
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1105", doc: { level: 60 } } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/characters`);
    await page.getByRole("searchbox", { name: "Search" }).fill("Natasha");
    const card = page.getByRole("article", { name: "Natasha" });
    await expect(card).not.toContainText("Not owned");

    await page.getByRole("button", { name: "Select", exact: true }).click();
    await card.click();
    const selection = page.getByRole("region", { name: "Selection" });
    await selection.getByRole("button", { name: "Not owned", exact: true }).click();
    await expect(card).toContainText("Not owned");
    // The build stays.
    await expect(card).toContainText("Lv 60");

    await selection.getByRole("combobox", { name: "Build status" }).selectOption("good");
    await expect.poll(async () => ((await (await page.request.get(`/api/characters/${build.id}`)).json()) as { buildStatus: string }).buildStatus).toBe("good");
    await selection.getByRole("button", { name: "Own", exact: true }).click();
    await expect(card).not.toContainText("Not owned");
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
  }
});

// Each game's art framed on the face (Georges, round 6: "WuWa character art is too low on the cards, we can barely see their heads").
test("Characters: WuWa's art is raised so the faces sit high on the card @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "wuwa" } })).json()) as { id: string };
  await page.goto(`/games/${id}/characters`);
  const art = page.locator(".ch-card .ch-art").first();
  const [box, img] = [(await art.boundingBox())!, (await art.locator(".gicon").boundingBox())!];
  expect(img.y).toBeLessThan(box.y - 20);
  expect(img.height).toBeGreaterThan(box.height * 1.2);
});

// Each character its own stats (Georges, round 6: "I can choose for each one character what I want to show").
test("Characters: a card's own stats, picked on the card, over the game's @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Hook, whom no other journey builds.
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1109", doc: { stats: { HP: 3000, DEF: 900, SPD: 104 } } } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/characters`);
    await page.getByRole("searchbox", { name: "Search" }).fill("Hook");
    const card = page.getByRole("article", { name: "Hook" });
    await card.getByRole("button", { name: "Stats shown on Hook" }).click();
    const pick = card.getByRole("group", { name: "Hook's card stats" });
    for (const stat of ["HP", "DEF"]) await pick.getByRole("button", { name: stat, exact: true }).click();
    await expect(card.locator(".ch-kpis .kpi-label")).toHaveText(["HP", "DEF"]);
    await expect(card.locator(".ch-kpis")).toContainText("3000");
    // A click outside closes the picker; the choice is kept.
    await page.getByRole("searchbox", { name: "Search" }).click();
    await expect(pick).toHaveCount(0);
    await expect.poll(async () => ((await (await page.request.get(`/api/characters/${build.id}`)).json()) as { cardStats: unknown }).cardStats).toEqual(["HP", "DEF"]);
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
  }
});

// The character's growth stat highlighted (Georges, round 6: "character's ascension stat should be highlighted as well"), and in
// round 7: "the highlighted main stat shouldn't be on the top, it should be in the stat showcase of the cards, highlighted with the
// character's colours … by default each character has its main stat showcased first … the highlights should also be able to be set
// from the build creation screen, and the main stat highlighted there as well".
test("Characters: the growth stat first in a card's stats, in the character's colour; the card's stats picked on the sheet too @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc: { level: 80, stats: { ATK: 2400, SPD: 120 } } } })).json()) as { id: string };
  await page.request.put(`/api/characters/${build.id}`, { data: { isDefault: true } });
  try {
    await page.goto(`/games/${id}/characters`);
    await page.getByRole("searchbox", { name: "Search" }).fill("Kafka");
    const card = page.getByRole("article", { name: "Kafka" });
    await expect(card.locator(".ch-chips .ch-bonus")).toHaveCount(0);
    const first = card.locator(".ch-kpis > div").first();
    await expect(first.locator(".kpi-label")).toHaveText("ATK");
    await expect(first).toHaveClass(/is-growth/);
    const [colour, el] = await first.locator(".font-display").evaluate((v) => {
      const probe = document.createElement("i");
      probe.style.color = "var(--el)";
      v.parentElement!.append(probe);
      const out = [getComputedStyle(v).color, getComputedStyle(probe).color];
      probe.remove();
      return out;
    });
    expect(colour).toBe(el);

    // On the sheet every stat is a card (round 8), the growth stat in the character's colour; a box on each shows it on the card,
    // three at most, a fourth dropping the oldest.
    await page.goto(`/characters/${build.id}`);
    const stats = page.getByRole("region", { name: "Combat stats" });
    await expect(stats.getByRole("group", { name: "ATK" })).toHaveClass(/is-growth/);
    await expect(stats.getByRole("checkbox", { name: "ATK on the card" })).toBeChecked();
    await expect(stats.getByRole("checkbox", { name: "CRIT Rate on the card" })).toBeChecked();
    await stats.getByRole("checkbox", { name: "HP on the card" }).click();
    await expect(stats.getByRole("checkbox", { name: "HP on the card" })).toBeChecked();
    await expect.poll(async () => ((await (await page.request.get(`/api/characters/${build.id}`)).json()) as { cardStats: string[] | null }).cardStats).toEqual(["Crit value", "CRIT Rate / CRIT DMG", "HP"]);
    await expect(stats.getByRole("checkbox", { name: "ATK on the card" })).not.toBeChecked();
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
  }
});

// Georges, round 6: "a quick way to make a building goal depending on the game … a window where I choose an ascension goal, by
// default the bare minimum to get to the last one for each game, the weapon I want to add to the goal, the gear set I want to
// farm, the skill levels I wanna get … selecting multiple characters … add them to goals using the quick goal creation".
test("Characters: a quick build goal from the sheet (the last ascension, the skills, a weapon and a set linked); several at once from the selection @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  type Task = { id: string; title: string; parentId: string | null; materialId: string | null; origin: { goal?: { level?: { to: number }; talents?: Record<string, { to: number }> } } | null };
  const tasks = async () => (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as Task[];
  const titles = ["Farm Herta", "Farm Passkey", "Farm Genius of Brilliant Stars", "Farm Himeko", "Farm Asta"];
  // Herta, whom no other journey builds.
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1013" } })).json()) as { id: string };
  try {
    await page.goto(`/characters/${build.id}`);
    await page.getByRole("button", { name: "Quick goal" }).click();
    const quick = page.getByRole("dialog", { name: "Quick build goal" });
    // The last ascension and the game's usual skills by default; a click outside closes it.
    await expect(quick.getByRole("combobox", { name: "Ascension" })).toHaveValue("80");
    await expect(quick.getByRole("group", { name: "Skill levels" }).getByRole("spinbutton").first()).toHaveValue("6");
    await page.mouse.click(4, 4);
    await expect(quick).toHaveCount(0);

    await page.getByRole("button", { name: "Quick goal" }).click();
    await quick.getByRole("combobox", { name: "Weapon" }).fill("Passkey");
    await page.getByRole("option", { name: /^Passkey/ }).click();
    await quick.getByRole("combobox", { name: "Set to farm" }).fill("Genius");
    await page.getByRole("option", { name: /^Genius of Brilliant Stars/ }).click();
    await quick.getByRole("button", { name: "Make goal" }).click();
    await expect(quick).toHaveCount(0);
    await expect
      .poll(async () => {
        const all = await tasks();
        const herta = all.find((t) => t.title === "Farm Herta" && !t.materialId);
        const under = (title: string) => all.find((t) => t.title === title && !t.materialId)?.parentId === herta?.id;
        return [herta?.origin?.goal?.level?.to, herta?.origin?.goal?.talents?.skill?.to, under("Farm Passkey"), under("Farm Genius of Brilliant Stars")];
      })
      .toEqual([80, 10, true, true]);

    // Himeko and Asta at once, from the selection.
    await page.goto(`/games/${id}/characters`);
    await page.getByRole("button", { name: "Select", exact: true }).click();
    await page.getByRole("checkbox", { name: "Select Himeko", exact: true }).check();
    await page.getByRole("checkbox", { name: "Select Asta", exact: true }).check();
    await page.getByRole("region", { name: "Selection" }).getByRole("button", { name: "Make goals" }).click();
    await quick.getByRole("button", { name: "Make 2 goals" }).click();
    await expect.poll(async () => (await tasks()).filter((t) => ["Farm Himeko", "Farm Asta"].includes(t.title) && !t.materialId).length).toBe(2);
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
    for (const t of (await tasks()).filter((x) => titles.includes(x.title) && !x.materialId)) await page.request.delete(`/api/tasks/${t.id}`);
  }
});

// Georges, round 7: "there's no select all button until I select one".
test("Characters and Weapons: Select shows All shown at once, before anything is picked @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // ZZZ: reading Star Rail's Weapons here would link other journeys' sheets to copies before the weapons journeys run.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  for (const screen of ["characters", "weapons"]) {
    await page.goto(`/games/${id}/${screen}`);
    await page.getByRole("searchbox", { name: "Search" }).fill(screen === "weapons" ? "Steel" : "Miyabi");
    await page.getByRole("button", { name: "Select", exact: true }).click();
    const selection = page.getByRole("region", { name: "Selection" });
    await expect(selection).toContainText("0 selected");
    await selection.getByRole("button", { name: "All shown" }).click();
    await expect(selection).not.toContainText("0 selected");
  }
});

// Georges, round 7: "unbuilt character cards shouldn't be empty; I should be able to see character data".
test("Characters: a card without a build shows the character's base stats at its top level, its growth stat first @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto(`/games/${id}/characters`);
  await page.getByRole("searchbox", { name: "Search" }).fill("Serval");
  // Serval, whom no journey builds: CRIT Rate grows; at 80, 917 HP, 653 ATK, 375 DEF (Yatta's promotion data).
  const card = page.getByRole("article", { name: "Serval" });
  // Three stats at most (round 8): the growth stat, HP and ATK.
  await expect(card.locator(".ch-kpis .kpi-label")).toHaveText(["CRIT Rate", "HP", "ATK"]);
  await expect(card.locator(".ch-kpis > div").first()).toHaveClass(/is-growth/);
  await expect(card.locator(".ch-kpis .font-display")).toHaveText(["5%", "917", "653"]);
  await expect(card.locator(".ch-kpis .font-display").nth(1)).toHaveAttribute("title", /Base at Lv 80/);
});

// Georges, round 8: "Endfield character arts are way too zoomed in": its portraits are small, so its cards show them whole.
test("Characters: Endfield's portraits shown whole on their cards, not enlarged to fill them @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "endfield" } })).json()) as { id: string };
  await page.goto(`/games/${id}/characters`);
  const art = page.locator(".ch-card .ch-art .gicon").first();
  await expect(art).toBeVisible();
  expect(await art.evaluate((el) => getComputedStyle(el).objectFit)).toBe("contain");
  // Other games keep filling their cards.
  const hsr = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto(`/games/${hsr.id}/characters`);
  expect(await page.locator(".ch-card .ch-art .gicon").first().evaluate((el) => getComputedStyle(el).objectFit)).toBe("cover");
});

// Georges, round 9: "for the characters, not owning them shouldn't prevent me from having the full card or setting trying builds;
// don't make a different screen for owned/not owned, same screen, just a toggle for all characters to see which ones I have already".
test("Characters: an unowned character has the full card and a build to try; Owned only is a toggle @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Lynx, whom no other journey builds or owns.
  for (const b of ((await (await page.request.get(`/api/instances/${id}/characters`)).json()) as { id: string; catalogId: string }[]).filter((x) => x.catalogId === "1110")) {
    await page.request.delete(`/api/characters/${b.id}`);
  }
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1110", owned: false }] } });

  await page.goto(`/games/${id}/characters`);
  await page.getByRole("searchbox", { name: "Search" }).fill("Lynx");
  const lynx = page.getByRole("article", { name: "Lynx" });
  // The full card: its art as bright as an owned one's, its stats.
  expect(await lynx.locator(".ch-art .gicon").evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).filter])).toEqual(["1", "none"]);
  await expect(lynx.locator(".ch-kpis")).toBeVisible();
  // No screen of its own for the others: the same cards, filtered by ownership (round 11 adds Not owned to the filter).
  const ownedView = page.getByRole("group", { name: "Ownership" }).getByRole("button", { name: /^Owned \d+/ });
  await ownedView.click();
  await expect(ownedView).toHaveAttribute("aria-pressed", "true");
  await expect(lynx).toHaveCount(0);
  await ownedView.click();
  await expect(lynx).toBeVisible();

  // A build to try, without owning her.
  await lynx.getByRole("button", { name: "Start a build" }).click();
  await expect(page).toHaveURL(/\/characters\//);
  const mine = (await (await page.request.get(`/api/instances/${id}/characters`)).json()) as { id: string; catalogId: string }[];
  const build = mine.find((b) => b.catalogId === "1110")!;
  const owned = (await (await page.request.get(`/api/instances/${id}/ownership`)).json()) as { catalogId: string }[];
  expect(owned.some((o) => o.catalogId === "1110")).toBe(false);
  await page.request.delete(`/api/characters/${build.id}`);
});

// Georges, round 10: "on the not owned characters if I get on their screen there's almost nothing; I want the same thing as owned characters".
test("Characters: an unowned character without a build opens the same sheet as a built one; its first save is a try @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const builds = async () => ((await (await page.request.get(`/api/instances/${id}/characters`)).json()) as { id: string; catalogId: string; doc: { level?: number } }[]).filter((b) => b.catalogId === "1104");
  for (const b of await builds()) await page.request.delete(`/api/characters/${b.id}`);
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1104", owned: false }] } });

  await page.goto(`/games/${id}/characters`);
  await page.getByRole("searchbox", { name: "Search" }).fill("Gepard");
  await page.getByRole("article", { name: "Gepard" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/units/1104$`));
  // The sheet a build has: its level, skills, weapon, stat cards and gear; and the unit's own: owning, the wishlist, its banners.
  await expect(page.getByRole("heading", { name: "Gepard", level: 1 })).toBeVisible();
  for (const name of ["Character", "Traces", "Weapon", "Combat stats", "Relics", "Banners", "Plan farming"]) await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "ATK" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Own", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Wishlist", exact: true })).toBeVisible();

  // Saved, it is a build to try: Gepard stays unowned.
  await page.getByRole("region", { name: "Character", exact: true }).getByLabel("Level", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/characters\/[a-z0-9]+$/);
  const [build] = await builds();
  expect(build?.doc.level).toBe(50);
  const owned = (await (await page.request.get(`/api/instances/${id}/ownership`)).json()) as { catalogId: string }[];
  expect(owned.some((o) => o.catalogId === "1104")).toBe(false);

  // Opened again as a unit, it is that build's sheet.
  await page.goto(`/games/${id}/units/1104`);
  await expect(page.getByRole("tablist", { name: "Builds" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Character", exact: true }).getByLabel("Level", { exact: true })).toHaveValue("50");
  await page.request.delete(`/api/characters/${build!.id}`);
});

// Main's CI after #313: three quick card-stat picks, then a reload, kept only two; the queued last save left with the page.
test("Characters: card-stat picks made quickly are all kept, even when the page is left at once @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}`, { data: { cardStats: null } });
  // A slow server: every save of the game takes 400 ms to reach it. Held by the browser context, not the page: the
  // last save is a keepalive request that outlives the page's navigation, which cancels a page's held requests.
  await page.context().route(`**/api/instances/${id}`, async (route) => {
    if (route.request().method() === "PUT") await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  try {
    await page.goto(`/games/${id}/characters`);
    const pick = page.getByRole("group", { name: "Card stats" });
    for (const stat of ["HP", "ATK", "DEF"]) await pick.getByRole("button", { name: stat, exact: true }).click();
    await page.goto("/");
    await expect.poll(async () => ((await (await page.request.get(`/api/instances/${id}`)).json()) as { cardStats: string[] | null }).cardStats, { timeout: 5000 }).toEqual(["HP", "ATK", "DEF"]);
  } finally {
    await page.context().unroute(`**/api/instances/${id}`);
    await page.request.put(`/api/instances/${id}`, { data: { cardStats: null } });
  }
});

// Georges, round 11: "I'd like to have a 'last seen' info on characters to see their last banners"; and "there's a wild banner card on the character screen".
test("Characters: each character's last banner on its card, sorted by it; the sheet's banners in full, across the sheet @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const featuring = (catalogId: string) => [{ catalogId, kind: "character" }];
  // Saber (1014) last seen two months ago and back next week; Archer (1015) a week ago.
  const upload = await page.request.post("/api/admin/payload", {
    data: {
      kind: "banners",
      gameKey: "hsr",
      items: [
        { key: "e2e-seen-saber", name: "E2E Saber warp", kind: "character", startsAt: iso(-80), endsAt: iso(-60), featured: featuring("1014") },
        { key: "e2e-next-saber", name: "E2E Saber rerun", kind: "character", startsAt: iso(7), endsAt: iso(27), featured: featuring("1014") },
        { key: "e2e-seen-archer", name: "E2E Archer warp", kind: "character", startsAt: iso(-27), endsAt: iso(-7), featured: featuring("1015") },
      ],
    },
  });
  expect(upload.ok()).toBe(true);
  try {
    await page.goto(`/games/${id}/characters`);
    const saber = page.getByRole("article", { name: "Saber" });
    await expect(saber.getByRole("img", { name: "Last banner" })).toBeVisible();
    // Round 12: a rerun already dated says when she is back, which beats how long she has been gone.
    await expect(saber).toContainText("back in 7 d");
    await expect(saber.locator(".last-seen-chip")).toHaveAttribute("data-state", "returning");
    await expect(page.getByRole("article", { name: "Archer" })).toContainText("1 wk ago");
    await expect(page.getByRole("article", { name: "Archer" }).locator(".last-seen-chip")).toHaveAttribute("data-state", "seen");

    // Sorted by it, the longest unseen first.
    await page.getByLabel("Sort").selectOption({ label: "Last seen" });
    const names = await page.locator("article.ch-card").evaluateAll((cards) => cards.map((card) => card.getAttribute("aria-label")));
    expect(names.indexOf("Saber")).toBeLessThan(names.indexOf("Archer"));

    // The sheet: its banners across the sheet, the last one, the next, every one, apart from the next card.
    await saber.click();
    const banners = page.getByRole("region", { name: "Banners" });
    await expect(banners).toContainText("E2E Saber warp");
    await expect(banners).toContainText("E2E Saber rerun");
    // Her two banners in the table, beside her real ones from the banner history (#318).
    await expect(banners.getByRole("row").filter({ hasText: "E2E Saber" })).toHaveCount(2);
    const box = (await banners.boundingBox())!;
    expect(box.width).toBeGreaterThan(1000);
    const misc = (await page.getByRole("region", { name: "Misc" }).boundingBox())!;
    expect(misc.y - (box.y + box.height)).toBeGreaterThanOrEqual(12);
  } finally {
    for (const key of ["e2e-seen-saber", "e2e-next-saber", "e2e-seen-archer"]) await page.request.delete(`/api/admin/banners/hsr/${key}`);
  }
});

// Georges, round 11: "there should be some common sense features like filtering characters or anything on ownership/non ownership".
test("Characters and Weapons: All, Owned, Not owned and Wishlist as one filter with their counts; a weapon's last banner on its card @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Jing Yuan owned, Luocha not; neither built by any journey.
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1204", owned: true }, { kind: "character", catalogId: "1203", owned: false }] } });
  const copy = (await (await page.request.post(`/api/instances/${id}/weapons`, { data: { catalogId: "23000" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  await page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-seen-milky-way", name: "E2E light cone warp", kind: "weapon", startsAt: iso(-50), endsAt: iso(-30), featured: [{ catalogId: "23001", kind: "weapon" }] }] } });
  try {
    await page.goto(`/games/${id}/characters`);
    const ownership = page.getByRole("group", { name: "Ownership" });
    for (const view of ["All", "Owned", "Not owned", "Wishlist"]) await expect(ownership.getByRole("button", { name: new RegExp(`^${view} \\d+`) })).toBeVisible();
    const jingYuan = page.getByRole("article", { name: "Jing Yuan" });
    const luocha = page.getByRole("article", { name: "Luocha" });
    await ownership.getByRole("button", { name: /^Not owned \d+/ }).click();
    await expect(luocha).toBeVisible();
    await expect(jingYuan).toHaveCount(0);
    await ownership.getByRole("button", { name: /^Owned \d+/ }).click();
    await expect(jingYuan).toBeVisible();
    await expect(luocha).toHaveCount(0);
    await ownership.getByRole("button", { name: /^All \d+/ }).click();
    await expect(jingYuan).toBeVisible();
    await expect(luocha).toBeVisible();

    // Weapons: the same filter; a light cone's last banner on its card.
    await page.goto(`/games/${id}/weapons`);
    const milkyWay = page.getByRole("article", { name: "Night on the Milky Way" });
    const inTheNight = page.getByRole("article", { name: "In the Night" });
    await page.getByRole("group", { name: "Ownership" }).getByRole("button", { name: /^Not owned \d+/ }).click();
    await expect(inTheNight).toBeVisible();
    await expect(milkyWay).toHaveCount(0);
    await expect(inTheNight.getByRole("img", { name: "Last banner" })).toBeVisible();
    await expect(inTheNight).toContainText("1 mo ago");
    await page.getByRole("group", { name: "Ownership" }).getByRole("button", { name: /^Owned \d+/ }).click();
    await expect(milkyWay).toBeVisible();
    await expect(inTheNight).toHaveCount(0);
  } finally {
    await page.request.delete(`/api/instances/${id}/weapons/${copy.id}`);
    await page.request.delete("/api/admin/banners/hsr/e2e-seen-milky-way");
  }
});

// Round 11's review: no way to find the characters at a given dupe count.
test("Characters: a dupes filter, E0 to E6 for Star Rail, on the owned characters' builds @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Saber at E2, Archer at E0, both owned with a build.
  const saber = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1014", doc: { eidolon: 2 } } })).json()) as { id: string };
  const archer = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1015", doc: { eidolon: 0 } } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/characters`);
    const dupes = page.getByRole("group", { name: "Eidolon" });
    for (const level of [0, 1, 2, 3, 4, 5, 6]) await expect(dupes.getByRole("button", { name: `E${level}`, exact: true })).toBeVisible();
    await dupes.getByRole("button", { name: "E2", exact: true }).click();
    await expect(page.getByRole("article", { name: "Saber" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Archer" })).toHaveCount(0);
    await dupes.getByRole("button", { name: "E2", exact: true }).click();
    await expect(page.getByRole("article", { name: "Archer" })).toBeVisible();
  } finally {
    await page.request.delete(`/api/characters/${saber.id}`);
    await page.request.delete(`/api/characters/${archer.id}`);
  }
});
