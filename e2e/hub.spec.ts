import { expect, test } from "@playwright/test";

test("a game hub's header shows the account level and next resets, edits the profile, and keeps the server and UID off it @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "wuwa" } });
  const { id } = (await created.json()) as { id: string };

  await page.goto(`/games/${id}/activities`);
  const head = page.getByRole("region", { name: "Wuthering Waves" });
  await expect(head.getByRole("heading", { level: 1, name: "Wuthering Waves" })).toBeVisible();
  await expect(head).not.toContainText(/UTC\+1/); // the server and UID live in the Edit form and on Profile (round 27)
  await expect(head).not.toContainText(/manual/i); // the leftover tag is gone (Georges, 2026-10-10)
  for (const label of [/daily reset/i, /weekly reset/i, /version 3\.7/i]) await expect(head).toContainText(label);

  await head.getByRole("button", { name: "Edit profile" }).click();
  await head.getByLabel("UID").fill("700123456");
  await head.getByLabel("Union Level").fill("58");
  await head.getByRole("button", { name: "Save" }).click();
  await expect(head).toContainText(/UL 58/i);
  await expect(head).not.toContainText("7•••••••6");

  // The hub's screens, as tabs under the header.
  const tabs = page.getByRole("navigation", { name: "Game screens" });
  await expect(tabs.getByRole("link", { name: "Pulls" })).toBeVisible();
});

test("Endfield's hub has a Gear tab but no Planner: its tables publish gear sets but no costs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "endfield" } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/activities`);
    const tabs = page.getByRole("navigation", { name: "Game screens" }).getByRole("link");
    await expect(tabs).toHaveText(["Overview", "Activities", "Endgame", "Pulls", "Characters", "Teams", "Weapons", "Gear", "Profile"]);
  } finally {
    await page.request.delete(`/api/instances/${id}`);
  }
});
