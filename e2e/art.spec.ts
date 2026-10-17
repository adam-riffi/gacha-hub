import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// Georges, 2026-10-17: "make me an exhaustive list of assets you need". The list lives in the app: every picture still
// needed, game by game, each taking the owner's upload in place (stored in Vercel Blob, never committed: ADR 0006).
test("Settings → Art: every picture still needed, game by game, each taking an upload in place @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  try {
    await page.goto("/settings");
    await page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Art", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/art$/);

    // Opens on what is still needed: a section per game; what a source has waits under All.
    const genshin = page.getByRole("region", { name: "Genshin Impact" });
    const logo = genshin.getByRole("group", { name: "Genshin Impact logo" });
    await expect(logo).toContainText("Needed");
    await expect(logo).toContainText("256 × 256");
    await expect(genshin.getByRole("group", { name: "Primogems" })).toHaveCount(0);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(genshin.getByRole("group", { name: "Primogems" })).toContainText("From a source");
    await page.getByRole("button", { name: "Needed", exact: true }).click();

    // An upload in place: the picture shows at once and is kept.
    await logo.locator("input[type=file]").setInputFiles({ name: "genshin-logo.png", mimeType: "image/png", buffer: PNG });
    await expect(logo).toContainText("Uploaded");
    await expect(logo.locator("img.art-preview")).toHaveCount(1);
    const slots = (await (await page.request.get("/api/art")).json()) as { slots: { key: string; url: string | null }[] };
    expect(slots.slots.find((slot) => slot.key === "genshin/logo")?.url).toMatch(/^\/uploads\//);

    // Removed: needed again.
    await logo.getByRole("button", { name: "Remove" }).click();
    await expect(logo).toContainText("Needed");
  } finally {
    await page.request.delete("/api/art/genshin/logo");
  }
});

// An uploaded picture shows on the cards of its slot: a game's logo, an endgame mode, a currency, an element, a banner, a task.
test("Settings → Art: each uploaded picture shows on its cards, in place of what stood there @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const games = (await (await page.request.get("/api/instances")).json()) as { id: string; gameKey: string }[];
  const genshin = games.find((game) => game.gameKey === "genshin")?.id ?? ((await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string }).id;
  const hsr = games.find((game) => game.gameKey === "hsr")?.id ?? ((await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string }).id;
  const slots = ["genshin/logo", "genshin/mode/abyss", "genshin/currency/primogems", "hsr/element/lightning", "genshin/banner/standard", "genshin/task/commissions"];
  const urls = new Map<string, string>();
  try {
    for (const slot of slots) {
      const saved = await page.request.put(`/api/art/${slot}`, { multipart: { file: { name: "art.png", mimeType: "image/png", buffer: PNG } } });
      urls.set(slot, ((await saved.json()) as { url: string }).url);
    }
    const shows = (scope: ReturnType<typeof page.locator>, slot: string) => expect(scope.locator(`img[src='${urls.get(slot)}']`).first()).toBeVisible();

    await page.goto("/library");
    await shows(page.getByRole("article", { name: "Genshin Impact" }), "genshin/logo");
    await page.goto(`/games/${genshin}/endgame`);
    await shows(page.getByRole("region", { name: "Spiral Abyss" }), "genshin/mode/abyss");
    await page.goto(`/games/${genshin}/profile`);
    await shows(page.getByRole("region", { name: "Wallet" }), "genshin/currency/primogems");
    await page.goto(`/games/${genshin}/pulls`);
    await shows(page.getByRole("region", { name: "Standard wish" }), "genshin/banner/standard");
    await page.goto(`/games/${genshin}`);
    await shows(page.getByRole("region", { name: "Daily" }), "genshin/task/commissions");
    await page.goto(`/games/${hsr}/characters`);
    await shows(page.getByRole("group", { name: "Element" }).getByRole("button", { name: "Lightning" }), "hsr/element/lightning");
  } finally {
    for (const slot of slots) await page.request.delete(`/api/art/${slot}`);
  }
});

// A catalog entry no source has (Endfield's gift materials) takes the owner's picture where its icon shows.
test("Settings → Art: a catalog entry no source has shows the owner's picture @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const games = (await (await page.request.get("/api/instances")).json()) as { id: string; gameKey: string }[];
  const endfield = games.find((game) => game.gameKey === "endfield")?.id ?? ((await (await page.request.post("/api/instances", { data: { gameKey: "endfield" } })).json()) as { id: string }).id;
  try {
    const saved = await page.request.put("/api/art/endfield/material/eureka-teabox", { multipart: { file: { name: "art.png", mimeType: "image/png", buffer: PNG } } });
    const url = ((await saved.json()) as { url: string }).url;
    await page.goto(`/games/${endfield}/materials`);
    await expect(page.locator(`img[src='${url}']`).first()).toBeVisible();
  } finally {
    await page.request.delete("/api/art/endfield/material/eureka-teabox");
  }
});
