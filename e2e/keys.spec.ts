import { expect, test } from "@playwright/test";

const BOT_TOKEN = "test-only-bot-token.not-a-discord-token.0123456789abcdefghij";
const KEYS = ["DISCORD_APP_ID", "DISCORD_BOT_TOKEN", "CRON_SECRET", "ASSET_BASE"];

// ADR 0012 (Georges: "settings where i can input my keys/secrets ... i don't have to put it on github just the app directly").
test("Settings → Keys: the owner enters each key, sees where it comes from, and never sees a secret again @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  try {
    await page.goto("/settings");
    await page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Keys", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/keys$/);

    // A card per service, each key with its state.
    for (const group of ["Sign-in", "Discord bot", "Schedule", "Art store"]) await expect(page.getByRole("region", { name: group })).toBeVisible();
    const bot = page.getByRole("region", { name: "Discord bot" });
    const appId = bot.getByRole("group", { name: "Application ID" });
    await expect(appId).toContainText("Missing");

    // Not a secret: shown once saved, so a typo can be seen.
    await appId.getByRole("textbox", { name: "Application ID" }).fill("123456789012345678");
    await appId.getByRole("button", { name: "Save" }).click();
    await expect(appId).toContainText("In the app");
    await expect(appId).toContainText("123456789012345678");

    // A secret: saved, the field emptied, never on the page again.
    const token = bot.getByRole("group", { name: "Bot token" });
    await token.getByLabel("Bot token").fill(BOT_TOKEN);
    await token.getByRole("button", { name: "Save" }).click();
    await expect(token).toContainText("In the app");
    await expect(token.getByLabel("Bot token")).toHaveValue("");
    await expect(page.locator("body")).not.toContainText(BOT_TOKEN.slice(-12));

    // A malformed value says so and saves nothing.
    const cron = page.getByRole("region", { name: "Schedule" }).getByRole("group", { name: "Cron secret" });
    await cron.getByLabel("Cron secret").fill("short");
    await cron.getByRole("button", { name: "Save" }).click();
    await expect(cron).toContainText("Not valid");
    await expect(cron).toContainText("Missing");
    // One click makes a strong one.
    await cron.getByRole("button", { name: "Generate" }).click();
    await expect(cron).toContainText("In the app");

    // The art store's public URL reaches the web app at once, no rebuild.
    const base = page.getByRole("region", { name: "Art store" }).getByRole("group", { name: "Public URL" });
    await base.getByRole("textbox", { name: "Public URL" }).fill("https://pub-0123abcd.r2.dev");
    await base.getByRole("button", { name: "Save" }).click();
    await expect(base).toContainText("In the app");
    expect(((await (await page.request.get("/api/me")).json()) as { assetBase: string | null }).assetBase).toBe("https://pub-0123abcd.r2.dev");

    // Cleared: missing again.
    await token.getByRole("button", { name: "Clear" }).click();
    await expect(token).toContainText("Missing");
  } finally {
    for (const name of KEYS) await page.request.delete(`/api/settings/keys/${name}`);
  }
});
