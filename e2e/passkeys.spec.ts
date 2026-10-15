import { expect, test } from "@playwright/test";

// ADR 0010: the owner adds a passkey once signed in (with the password here), then signs in with it. Chrome's test
// authenticator stands in for Windows Hello or a phone.
test("the owner adds a passkey in Settings and signs in with it; it can be removed @smoke", async ({ page }) => {
  const devtools = await page.context().newCDPSession(page);
  await devtools.send("WebAuthn.enable");
  await devtools.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });

  await page.goto("/");
  await page.getByLabel("Owner password").fill("e2e-owner-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.goto("/settings/account");
  const passkeys = page.getByRole("region", { name: "Passkeys" });
  await passkeys.getByRole("button", { name: "Add a passkey" }).click();
  await expect(passkeys.getByRole("listitem")).toHaveCount(1);
  await expect(passkeys.getByRole("listitem").first()).toContainText("added");

  await page.getByRole("region", { name: "Account and data" }).getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Sign in with a passkey" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.goto("/settings/account");
  await expect(passkeys.getByRole("listitem").first()).toContainText("last used");
  await passkeys.getByRole("button", { name: /^Remove / }).click();
  await expect(passkeys.getByRole("listitem")).toHaveCount(0);
});
