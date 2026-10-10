import { expect, test } from "@playwright/test";

test("Character sheet: identity, KPIs, character, skills, weapon, stats and the gear block, saved @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const doc = {
    level: 70,
    eidolon: 1,
    traces: { basic: 5, skill: 8 },
    lightCone: { name: "Patience Is All You Need", level: 70, superimposition: 1 },
    stats: { "CRIT Rate": 50, "CRIT DMG": 120, SPD: 140 },
    relics: { head: { setName: "Prisoner in Deep Confinement", mainStat: "HP", level: 15, substats: [{ stat: "CRIT Rate", value: 6.5 }, { stat: "CRIT DMG", value: 13 }] } },
  };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc } })).json()) as { id: string };

  await page.goto(`/characters/${build.id}`);
  await expect(page.getByRole("heading", { name: "Kafka" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Characters" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "KPIs" })).toContainText("50 / 120");
  const character = page.getByRole("region", { name: "Character" });
  await expect(character.getByLabel("Level")).toHaveValue("70");
  await expect(character).toContainText("E1");
  await expect(page.getByRole("region", { name: "Traces" }).getByLabel("skill now")).toHaveValue("8");
  await expect(page.getByRole("region", { name: "Weapon" })).toContainText("S1");
  await expect(page.getByRole("region", { name: "Relics" })).toContainText("CV 26");

  await character.getByLabel("Level").fill("80");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Character" }).getByLabel("Level")).toHaveValue("80");
});
