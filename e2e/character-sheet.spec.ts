import { expect, test } from "@playwright/test";

test("Character sheet: identity, KPIs, character, skills, weapon, stats and the gear block, saved @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
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
  await expect(page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Roster" })).toHaveAttribute("aria-current", "page");
  // Every stat a card (round 8): no row of highlighted stats over them.
  await expect(page.getByRole("region", { name: "KPIs" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Combat stats" }).getByRole("spinbutton", { name: "CRIT Rate", exact: true })).toHaveValue("50");
  const character = page.getByRole("region", { name: "Character" });
  await expect(character.getByLabel("Level")).toHaveValue("70");
  await expect(character).toContainText("E1");
  await expect(page.getByRole("region", { name: "Traces" }).getByLabel("skill now")).toHaveValue("8");
  await expect(page.getByRole("region", { name: "Weapon" })).toContainText("S1");
  await expect(page.getByRole("region", { name: "Relics" })).toContainText("CV 26");

  // Pickers (Georges, 2026-10-11): type or scroll, each option with its icon, the list right under its field.
  const weaponPicker = page.getByRole("region", { name: "Weapon" }).getByRole("combobox", { name: "Weapon name" });
  await weaponPicker.fill("Patience");
  const option = page.getByRole("listbox", { name: "Weapon name" }).getByRole("option", { name: "Patience Is All You Need" });
  await expect(option.getByRole("img")).toHaveCount(1);
  const field = await weaponPicker.boundingBox();
  const list = await page.getByRole("listbox", { name: "Weapon name" }).boundingBox();
  expect(Math.abs(list!.y - (field!.y + field!.height))).toBeLessThan(12);
  await option.click();
  await expect(weaponPicker).toHaveValue("Patience Is All You Need");
  const setPicker = page.getByRole("region", { name: "Relics" }).getByRole("combobox", { name: "Head set" });
  await setPicker.fill("Musketeer");
  await page.getByRole("listbox", { name: "Head set" }).getByRole("option", { name: /Musketeer/ }).click();
  await expect(setPicker).toHaveValue(/Musketeer/);

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
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Pela's builds start from nothing; no other journey uses her.
  for (const b of ((await (await page.request.get(`/api/instances/${id}/characters`)).json()) as { id: string; catalogId: string }[]).filter((x) => x.catalogId === "1106")) {
    await page.request.delete(`/api/characters/${b.id}`);
  }
  const first = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1106", doc: { level: 60 } } })).json()) as { id: string };

  await page.goto(`/characters/${first.id}`);
  const tabs = page.getByRole("tablist", { name: "Builds" });
  await expect(tabs.getByRole("tab", { name: "Build 1 ★" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "+ New build" }).click();
  await expect(page).not.toHaveURL(new RegExp(first.id));
  await expect(page.getByRole("heading", { name: "Pela", exact: true })).toBeVisible();
  await expect(tabs.getByRole("tab", { name: "Build 2" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Make default" }).click();
  await expect(tabs.getByRole("tab", { name: "Build 2 ★" })).toBeVisible();

  // Characters opens the default build.
  await page.goto(`/games/${id}/characters`);
  await page.getByRole("searchbox", { name: "Search" }).fill("Pela");
  await page.getByRole("article", { name: "Pela", exact: true }).click();
  await expect(page.getByRole("tablist", { name: "Builds" }).getByRole("tab", { name: "Build 2 ★" })).toHaveAttribute("aria-selected", "true");
});

test("Character sheet: KPI targets on the tiles, and the teams the character is used in @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc: { level: 80, stats: { SPD: 130 } } } })).json()) as { id: string };
  await page.request.post(`/api/instances/${id}/teams`, { data: { name: "E2E Kafka DoT", members: ["1005", "1006"] } });

  await page.goto(`/characters/${build.id}`);
  const spd = page.getByRole("region", { name: "Combat stats" }).getByRole("group", { name: "SPD" });
  await spd.getByRole("spinbutton", { name: "SPD target" }).fill("134");
  await spd.getByRole("spinbutton", { name: "SPD target" }).blur();
  await expect(spd).toContainText("4 short");
  await page.reload();
  await expect(page.getByRole("region", { name: "Combat stats" }).getByRole("group", { name: "SPD" }).getByRole("spinbutton", { name: "SPD target" })).toHaveValue("134");

  await expect(page.getByRole("region", { name: "Used in" })).toContainText("E2E Kafka DoT");
});

test("Character sheet: each skill opens to its description @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  // The smoke journey adds Genshin through the Games page, so this one removes its profile.
  try {
    const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "10000014" } })).json()) as { id: string };
    await page.goto(`/characters/${build.id}`);
    const skills = page.getByRole("region", { name: "Talents" });
    await skills.getByText("Let the Show Begin♪").click();
    await expect(skills).toContainText("Melody Loop");
  } finally {
    await page.request.delete(`/api/instances/${id}`);
  }
});

// Georges, round 6: "when unrolling the talent effect it stretches everything; I'd rather read it in a bubble; also add the
// talent icon … a misc part for each character where non-upgradable talents, skins and other things are included, or where I
// could write notes or add pictures".
test("Character sheet: a talent's effect in a bubble over the card, with its icon; the misc: passives, skins, notes and pictures @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  try {
    const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "10000014" } })).json()) as { id: string };
    await page.goto(`/characters/${build.id}`);
    const skills = page.getByRole("region", { name: "Talents" });
    await expect(skills.getByRole("img", { name: "Let the Show Begin♪" })).toBeVisible();
    const height = (await skills.boundingBox())!.height;
    await skills.getByRole("button", { name: "Let the Show Begin♪" }).click();
    const bubble = page.getByRole("note", { name: "Let the Show Begin♪" });
    await expect(bubble).toContainText("Melody Loop");
    // Over the card: the card keeps its height.
    expect((await skills.boundingBox())!.height).toBe(height);
    await page.getByRole("heading", { name: "Talents" }).click();
    await expect(bubble).toHaveCount(0);

    const misc = page.getByRole("region", { name: "Misc" });
    // The passives the talents do not level, with their icons and effects.
    await expect(misc.getByRole("img", { name: "Glorious Season" })).toBeVisible();
    await misc.getByRole("button", { name: "Encore" }).click();
    await expect(page.getByRole("note", { name: "Encore" })).toContainText("Elemental Orb");
    await misc.getByRole("heading", { name: "Misc" }).click();
    await misc.getByRole("textbox", { name: "Add a skin" }).fill("Summertime Sparkle");
    await misc.getByRole("button", { name: "Add", exact: true }).click();
    await expect(misc.getByRole("listitem").filter({ hasText: "Summertime Sparkle" })).toBeVisible();
    // Several notes (round 7): added, edited, deleted.
    const notes = misc.getByRole("list", { name: "Notes" });
    for (const text of ["C6 when she reruns", "Hydro healer", "Remove me"]) {
      await misc.getByRole("textbox", { name: "Add a note" }).fill(text);
      await misc.getByRole("button", { name: "Add note" }).click();
    }
    await expect(notes.getByRole("listitem")).toHaveCount(3);
    await notes.getByRole("listitem").nth(1).getByRole("button", { name: "Edit" }).click();
    await notes.getByRole("listitem").nth(1).getByRole("textbox").fill("Hydro healer for Nilou");
    await notes.getByRole("listitem").nth(1).getByRole("button", { name: "Save note" }).click();
    await notes.getByRole("listitem").nth(2).getByRole("button", { name: "Delete" }).click();
    await expect(notes.getByRole("listitem")).toHaveCount(2);
    // A picture, and a note under it.
    await misc.getByLabel("Add a picture").setInputFiles({ name: "pic.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64") });
    await expect(misc.getByRole("img", { name: "Picture 1" })).toBeVisible();
    await misc.getByRole("textbox", { name: "Note for picture 1" }).fill("My Barbara at 90");
    await misc.getByRole("textbox", { name: "Note for picture 1" }).blur();
    await expect
      .poll(async () => {
        const m = ((await (await page.request.get(`/api/characters/${build.id}`)).json()) as { misc: { notes?: string[]; skins?: string[]; pictures?: { url: string; note?: string }[] } | null }).misc;
        return [m?.notes, m?.skins, m?.pictures?.map((p) => p.note)];
      })
      .toEqual([["C6 when she reruns", "Hydro healer for Nilou"], ["Summertime Sparkle"], ["My Barbara at 90"]]);
  } finally {
    await page.request.delete(`/api/instances/${id}`);
  }
});

// Georges, round 6: "base stats should be auto included for everything: characters, weapons, gear".
test("Character sheet: the base stats of the level and the weapon fill what is not typed, marked as base @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // A build of its own for Kafka at 80 with Arrows at 80: 1086.62 + 846.72 HP, 679.14 + 317.52 ATK, SPD 100, crit 5 / 50.
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc: { level: 80, lightCone: { catalogId: "20000", name: "Arrows", level: 80 }, traces: {}, relics: {}, stats: {} } } })).json()) as { id: string };
  try {
    await page.goto(`/characters/${build.id}`);
    const stats = page.getByRole("region", { name: "Combat stats" });
    await expect(stats.getByRole("spinbutton", { name: "HP", exact: true })).toHaveAttribute("placeholder", "1933 base");
    await expect(stats.getByRole("spinbutton", { name: "ATK", exact: true })).toHaveAttribute("placeholder", "997 base");
    await expect(stats.getByRole("spinbutton", { name: "SPD", exact: true })).toHaveAttribute("placeholder", "100 base");
    // A stat's card marks a base value as such until one is typed.
    await expect(stats.getByRole("group", { name: "SPD" })).toHaveClass(/is-auto/);
    await stats.getByRole("spinbutton", { name: "SPD", exact: true }).fill("134");
    await expect(stats.getByRole("group", { name: "SPD" })).not.toHaveClass(/is-auto/);
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
  }
});

// Georges, round 7: "artifact/gear's icons are too small, and even the artifact section has a very small place for the icons, which convey
// a lot of info by themselves … stat icons should also be used when possible".
test("Character sheet: each gear piece's set as a large icon; stat icons beside the KPIs, the stats and the gear's stats @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const doc = { level: 80, stats: { SPD: 130 }, relics: { head: { setName: "Prisoner in Deep Confinement", mainStat: "HP", level: 15, substats: [{ stat: "CRIT Rate", value: 6.5 }] } }, traces: {}, lightCone: {} };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005", doc } })).json()) as { id: string };
  try {
    await page.goto(`/characters/${build.id}`);
    await expect(page.getByRole("region", { name: "Combat stats" }).getByRole("group", { name: "SPD" }).locator("svg.stat-icon[data-stat=spd]")).toBeVisible();
    await expect(page.getByRole("region", { name: "Combat stats" }).getByRole("group", { name: "HP" }).locator("svg.stat-icon[data-stat=hp]")).toBeVisible();
    const head = page.getByRole("region", { name: "Relics" }).getByRole("group", { name: "Head" });
    const icon = head.getByRole("img", { name: "Prisoner in Deep Confinement" });
    await expect(icon).toBeVisible();
    await expect.poll(async () => (await icon.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(56);
    await expect(head.locator("svg.stat-icon[data-stat=hp]")).toBeVisible();
    await expect(head.locator("svg.stat-icon[data-stat=critRate]")).toBeVisible();
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
  }
});

// Georges, round 7: "quick goal is too small and hidden at the bottom; it should be one of the first things I can do, and it forces me to
// only have skills at level 1 for some reason".
test("Character sheet: Quick goal at the top; the Traveler's skills go past 1 though the data has no costs for them @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  try {
    const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "10000005" } })).json()) as { id: string };
    await page.goto(`/characters/${build.id}`);
    const head = page.locator(".sh-head");
    await head.getByRole("button", { name: "Quick goal" }).click();
    const skills = page.getByRole("dialog", { name: "Quick build goal" }).getByRole("group", { name: "Skill levels" }).getByRole("spinbutton");
    await expect(skills.first()).toHaveValue("10");
    await expect(skills.nth(1)).toHaveValue("6");
    expect(Number(await skills.first().getAttribute("max"))).toBeGreaterThanOrEqual(10);
  } finally {
    await page.request.delete(`/api/instances/${id}`);
  }
});

