import { expect, test } from "@playwright/test";

const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

test("Tasks: farm today, goals with their steps, filtering, and an event goal claimed from its card @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Herta starts unowned and without builds, whatever other journeys did: the reward reads "new".
  for (const b of ((await (await page.request.get(`/api/instances/${id}/characters`)).json()) as { id: string; catalogId: string }[]).filter((x) => x.catalogId === "1013")) {
    await page.request.delete(`/api/characters/${b.id}`);
  }
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1013", owned: false }] } });
  const parent = (await (await page.request.post("/api/tasks", { data: { scope: "game", refId: id, type: "goal", title: "Farm Asta" } })).json()) as { id: string };
  await page.request.post("/api/tasks", { data: { scope: "game", refId: id, type: "goal", title: "Farm Lifeless Blade", target: 5, materialId: "110112", parentId: parent.id } });
  await page.request.post("/api/admin/payload", {
    data: {
      kind: "events",
      gameKey: "hsr",
      items: [{ key: "e2e-tasks", name: "E2E tasks reward", startsAt: iso(-1), endsAt: iso(5), effects: [{ kind: "unit.copy", unit: "character", catalogId: "1013", count: 1 }, { kind: "goal.create", title: "Stages", stages: ["Stage 1", "Stage 2"] }] }],
    },
  });
  const events = (await (await page.request.get("/api/games/hsr/events")).json()) as { id: string; key: string }[];
  await page.request.post(`/api/events/${events.find((e) => e.key === "e2e-tasks")!.id}/goal`, { data: { instanceId: id } });

  await page.goto("/tasks?game=hsr");
  await expect(page.getByRole("heading", { name: "Tasks and reminders" })).toBeVisible();
  // Farm today as icons: the material Asta needs, any day; no game name on a game's own page.
  const farmToday = page.getByRole("region", { name: "Farm today" });
  await expect(farmToday.getByRole("img", { name: "Lifeless Blade" }).first()).toBeVisible();
  await expect(farmToday).toContainText("any day");
  await expect(farmToday).not.toContainText("Star Rail");

  const goals = page.getByRole("region", { name: "Goals" });
  const event = goals.getByRole("article", { name: "E2E tasks reward" });
  await expect(event).toContainText("→ Herta new → E0");
  // A click on the goal itself opens it (Georges, 2026-10-11).
  await event.getByRole("button", { name: /E2E tasks reward/ }).click();
  await event.getByRole("checkbox", { name: "Stage 1" }).check();
  await expect(event).toContainText("1 / 2");
  await event.getByRole("button", { name: "Claim" }).click();
  await expect(event).toContainText("Claimed");
  const owned = (await (await page.request.get(`/api/instances/${id}/ownership`)).json()) as { catalogId: string }[];
  expect(owned.some((o) => o.catalogId === "1013")).toBe(true);

  const farm = goals.getByRole("article", { name: "Farm Asta" });
  await farm.getByRole("button", { name: /Farm Asta/ }).click();
  await expect(farm.getByText("Lifeless Blade")).toBeVisible();
  await expect(farm).toContainText("0 / 5");

  await page.getByRole("textbox", { name: "Filter" }).fill("Asta");
  await expect(farm).toBeVisible();
  await expect(event).toHaveCount(0);
});

test("Tasks: reminder rules across games, quiet hours, and the DM preview @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });

  await page.goto("/tasks?game=hsr");
  const reminders = page.getByRole("complementary", { name: "Reminders" });
  await reminders.getByRole("checkbox", { name: "Stamina full" }).check();
  await expect(reminders.getByRole("listitem").filter({ hasText: "Stamina full" })).toContainText("ALL");

  const preview = page.getByRole("region", { name: "Preview" });
  await expect(preview).toContainText("Honkai: Star Rail resets in");

  await reminders.getByRole("button", { name: "Edit quiet hours" }).click();
  await reminders.getByLabel("Quiet from").fill("23:00");
  await reminders.getByLabel("Quiet until").fill("07:00");
  await reminders.getByRole("button", { name: "Save" }).click();
  await expect(reminders).toContainText("23:00–07:00");

  await preview.getByRole("button", { name: "Send a test DM" }).click();
  await expect(preview).toContainText("Discord isn't set up");
});

test("Tasks: the goal maker makes anything: a gameplay goal with a count, a checklist with its items, a character's build plan @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
  await page.goto("/");

  // Home's Goals panel opens the maker (Georges, 2026-10-10: "I should be able to create anything from that screen").
  await page.getByRole("link", { name: "+ New goal" }).click();
  await expect(page).toHaveURL(/\/tasks\?new=1$/);
  const maker = page.getByRole("form", { name: "New goal" });

  // Gameplay: finish something, or do it a number of times.
  await maker.getByRole("button", { name: "Gameplay" }).click();
  await maker.getByLabel("Title").fill("E2E Do 20 Calyx runs");
  await maker.getByLabel("Game").selectOption({ label: "Honkai: Star Rail" });
  await maker.getByLabel("How many times").fill("20");
  await maker.getByRole("button", { name: "Add goal" }).click();
  await expect(page.getByRole("region", { name: "Goals" })).toContainText("E2E Do 20 Calyx runs");

  // A checklist, its items typed one per line.
  await page.getByRole("button", { name: "New goal" }).click();
  await maker.getByRole("button", { name: "Checklist" }).click();
  await maker.getByLabel("Title").fill("E2E Finish Penacony");
  await maker.getByLabel("Game").selectOption({ label: "Honkai: Star Rail" });
  await maker.getByLabel("Items, one per line").fill("Act 1\nAct 2");
  await maker.getByRole("button", { name: "Add goal" }).click();
  await expect
    .poll(async () => ((await (await page.request.get("/api/tasks")).json()) as { title: string; items: { label: string }[] | null }[]).find((t) => t.title === "E2E Finish Penacony")?.items?.map((i) => i.label))
    .toEqual(["Act 1", "Act 2"]);

  // A character's build: pick the unit, then plan its levels and talents in place.
  await page.getByRole("button", { name: "New goal" }).click();
  await maker.getByRole("button", { name: "Character build" }).click();
  await maker.getByLabel("Game").selectOption({ label: "Honkai: Star Rail" });
  await maker.getByRole("combobox", { name: "Character" }).fill("Kafka");
  await maker.getByRole("option", { name: /^Kafka/ }).click();
  await expect(maker.getByRole("button", { name: "Generate tasks" })).toBeVisible();
});

test("Tasks: a character goal shows its plan (each ascension, each talent), and a weapon's goal links under it @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Plan farming lists the materials as the levels change: no Preview step.
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1107" } })).json()) as { id: string };
  await page.goto(`/characters/${build.id}`);
  const plan = page.getByRole("region", { name: "Plan farming" });
  await expect(plan.getByRole("button", { name: "Preview" })).toHaveCount(0);
  await expect(plan.getByRole("columnheader", { name: "Missing" })).toBeVisible();
  await plan.getByRole("button", { name: "Generate tasks" }).click();
  const weapon = (await (await page.request.post("/api/tasks", { data: { scope: "game", refId: id, type: "goal", title: "E2E farm a light cone", target: 1 } })).json()) as { id: string };

  await page.goto("/tasks?game=hsr");
  const goals = page.getByRole("region", { name: "Goals" });
  const clara = goals.getByRole("article", { name: /Clara/ }).first();
  await clara.getByRole("button", { name: /Clara/ }).first().click();
  // The plan's depth: the level range with each ascension, and each talent's range.
  const steps = clara.getByRole("list", { name: "Plan" });
  await expect(steps).toContainText("Lv");
  await expect(steps.getByRole("listitem")).not.toHaveCount(0);

  // Link the light cone's goal under Clara's: it leaves the list and shows inside hers.
  const cone = goals.getByRole("article", { name: "E2E farm a light cone" });
  await cone.getByRole("button", { name: /E2E farm a light cone/ }).click();
  await cone.getByRole("combobox", { name: "Link to" }).fill("Clara");
  await cone.getByRole("option", { name: /Clara/ }).first().click();
  await expect(goals.getByRole("article", { name: "E2E farm a light cone" })).toHaveCount(0);
  await expect(clara).toContainText("E2E farm a light cone");
  await page.request.delete(`/api/tasks/${weapon.id}`);
});

test("Tasks: Farm today shows who it is for and the materials as icons; the game as an icon on the overview only @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  // Lisa's first talent level: Slime Condensate farms any day.
  expect((await page.request.post(`/api/instances/${id}/plans/generate`, { data: { kind: "character", catalogId: "10000006", talents: { normal: { from: 1, to: 2 } } } })).ok()).toBe(true);

  await page.goto("/tasks?game=genshin");
  const farm = page.getByRole("region", { name: "Farm today" });
  await expect(farm.getByRole("img", { name: "Lisa" }).first()).toBeVisible();
  await expect(farm.getByRole("img", { name: "Slime Condensate" }).first()).toBeVisible();
  await expect(farm).not.toContainText("Genshin");
  await expect(farm).not.toContainText("for Lisa");

  await page.goto("/tasks");
  await expect(page.getByRole("region", { name: "Farm today" }).getByRole("img", { name: "Genshin Impact" }).first()).toBeVisible();
});

test("Tasks: a goal shows its own unit as its icon and who it is for; the game as an icon on the overview only @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  // A set farmed for Arlecchino (Georges, 2026-10-11: "having Arlecchino's artifacts' icon is better").
  const goal = (await (
    await page.request.post("/api/tasks", {
      data: { scope: "game", refId: id, type: "goal", title: "E2E farm a set", target: 4, origin: { kind: "gear", catalogId: "15035", sources: [{ kind: "character", catalogId: "10000096" }] } },
    })
  ).json()) as { id: string };

  await page.goto("/tasks?game=genshin");
  const card = page.getByRole("region", { name: "Goals" }).getByRole("article", { name: "E2E farm a set" });
  await expect(card.getByRole("img", { name: "Fragment of Harmonic Whimsy" })).toBeVisible();
  await expect(card.getByRole("img", { name: "Arlecchino" })).toBeVisible();
  await expect(card.getByRole("img", { name: "Genshin Impact" })).toHaveCount(0);
  await expect(card).not.toContainText("Genshin");

  await page.goto("/tasks");
  await expect(page.getByRole("region", { name: "Goals" }).getByRole("article", { name: "E2E farm a set" }).getByRole("img", { name: "Genshin Impact" })).toBeVisible();
  await page.request.delete(`/api/tasks/${goal.id}`);
});
