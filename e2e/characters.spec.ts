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
  await page.getByRole("button", { name: "Own" }).click();
  await page.getByRole("button", { name: "Start a build" }).click();
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

  // Saved for the game.
  await page.reload();
  await page.getByRole("searchbox", { name: "Search" }).fill("Qingque");
  await expect(page.getByRole("article", { name: "Qingque" }).locator(".ch-kpis .kpi-label")).toHaveText(["HP", "CRIT DMG", "SPD"]);
  // Back to the role's stats, for the journeys after this one.
  await page.getByRole("group", { name: "Card stats" }).getByRole("button", { name: "Role" }).click();
  await expect.poll(async () => ((await (await page.request.get(`/api/instances/${id}`)).json()) as { cardStats: unknown }).cardStats).toBeNull();
});
