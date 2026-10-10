import { expect, test } from "@playwright/test";

test("Characters: splash cards with their KPIs, counts, search, wishlist and owning @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc: { level: 80, eidolon: 1, stats: { "CRIT Rate": 60, "CRIT DMG": 150, SPD: 134 } } } });
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

test("Characters: the Weapons view with holders, owning and the wishlist @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc: { level: 80, eidolon: 1, lightCone: { catalogId: "23006", name: "Patience Is All You Need", level: 80, superimposition: 2 } } } });
  // The light cone starts unowned and off the wishlist, whatever other journeys did.
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "weapon", catalogId: "23006", owned: false }] } });
  await page.request.put(`/api/instances/${id}/wishlist`, { data: { kind: "weapon", catalogId: "23006", wished: false } });
  await page.goto(`/games/${id}/characters`);

  // Weapons: the catalog's light cones, who holds them, owning and the wishlist.
  await page.getByRole("group", { name: "Show" }).getByRole("button", { name: "Weapons" }).click();
  await page.getByRole("searchbox", { name: "Search" }).fill("Patience");
  const cone = page.getByRole("table", { name: "Weapons" }).getByRole("row", { name: /Patience Is All You Need/ });
  await expect(cone).toContainText("Kafka · S2");
  await cone.getByRole("button", { name: "Wishlist" }).click();
  await expect(cone.getByRole("button", { name: "Wishlist" })).toHaveAttribute("aria-pressed", "true");
  await cone.getByRole("checkbox", { name: "Owned" }).check();
  await expect(cone.getByRole("checkbox", { name: "Owned" })).toBeChecked();
  await expect(page.getByText(/^\d+ \/ \d+ owned$/)).toBeVisible();

  // Farming a weapon, which lived on the Equipment tab: pick the levels, preview the materials.
  await cone.getByRole("button", { name: "Farm" }).click();
  const farm = page.getByRole("region", { name: "Farm Patience Is All You Need" });
  await farm.getByRole("button", { name: "Preview" }).click();
  await expect(farm.getByRole("columnheader", { name: "Missing" })).toBeVisible();

  // Equipment's old link lands on Characters.
  await page.goto(`/games/${id}/equipment`);
  await expect(page).toHaveURL(new RegExp(`/games/${id}/characters$`));
});

test("Characters: every build in one table, and several characters at once @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
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
  await page.getByRole("checkbox", { name: "Select Arlan" }).check();
  await page.getByRole("checkbox", { name: "Select Herta" }).check();
  const selection = page.getByRole("region", { name: "Selection" });
  await expect(selection).toContainText("2 selected");
  await selection.getByRole("button", { name: "Own", exact: true }).click();
  await expect(page.getByRole("article", { name: "Arlan" })).not.toContainText("Not owned");
  await expect(page.getByRole("article", { name: "Herta" })).not.toContainText("Not owned");
});
