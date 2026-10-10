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
  await expect(page.getByText(/^\d+ \/ \d+ owned$/i)).toBeVisible();

  await page.getByRole("searchbox", { name: "Search" }).fill("Kafka");
  const kafka = page.getByRole("article", { name: "Kafka" });
  await expect(kafka).toContainText("E1");
  await expect(kafka).toContainText("Lv 80");
  await expect(kafka).toContainText("Crit value");
  await expect(kafka).toContainText("60 / 150");
  await expect(kafka.getByRole("link", { name: "Build →" })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);

  await page.getByRole("searchbox", { name: "Search" }).fill("Welt");
  const welt = page.getByRole("article", { name: "Welt" });
  await expect(welt).toContainText("Not owned");
  await welt.getByRole("button", { name: "Wishlist" }).click();
  await expect(welt.getByRole("button", { name: "Wishlist" })).toHaveAttribute("aria-pressed", "true");
  await welt.getByRole("button", { name: "Own" }).click();
  await expect(welt).not.toContainText("Not owned");
});

test("Characters: the Compact view as a table, and the Weapons view with holders, owning and the wishlist @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc: { level: 80, eidolon: 1, lightCone: { catalogId: "23006", name: "Patience Is All You Need", level: 80, superimposition: 2 } } } });
  // The light cone starts unowned and off the wishlist, whatever other journeys did.
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "weapon", catalogId: "23006", owned: false }] } });
  await page.request.put(`/api/instances/${id}/wishlist`, { data: { kind: "weapon", catalogId: "23006", wished: false } });
  await page.goto(`/games/${id}/characters`);

  // Compact: one row per unit, with the card's facts.
  await page.getByRole("searchbox", { name: "Search" }).fill("Kafka");
  await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Compact" }).click();
  const row = page.getByRole("table", { name: "Characters" }).getByRole("row", { name: /Kafka/ }).first();
  await expect(row).toContainText("E1");
  await expect(row).toContainText("Lv 80");
  await expect(row.getByRole("link", { name: "Build →" })).toBeVisible();

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
});
