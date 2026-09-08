import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { catalogSchema, genshin, type Catalog } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";
const MORA = "202";

interface Preview {
  requirements: { materialId: string; qty: number }[];
  deficit: { materialId: string; qty: number }[];
  stock: Record<string, number>;
  materials: Record<string, { name: string; farmableToday: boolean }>;
}
interface GenTask {
  id: string;
  materialId: string | null;
  parentId: string | null;
  title: string;
  target: number | null;
  progress: number;
}
interface GenResult {
  created: number;
  updated: number;
  tasks: GenTask[];
}

describe("planning + materials (routes)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  let cat: Catalog;
  let moraWeaponId: string;
  let weaponMora: number;
  let amberMora: number;

  const moraOf = (steps: { materials: { materialId: string; qty: number }[] }[]) =>
    steps.flatMap((s) => s.materials).filter((m) => m.materialId === MORA).reduce((a, m) => a + m.qty, 0);

  beforeAll(async () => {
    app = await makeApp();
    cat = catalogSchema.parse(await genshin.loadCatalog!());
    const amber = cat.characters.find((x) => x.id === AMBER)!;
    amberMora = moraOf(amber.ascension) + moraOf(amber.talents.costs);
    const weapon = cat.weapons.find(
      (w) => w.rarity === 4 && w.ascension.length >= 6 && w.ascension.some((s) => s.materials.some((m) => m.materialId === MORA)),
    )!;
    moraWeaponId = weapon.id;
    weaponMora = moraOf(weapon.ascension);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    c = await login(app);
    gid = await installGame(c, "genshin");
  });

  const plan = { kind: "character", catalogId: AMBER, level: { from: 20, to: 90 }, talents: { normal: { from: 1, to: 10 } } };

  it("previews requirements and subtracts stock in the deficit", async () => {
    const empty = await c.req<Preview>("POST", `/api/instances/${gid}/plans/preview`, plan);
    expect(empty.status).toBe(200);
    expect(empty.json.requirements.find((r) => r.materialId === MORA)?.qty).toBe(amberMora);
    expect(empty.json.deficit).toEqual(empty.json.requirements);
    expect(empty.json.materials[MORA]!.name).toBe("Mora");

    await c.req("PUT", `/api/instances/${gid}/materials`, { items: [{ materialId: MORA, qty: 100000 }] });
    const withStock = await c.req<Preview>("POST", `/api/instances/${gid}/plans/preview`, plan);
    expect(withStock.json.deficit.find((r) => r.materialId === MORA)?.qty).toBe(amberMora - 100000);
    expect(withStock.json.stock[MORA]).toBe(100000);
  });

  it("generates a goal tree (parent + material subtasks), idempotently", async () => {
    await c.req("PUT", `/api/instances/${gid}/materials`, { items: [{ materialId: MORA, qty: 100000 }] });

    const gen1 = await c.req<GenResult>("POST", `/api/instances/${gid}/plans/generate`, plan);
    expect(gen1.status).toBe(200);
    expect(gen1.json.updated).toBe(0);
    const parent = gen1.json.tasks.find((t) => !t.parentId)!;
    expect(parent.title).toBe("Farm Amber");
    expect(parent.materialId).toBeNull();
    const mora1 = gen1.json.tasks.find((t) => t.materialId === MORA)!;
    expect(mora1.parentId).toBe(parent.id); // nested under the character goal
    expect(mora1.title).toBe("Farm Mora");
    expect(mora1.target).toBe(amberMora); // raw need, stock not subtracted from target
    expect(mora1.progress).toBe(100000); // progress derived from stock
    expect(gen1.json.created).toBe(gen1.json.tasks.length); // parent + every child are new

    // Re-planning the same character updates in place, creates nothing.
    const gen2 = await c.req<GenResult>("POST", `/api/instances/${gid}/plans/generate`, plan);
    expect(gen2.json.created).toBe(0);
    expect(gen2.json.updated).toBe(gen1.json.created);
    expect(gen2.json.tasks.find((t) => !t.parentId)!.id).toBe(parent.id);

    // A weapon plan is its OWN parent — Mora is a separate subtask under it.
    const gen3 = await c.req<GenResult>("POST", `/api/instances/${gid}/plans/generate`, {
      kind: "weapon",
      catalogId: moraWeaponId,
      level: { from: 20, to: 90 },
    });
    const weaponParent = gen3.json.tasks.find((t) => !t.parentId)!;
    expect(weaponParent.id).not.toBe(parent.id);
    const mora3 = gen3.json.tasks.find((t) => t.materialId === MORA)!;
    expect(mora3.id).not.toBe(mora1.id); // distinct task, under the weapon parent
    expect(mora3.target).toBe(weaponMora);

    // The Materials screen keeps the deduped aggregate across both subtasks.
    const needed = await c.req<{ materialId: string; needed: number }[]>("GET", `/api/instances/${gid}/materials/needed`);
    expect(needed.json.find((n) => n.materialId === MORA)?.needed).toBe(amberMora + weaponMora);
  });

  it("treats inventory as the source of truth for material-task progress", async () => {
    await c.req("PUT", `/api/instances/${gid}/materials`, { items: [{ materialId: MORA, qty: 100000 }] });
    const gen = await c.req<GenResult>("POST", `/api/instances/${gid}/plans/generate`, plan);
    const mora = gen.json.tasks.find((t) => t.materialId === MORA)!;

    // Progress on a material task writes the stock.
    await c.req("POST", `/api/tasks/${mora.id}/progress`, { progress: 105000 });
    const stock = await c.req<{ materialId: string; qty: number }[]>("GET", `/api/instances/${gid}/materials`);
    expect(stock.json.find((s) => s.materialId === MORA)?.qty).toBe(105000);
    const tasks = await c.req<{ id: string; progress: number }[]>("GET", `/api/tasks?scope=game&refId=${gid}`);
    expect(tasks.json.find((t) => t.id === mora.id)?.progress).toBe(105000);

    // Stock >= target caps progress at target.
    await c.req("PUT", `/api/instances/${gid}/materials`, { items: [{ materialId: MORA, qty: 9_000_000 }] });
    const capped = await c.req<{ id: string; progress: number }[]>("GET", `/api/tasks?scope=game&refId=${gid}`);
    expect(capped.json.find((t) => t.id === mora.id)?.progress).toBe(mora.target);
  });

  it("reports needed vs. have, sorted, described", async () => {
    await c.req("PUT", `/api/instances/${gid}/materials`, { items: [{ materialId: MORA, qty: 50000 }] });
    await c.req("POST", `/api/instances/${gid}/plans/generate`, plan);
    const needed = await c.req<{ materialId: string; needed: number; have: number; material: { name: string } | null }[]>(
      "GET",
      `/api/instances/${gid}/materials/needed`,
    );
    const mora = needed.json.find((n) => n.materialId === MORA)!;
    expect(mora.needed).toBe(amberMora);
    expect(mora.have).toBe(50000);
    expect(mora.material?.name).toBe("Mora");
    expect(needed.json.every((n, i, a) => i === 0 || a[i - 1]!.needed >= n.needed)).toBe(true);
  });

  it("validates plan and material inputs", async () => {
    expect((await c.req("PUT", `/api/instances/${gid}/materials`, { items: [{ materialId: "nope", qty: 1 }] })).status).toBe(400);
    expect((await c.req("PUT", `/api/instances/${gid}/materials`, { items: [{ materialId: MORA, qty: -1 }] })).status).toBe(400);
    expect((await c.req("POST", `/api/instances/${gid}/plans/preview`, { kind: "character", catalogId: "nope", level: { from: 20, to: 90 } })).status).toBe(404);
    expect((await c.req("POST", `/api/instances/${gid}/plans/preview`, { kind: "character", catalogId: AMBER, level: { from: 90, to: 20 } })).status).toBe(400);
    const noGoal = await c.req<Preview>("POST", `/api/instances/${gid}/plans/preview`, { kind: "character", catalogId: AMBER });
    expect(noGoal.json.requirements.length).toBe(0);
  });

  it("returns no_catalog for a game without one", async () => {
    const zid = await installGame(c, "zzz");
    const r = await c.req<{ error: string }>("POST", `/api/instances/${zid}/plans/preview`, { kind: "character", catalogId: "x", level: { from: 20, to: 60 } });
    expect(r.status).toBe(404);
    expect(r.json.error).toBe("no_catalog");
    const needed = await c.req<unknown[]>("GET", `/api/instances/${zid}/materials/needed`);
    expect(needed.json).toEqual([]);
  });

  it("generates a hidden completionist backlog, idempotently, skipping built characters", async () => {
    await c.req("PUT", `/api/instances/${gid}/ownership`, { items: [{ kind: "character", catalogId: AMBER, owned: true }] });

    const gen = await c.req<{ characters: number; created: number }>("POST", `/api/instances/${gid}/backlog/generate`);
    expect(gen.status).toBe(200);
    expect(gen.json.characters).toBe(1);
    expect(gen.json.created).toBeGreaterThan(1); // parent + subtasks

    const tasks = await c.req<{ id: string; title: string; backlog: boolean; parentId: string | null }[]>("GET", `/api/tasks?scope=game&refId=${gid}`);
    const parent = tasks.json.find((t) => t.title === "Farm Amber (max)" && !t.parentId)!;
    expect(parent.backlog).toBe(true);
    expect(tasks.json.some((t) => t.parentId === parent.id && t.backlog)).toBe(true);

    // Backlog goals are excluded from the dashboard's active goals.
    const dash = await c.req<{ goals: { title: string }[] }>("GET", "/api/dashboard");
    expect(dash.json.goals.some((g) => g.title.startsWith("Farm Amber"))).toBe(false);

    // Idempotent.
    expect((await c.req<{ created: number }>("POST", `/api/instances/${gid}/backlog/generate`)).json.created).toBe(0);

    // A built (perfect) character is skipped next run.
    const build = await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER });
    await c.req("PUT", `/api/characters/${build.json.id}`, { buildStatus: "perfect" });
    expect((await c.req<{ characters: number }>("POST", `/api/instances/${gid}/backlog/generate`)).json.characters).toBe(0);
  });

  it("round-trips the notify flag on a task", async () => {
    const t = await c.req<{ id: string; notify: boolean }>("POST", "/api/tasks", {
      scope: "game", refId: gid, type: "goal", title: "Flag me", target: 5,
    });
    expect(t.json.notify).toBe(false);
    await c.req("PUT", `/api/tasks/${t.json.id}`, { notify: true });
    const list = await c.req<{ id: string; notify: boolean }[]>("GET", `/api/tasks?scope=game&refId=${gid}`);
    expect(list.json.find((x) => x.id === t.json.id)?.notify).toBe(true);
  });
});
