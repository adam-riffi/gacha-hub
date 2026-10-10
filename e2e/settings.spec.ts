import { expect, test } from "@playwright/test";

/** Ten Star Rail character-event warps at 18:00 server time, the 5★ (Kafka) at the 7th. */
const uigf = {
  info: { export_timestamp: 1791600000, export_app: "Test", export_app_version: "1", version: "v4.2" },
  hkrpg: [
    {
      uid: "800000001",
      timezone: 8,
      list: Array.from({ length: 10 }, (_, i) => ({ gacha_type: "11", gacha_id: "1", item_id: i === 6 ? "1005" : "20000", count: "1", time: "2026-09-02 18:00:00", rank_type: i === 6 ? "5" : "3", id: `18000000000000001${String(i).padStart(2, "0")}` })),
    },
  ],
};

test("Settings: linked accounts, pull history from a UIGF file and a link, notifications, account and data @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

  // Linked accounts: read only, as ADR 0005 decided (no check-in, no codes).
  const linked = page.getByRole("region", { name: "Linked accounts" });
  await expect(linked.getByRole("article", { name: "HoYoLAB" })).toContainText("Not linked");
  await expect(linked).not.toContainText(/check-in|redeem/i);

  // Pull history: a UIGF file, then a link without its key.
  const pulls = page.getByRole("region", { name: "Pull history" });
  await pulls.getByLabel("UIGF file for Honkai: Star Rail").setInputFiles({ name: "uigf.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(uigf)) });
  await expect(pulls.getByRole("status")).toHaveText("10 added, 0 already there");
  await expect(pulls.getByRole("link", { name: "Export UIGF" }).first()).toHaveAttribute("href", /\/pulls\/uigf$/);
  await pulls.getByRole("row", { name: /Honkai: Star Rail/ }).getByRole("button", { name: "Paste link" }).click();
  await pulls.getByRole("textbox", { name: "History link for Honkai: Star Rail" }).fill("https://example.com/?lang=en");
  await pulls.getByRole("button", { name: "Import" }).click();
  await expect(pulls.getByRole("status")).toContainText("No authkey in this link");

  // Notifications at a glance, rules on Tasks.
  const notes = page.getByRole("region", { name: "Notifications" });
  await expect(notes).toContainText("Time zone");
  await expect(notes.getByRole("link", { name: "Manage reminder rules" })).toHaveAttribute("href", "/tasks");

  // Account and data: deleting asks for the username typed back.
  const account = page.getByRole("region", { name: "Account and data" });
  await expect(account.getByRole("link", { name: "JSON" })).toHaveAttribute("href", "/api/export");
  await account.getByRole("button", { name: "Delete", exact: true }).click();
  await account.getByRole("textbox").fill("not me");
  await account.getByRole("button", { name: "Delete for good" }).click();
  await expect(account).toContainText("That is not your username.");
});
