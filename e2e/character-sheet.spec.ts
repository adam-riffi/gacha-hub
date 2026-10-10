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
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Character" }).getByLabel("Level")).toHaveValue("80");

  // No Role, no "game's defaults" button, no second sheet (Georges, 2026-10-11).
  await expect(page.getByRole("combobox", { name: "Role" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /game's defaults/ })).toHaveCount(0);
  await expect(page.getByText(/More details/)).toHaveCount(0);
});

test("Character sheet: a character opens on its default build; builds switch by tab, and another can become the default @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Herta's builds start from nothing, whatever other journeys did.
  for (const b of ((await (await page.request.get(`/api/instances/${id}/characters`)).json()) as { id: string; catalogId: string }[]).filter((x) => x.catalogId === "1013")) {
    await page.request.delete(`/api/characters/${b.id}`);
  }
  const first = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1013", doc: { level: 60 } } })).json()) as { id: string };

  await page.goto(`/characters/${first.id}`);
  const tabs = page.getByRole("tablist", { name: "Builds" });
  await expect(tabs.getByRole("tab", { name: "Build 1 ★" })).toHaveAttribute("aria-selected", "true");
  await tabs.getByRole("button", { name: "+ New build" }).click();
  await expect(page).not.toHaveURL(new RegExp(first.id));
  await expect(page.getByRole("heading", { name: "Herta", exact: true })).toBeVisible();
  await expect(tabs.getByRole("tab", { name: "Build 2" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Make default" }).click();
  await expect(tabs.getByRole("tab", { name: "Build 2 ★" })).toBeVisible();

  // Characters opens the default build.
  await page.goto(`/games/${id}/characters`);
  await page.getByRole("searchbox", { name: "Search" }).fill("Herta");
  await page.getByRole("article", { name: "Herta", exact: true }).click();
  await expect(page.getByRole("tablist", { name: "Builds" }).getByRole("tab", { name: "Build 2 ★" })).toHaveAttribute("aria-selected", "true");
});

test("Character sheet: KPI targets on the tiles, and the teams the character is used in @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc: { level: 80, stats: { SPD: 130 } } } })).json()) as { id: string };
  await page.request.post(`/api/instances/${id}/teams`, { data: { name: "E2E Kafka DoT", members: ["1005", "1006"] } });

  await page.goto(`/characters/${build.id}`);
  const spd = page.getByRole("region", { name: "KPIs" }).getByRole("group", { name: "SPD" });
  await spd.getByRole("spinbutton", { name: "SPD target" }).fill("134");
  await spd.getByRole("spinbutton", { name: "SPD target" }).blur();
  await expect(spd).toContainText("4 short");
  await page.reload();
  await expect(page.getByRole("region", { name: "KPIs" }).getByRole("group", { name: "SPD" }).getByRole("spinbutton", { name: "SPD target" })).toHaveValue("134");

  await expect(page.getByRole("region", { name: "Used in" })).toContainText("E2E Kafka DoT");

});
  await expect(spd2.getByRole("spinbutton", { name: "SPD target" })).toHaveValue("134");
  await expect(spd2).toContainText("default");
  await page.request.put(`/api/instances/${id}`, { data: { kpiTargets: null } });
});
