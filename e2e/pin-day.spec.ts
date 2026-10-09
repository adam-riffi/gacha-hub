import { expect, test } from "@playwright/test";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

test("pinning a past day switches Home to that day until BACK TO TODAY @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });

  // A pinned day lives in the URL, so it survives a reload and the back button.
  const d = new Date();
  d.setDate(d.getDate() - 10);
  await page.goto(`/?game=hsr&day=${iso(d)}`);
  const banner = page.getByRole("status", { name: "Viewing a past day" });
  await expect(banner).toContainText(`VIEWING · ${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getDay()]} ${iso(d)}`);
  await expect(page.locator(".dailies-card")).toContainText("DAY CLOSED");

  await page.getByRole("button", { name: "Back to today" }).click();
  await expect(banner).toHaveCount(0);
  await expect(page).not.toHaveURL(/day=/);
  await expect(page.locator(".dailies-card")).toContainText(/resets in/i);
});
