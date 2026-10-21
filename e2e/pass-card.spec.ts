import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// Round 18 (Georges, round 17: "BP cards"): the battle pass card stands on the game's key art, the pass's own picture small
// in the band beside its name, never blown up as the backdrop; Home's tables keep each game's icon beside its name.
test("the battle pass card shows the game's key art behind and the pass icon in the band; Home's Stamina table keeps the icon beside the name @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
  const put = async (slot: string) => expect((await page.request.put(`/api/art/${slot}`, { multipart: { file: { name: "art.png", mimeType: "image/png", buffer: PNG } } })).ok(), slot).toBe(true);
  await put("hsr/key-art");
  await put("hsr/battle-pass");
  try {
    await page.goto("/?game=hsr");
    const card = page.locator(".pass-card");
    await expect(card.locator("img.hero-art")).toHaveAttribute("src", /\/uploads\//);
    const icon = card.locator(".band img.pass-art");
    await expect(icon).toBeVisible();
    const box = (await icon.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(64);
    // The backdrop is the key art, not the pass picture: the pass picture is small, in the band.
    expect(await card.locator("img.hero-art").getAttribute("src")).not.toBe(await icon.getAttribute("src"));

    await page.goto("/");
    const stamina = page.getByRole("region", { name: "Stamina" });
    const mark = stamina.locator("img.list-mark, svg.list-mark").first();
    const name = stamina.locator(".rw").first().locator("span").first();
    const markBox = (await mark.boundingBox())!;
    const nameBox = (await name.boundingBox())!;
    expect(nameBox.height, "icon and name on one line").toBeLessThan(markBox.height + 16);
  } finally {
    for (const slot of ["hsr/key-art", "hsr/battle-pass"]) await page.request.delete(`/api/art/${slot}`);
  }
});
