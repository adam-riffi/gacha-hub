import { expect, test } from "@playwright/test";

const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

// Each game's hub opens on its own Overview (Georges's designs, 2026-10-11).
test("a game's hub opens on its Overview: pulls, pity and banners at a glance, each opening its screen @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/stellarJade`, { data: { value: 1600 } });
  await page.request.put(`/api/instances/${id}/currencies/specialPass`, { data: { value: 3 } });
  await page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-overview", name: "E2E overview warp", kind: "character", startsAt: iso(-1), endsAt: iso(2) }] } });

  await page.goto(`/games/${id}`);
  const tabs = page.getByRole("navigation", { name: "Game screens" }).getByRole("link");
  await expect(tabs.first()).toHaveText(/overview/i);
  await expect(tabs.first()).toHaveAttribute("aria-current", "page");

  // 1,600 Stellar Jade make 10 warps, and 3 passes: 13.
  const pulls = page.getByRole("region", { name: "Pulls" });
  await expect(pulls.getByTestId("pulls-total")).toHaveText("13");
  await expect(pulls).toContainText("From Stellar Jade");
  await expect(page.getByRole("region", { name: "Pity" })).toContainText("/90");
  await expect(page.getByRole("region", { name: "Banners" })).toContainText("ends in");

  await pulls.getByRole("link", { name: "Pulls" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/pulls$`));
});

test("the Overview's second row: today's dailies ticked in place, the pass and the weeklies, stamina with its reserve @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/battery`, { data: { value: 120 } });

  await page.goto(`/games/${id}`);
  // A daily ticked on the card stays ticked; another journey may have ticked it, so this one flips it and back.
  const scratch = page.getByRole("region", { name: "Today" }).getByRole("checkbox", { name: "Scratch Card" });
  const was = await scratch.isChecked();
  await scratch.click();
  await expect(scratch).toBeChecked({ checked: !was });
  await page.reload();
  await expect(page.getByRole("region", { name: "Today" }).getByRole("checkbox", { name: "Scratch Card" })).toBeChecked({ checked: !was });
  await page.getByRole("region", { name: "Today" }).getByRole("checkbox", { name: "Scratch Card" }).click();

  await expect(page.getByRole("region", { name: /New Eridu City Fund and weekly/ })).toContainText("Level");
  const stamina = page.getByRole("region", { name: "Battery Charge" });
  await expect(stamina.getByTestId("stamina")).toHaveText("120 / 240");
  await expect(stamina).toContainText("Backup Battery Charge");
});
