import { expect, test } from "@playwright/test";

test("a game hub's header shows the server, UID, account level and next resets, and edits them @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "wuwa" } });
  const { id } = (await created.json()) as { id: string };

  await page.goto(`/games/${id}`);
  const head = page.getByRole("region", { name: "Wuthering Waves" });
  await expect(head.getByRole("heading", { level: 1, name: "Wuthering Waves" })).toBeVisible();
  await expect(head).toContainText(/Europe · UTC\+1/i);
  await expect(head).toContainText(/manual/i);
  for (const label of [/daily reset/i, /weekly reset/i, /version 3\.7/i]) await expect(head).toContainText(label);

  await head.getByRole("button", { name: "Edit profile" }).click();
  await head.getByLabel("UID").fill("700123456");
  await head.getByLabel("Union Level").fill("58");
  await head.getByRole("button", { name: "Save" }).click();
  await expect(head).toContainText(/UL 58/i);
  await expect(head).toContainText("7•••••••6");

  // The hub's screens, as tabs under the header.
  const tabs = page.getByRole("navigation", { name: "Game screens" });
  await expect(tabs.getByRole("link", { name: "Pulls" })).toBeVisible();
});
