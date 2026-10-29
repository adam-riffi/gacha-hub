import { expect, test } from "@playwright/test";

// Round 24 (Georges, 2026-10-29: "please redo the artifacts, i'm at a loss for words how bad it is"): the filters across the
// top, every piece a big card that says what it is without a click (its set and slot, its main stat large, its substats
// with their values, its wearer by face and name), and the chosen piece in a drawer over the page, closed with a button.
test("Artifacts: filters on top, every piece a big card with its substats and wearer, the chosen piece in a drawer @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Sampo, whom no other journey builds, in a Hunter body with three substats.
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1108" } })).json()) as { id: string };
  await page.request.put(`/api/characters/${build.id}`, {
    data: { doc: { relics: { body: { setName: "Hunter of Glacial Forest", mainStat: "CRIT DMG", level: 15, substats: [{ stat: "SPD", value: 6 }, { stat: "CRIT Rate", value: 7.8 }, { stat: "HP%", value: 4.3 }] } } } },
  });
  try {
    await page.goto(`/games/${id}/gear`);
    const pieces = page.getByRole("region", { name: "Pieces" });
    const card = pieces.getByRole("article", { name: "Hunter of Glacial Forest · Body" }).filter({ hasText: "+15" });
    await expect(card).toBeVisible();

    // The filters across the top, above the pieces, as wide as them.
    const filters = (await page.getByRole("region", { name: "Filters" }).boundingBox())!;
    const grid = (await pieces.boundingBox())!;
    expect(filters.y + filters.height).toBeLessThanOrEqual(grid.y);
    expect(filters.width).toBeGreaterThanOrEqual(grid.width * 0.9);

    // A big card: its set's icon, the slot, the main stat large, the substats with their values, the wearer's face and name.
    expect((await card.boundingBox())!.width).toBeGreaterThanOrEqual(260);
    await expect(card.getByRole("img", { name: "Hunter of Glacial Forest" })).toBeVisible();
    await expect(card).toContainText("Body");
    const main = card.locator(".gb-main");
    await expect(main).toContainText("CRIT DMG");
    expect(parseFloat(await main.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
    const subs = card.getByRole("list", { name: "Substats" });
    await expect(subs.getByRole("listitem")).toHaveCount(3);
    await expect(subs).toContainText("SPD");
    await expect(subs).toContainText("6");
    await expect(subs).toContainText("CRIT Rate");
    await expect(subs).toContainText("7.8");
    expect(parseFloat(await subs.getByRole("listitem").first().evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    const face = card.getByRole("img", { name: "Sampo" });
    await expect(face).toBeVisible();
    expect((await face.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    await expect(card).toContainText("Sampo");

    // Nothing is chosen until a click; then the piece opens in a drawer over the page, the cards staying put, and closes.
    const drawer = page.getByRole("region", { name: "Chosen piece" });
    await expect(drawer).toHaveCount(0);
    const before = (await card.boundingBox())!;
    await card.getByRole("button", { name: "Show Hunter of Glacial Forest · Body" }).click();
    await expect(drawer).toBeVisible();
    expect(await drawer.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
    await expect(drawer.getByRole("combobox", { name: "Substat 1" })).toHaveValue("SPD");
    expect((await card.boundingBox())!.x).toBe(before.x);
    await drawer.getByRole("button", { name: "Close" }).click();
    await expect(drawer).toHaveCount(0);
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
  }
});
