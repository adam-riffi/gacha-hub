import { expect, test } from "@playwright/test";

// Round 26 (Georges, 2026-10-30: "the new goal window is unusable, it is way too small, you can't do anything in it"):
// the quick build takes most of the screen, 1000 px wide at 1440, its controls 44 px or taller, its labels 15 px.
test("the quick build window is large, with tall controls @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto(`/games/${id}/planner`);
  await page.getByRole("region", { name: "Goals" }).getByRole("button", { name: "New goal" }).click();
  const quick = page.getByRole("dialog", { name: "Quick build goal" });
  await expect(quick).toBeVisible();
  expect((await quick.boundingBox())!.width).toBeGreaterThanOrEqual(1000);
  await quick.getByRole("combobox", { name: "Character" }).fill("Welt");
  await page.getByRole("option", { name: /^Welt/ }).click();
  const controls = [
    quick.getByRole("combobox", { name: "Ascension" }),
    quick.getByRole("group", { name: "Skill levels" }).getByRole("spinbutton").first(),
    quick.getByRole("combobox", { name: "Weapon" }),
    quick.getByRole("combobox", { name: "Set to farm" }),
    quick.getByRole("button", { name: "Make goal" }),
  ];
  for (const control of controls) {
    await expect(control).toBeVisible();
    expect((await control.boundingBox())!.height, await control.evaluate((el) => el.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(44);
  }
  const labelSize = await quick.locator(".kpi-label").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(labelSize).toBeGreaterThanOrEqual(15);
  await quick.getByRole("button", { name: "Close" }).click();
  await expect(quick).toHaveCount(0);
});
