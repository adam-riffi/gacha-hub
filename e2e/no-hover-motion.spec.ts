import { expect, test } from "@playwright/test";

// Round 29 (Georges, 2026-10-31: "remove the hover animations for the dashboards, make it more fit with everything else"):
// a dashboard's graph panels no longer tilt and split into layers under the pointer, and the carousels' chevrons no longer
// slide; hovering changes colour at most, as everywhere else in the app.
test("the dashboards' panels and chevrons do not move under the pointer @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };

  for (const path of ["/", `/games/${id}`]) {
    await page.goto(path);
    const panel = page.locator(".graph .gp").first();
    await expect(panel).toBeVisible();
    const box = (await panel.boundingBox())!;
    // The pointer well off centre, where the tilt was strongest.
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.8);
    await page.waitForTimeout(300);
    const stage = panel.locator(".stage").first();
    expect(await stage.evaluate((el) => getComputedStyle(el).transform), `${path}: the stage under the pointer`).toBe("none");
    expect(await panel.evaluate((el) => getComputedStyle(el).perspective), `${path}: no perspective`).toBe("none");
    expect(await stage.evaluate((el) => getComputedStyle(el).transitionDuration), `${path}: no motion`).toBe("0s");
    const layers = await panel.locator(".lay").evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
    for (const transform of layers) expect(transform, `${path}: a layer`).toBe("none");
  }

  // The banners carousel's chevrons: in place under the pointer.
  await page.goto("/");
  const chevron = page.locator(".banner-card .cv.r");
  await expect(chevron).toBeVisible();
  await chevron.hover();
  await page.waitForTimeout(300);
  expect(await chevron.locator("svg").evaluate((el) => getComputedStyle(el).transform)).toBe("none");
});
