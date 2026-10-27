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

    // The art store's public URL override reaches the web app at once, no rebuild (round 21: the bucket's own URL sits beside it).
    const base = page.getByRole("region", { name: "Art store" }).getByRole("group", { name: "Public URL override", exact: true });
    await base.getByRole("textbox", { name: "Public URL override", exact: true }).fill("https://pub-0123abcd.r2.dev");
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

const R2_KEYS = ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_URL", "CF_ANALYTICS_TOKEN", "ASSET_BASE"];
const SECRET = "fad5000000000000000000000000000000000000000000000000000000009505";

// Georges, 2026-10-27 (one paste instead of six fields): the Art store's six values in one paste.
test("Settings → Keys: the owner pastes the whole block of Cloudflare values once; the app sorts them into the fields and says what it kept @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  try {
    await page.goto("/settings/keys");
    const art = page.getByRole("region", { name: "Art store" });
    const box = art.getByRole("group", { name: "Paste all the Art store values" });
    await box.getByLabel("Or paste all six at once").fill(
      [
        "here is the token cfat_theStoreTokenItselfNotNeeded0000000000a1",
        "account id: f1300000000000000000000000000152",
        "bucket: gacha-hub-art",
        "Access Key ID de550000000000000000000000002294",
        `Secret Access Key ${SECRET}`,
        "public url https://pub-37780000000000000000000000087ac.r2.dev/",
        "analytics token: cfat_testOnlyNotARealTokenValue000000000000e16b",
      ].join("\n"),
    );
    await box.getByRole("button", { name: "Save all" }).click();
    const outcome = box.getByRole("status");
    await expect(outcome).toContainText("Saved: Cloudflare account ID, Bucket, Access Key ID, Secret Access Key, Bucket public URL, Analytics token");
    await expect(outcome).toContainText("Not placed, line 1");
    for (const label of ["Cloudflare account ID", "Bucket", "Access Key ID", "Secret Access Key", "Bucket public URL", "Analytics token"]) {
      await expect(art.getByRole("group", { name: label, exact: true })).toContainText("In the app");
    }
    await expect(box.getByLabel("Or paste all six at once")).toHaveValue("");
    await expect(page.locator("body")).not.toContainText(SECRET.slice(-12));
    expect(((await (await page.request.get("/api/me")).json()) as { assetBase: string | null }).assetBase).toBe("https://pub-37780000000000000000000000087ac.r2.dev/assets");
  } finally {
    for (const name of R2_KEYS) await page.request.delete(`/api/settings/keys/${name}`);
  }
});
