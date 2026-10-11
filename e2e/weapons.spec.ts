import { expect, test } from "@playwright/test";

test("Weapons: a tab of its own, every weapon with owned, level, refinement and copies, who wields it, the wishlist and farming @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc: { level: 80, lightCone: { catalogId: "23006", name: "Patience Is All You Need", level: 80, superimposition: 2 } } } })).json()) as { id: string };
  await page.request.put(`/api/characters/${build.id}`, { data: { isDefault: true } });
  // The light cone starts unowned and off the wishlist, whatever other journeys did.
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "weapon", catalogId: "23006", owned: false }] } });
  await page.request.put(`/api/instances/${id}/wishlist`, { data: { kind: "weapon", catalogId: "23006", wished: false } });

  await page.goto(`/games/${id}/characters`);
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Weapons" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/weapons$`));
  // Characters keeps Characters and Builds; weapons live here.
  await page.getByRole("searchbox", { name: "Search" }).fill("Patience");
  const cone = page.getByRole("table", { name: "Weapons" }).getByRole("row", { name: /Patience Is All You Need/ });
  await expect(cone).toContainText("Kafka · S2");
  await cone.getByRole("checkbox", { name: "Owned" }).check();
  await cone.getByRole("spinbutton", { name: "Level" }).fill("80");
  await cone.getByRole("spinbutton", { name: "Level" }).blur();
  await cone.getByRole("spinbutton", { name: "Superimposition" }).fill("3");
  await cone.getByRole("spinbutton", { name: "Superimposition" }).blur();
  await expect
    .poll(async () => ((await (await page.request.get(`/api/instances/${id}/ownership`)).json()) as { catalogId: string; meta: unknown }[]).find((o) => o.catalogId === "23006")?.meta)
    .toEqual({ level: 80, refinement: 3 });
  await page.reload();
  await page.getByRole("searchbox", { name: "Search" }).fill("Patience");
  await expect(page.getByRole("table", { name: "Weapons" }).getByRole("row", { name: /Patience Is All You Need/ }).getByRole("spinbutton", { name: "Level" })).toHaveValue("80");

  const row = page.getByRole("table", { name: "Weapons" }).getByRole("row", { name: /Patience Is All You Need/ });
  await row.getByRole("button", { name: "Wishlist" }).click();
  await expect(row.getByRole("button", { name: "Wishlist" })).toHaveAttribute("aria-pressed", "true");
  await row.getByRole("button", { name: "Farm" }).click();
  await expect(page.getByRole("region", { name: "Farm Patience Is All You Need" })).toBeVisible();

  // Equipment's old link lands on Characters.
  await page.goto(`/games/${id}/equipment`);
  await expect(page).toHaveURL(new RegExp(`/games/${id}/characters$`));
});
