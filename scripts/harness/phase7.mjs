// Phase 7 end-to-end harness: boots the serverless bundle in-process (SQLite
// dev.db via the repo .env), dev-logs in, and exercises planning + materials.
// Run `node scripts/build-server-bundle.mjs` first; `npm run harness` does both.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

// Repo root, derived from this file so the harness runs from any checkout.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..").replace(/\\/g, "/");
process.chdir(ROOT);
const { default: handler } = await import(pathToFileURL(`${ROOT}/dist-server/index.js`).href);

const server = createServer((req, res) => handler(req, res));
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let cookie = "";
async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? { cookie } : { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}
const ok = (label, cond, extra = "") => {
  if (!cond) throw new Error(`FAIL ${label} ${extra}`);
  console.log(`  ✓ ${label}`);
};

const created = { tasks: [], character: null, zzz: null };
try {
  console.log("login");
  const login = await call("POST", "/api/auth/dev-login");
  ok("dev-login", login.status === 200, JSON.stringify(login.json));

  // ---- Genshin instance ----
  let list = (await call("GET", "/api/instances")).json;
  let gi = list.find((i) => i.gameKey === "genshin");
  if (!gi) gi = (await call("POST", "/api/instances", { gameKey: "genshin" })).json;
  ok("genshin instance", Boolean(gi?.id), JSON.stringify(gi));
  const G = gi.id;

  // ---- Catalog picks (Amber + a weapon whose ascension costs Mora) ----
  const cat = JSON.parse(
    readFileSync(`${ROOT}/packages/shared/src/games/genshin/catalog.json`, "utf8"),
  );
  const amber = cat.characters.find((c) => c.id === "10000021");
  const weapon = cat.weapons.find(
    (w) =>
      w.rarity === 4 &&
      w.ascension.length >= 6 &&
      w.ascension.some((s) => s.materials.some((m) => m.materialId === "202")),
  );
  ok("catalog picks", amber && weapon, `${amber?.name} / ${weapon?.name}`);
  const moraOf = (steps) =>
    steps
      .flatMap((s) => s.materials)
      .filter((m) => m.materialId === "202")
      .reduce((a, m) => a + m.qty, 0);
  const amberMoraLevel = moraOf(amber.ascension);
  const amberMoraNormal = moraOf(amber.talents.costs);
  const weaponMora = moraOf(weapon.ascension);

  // ---- Own Amber + build ----
  await call("PUT", `/api/instances/${G}/ownership`, {
    items: [{ kind: "character", catalogId: amber.id, owned: true }],
  });
  const build = await call("POST", `/api/instances/${G}/characters`, { catalogId: amber.id });
  ok(
    "build from catalog",
    build.status === 200 || build.status === 201,
    JSON.stringify(build.json),
  );
  created.character = build.json.id;

  // ---- Preview: Amber 20→90 + normal 1→10, empty stock ----
  const planReq = {
    kind: "character",
    catalogId: amber.id,
    level: { from: 20, to: 90 },
    talents: { normal: { from: 1, to: 10 } },
  };
  // Start from a clean stock and no lingering material tasks.
  const oldTasks = (await call("GET", "/api/tasks?scope=game&refId=" + G)).json;
  for (const t of oldTasks.filter((t) => t.materialId)) await call("DELETE", `/api/tasks/${t.id}`);
  const oldStock = (await call("GET", `/api/instances/${G}/materials`)).json;
  if (oldStock.length)
    await call("PUT", `/api/instances/${G}/materials`, {
      items: oldStock.map((s) => ({ materialId: s.materialId, qty: 0 })),
    });

  let prev = await call("POST", `/api/instances/${G}/plans/preview`, planReq);
  ok("preview 200", prev.status === 200, JSON.stringify(prev.json).slice(0, 300));
  const mora = prev.json.requirements.find((r) => r.materialId === "202");
  ok(
    "preview Mora = ascension + normal talent",
    mora?.qty === amberMoraLevel + amberMoraNormal,
    `${mora?.qty} vs ${amberMoraLevel + amberMoraNormal}`,
  );
  ok(
    "deficit == requirements on empty stock",
    JSON.stringify(prev.json.deficit) === JSON.stringify(prev.json.requirements),
  );
  ok(
    "materials described",
    prev.json.materials["202"]?.name === "Mora" &&
      typeof prev.json.materials["202"].farmableToday === "boolean",
  );
  const talentBook = prev.json.requirements
    .map((r) => prev.json.materials[r.materialId])
    .find((m) => m.availability?.length);
  ok("a rotating material carries availability", Boolean(talentBook), JSON.stringify(talentBook));

  // ---- Stock: 100k Mora → deficit shrinks ----
  const stock = await call("PUT", `/api/instances/${G}/materials`, {
    items: [{ materialId: "202", qty: 100000 }],
  });
  ok(
    "stock PUT 200",
    stock.status === 200 && stock.json.find((s) => s.materialId === "202")?.qty === 100000,
    JSON.stringify(stock.json),
  );
  prev = await call("POST", `/api/instances/${G}/plans/preview`, planReq);
  const moraDef = prev.json.deficit.find((r) => r.materialId === "202");
  ok(
    "deficit subtracts stock",
    moraDef?.qty === mora.qty - 100000 && prev.json.stock["202"] === 100000,
    `${moraDef?.qty}`,
  );

  // ---- Generate ----
  const gen1 = await call("POST", `/api/instances/${G}/plans/generate`, planReq);
  ok("generate 200", gen1.status === 200, JSON.stringify(gen1.json).slice(0, 300));
  ok(
    "created == requirement rows, 0 updated",
    gen1.json.created === prev.json.requirements.length && gen1.json.updated === 0,
    `${gen1.json.created}/${gen1.json.updated}`,
  );
  created.tasks.push(...gen1.json.tasks.map((t) => t.id));
  const moraTask = gen1.json.tasks.find((t) => t.materialId === "202");
  ok(
    "Mora task target = raw need, progress = stock, titled, one source",
    moraTask?.target === mora.qty &&
      moraTask.progress === 100000 &&
      moraTask.title === "Farm Mora" &&
      moraTask.origin?.sources?.length === 1,
    JSON.stringify(moraTask),
  );
  const covered = gen1.json.tasks.find((t) => t.materialId !== "202");
  ok("uncovered material task has progress 0", covered?.progress === 0, JSON.stringify(covered));

  // ---- Regenerate the same plan: idempotent ----
  const gen2 = await call("POST", `/api/instances/${G}/plans/generate`, planReq);
  ok(
    "regenerate: 0 created, all updated",
    gen2.json.created === 0 && gen2.json.updated === gen1.json.created,
    `${gen2.json.created}/${gen2.json.updated}`,
  );
  const moraTask2 = gen2.json.tasks.find((t) => t.materialId === "202");
  ok(
    "regenerate keeps target + 1 source",
    moraTask2.target === mora.qty &&
      moraTask2.origin.sources.length === 1 &&
      moraTask2.id === moraTask.id,
  );

  // ---- Weapon plan merges into the same Mora task ----
  const wReq = { kind: "weapon", catalogId: weapon.id, level: { from: 20, to: 90 } };
  const gen3 = await call("POST", `/api/instances/${G}/plans/generate`, wReq);
  ok("weapon generate 200", gen3.status === 200, JSON.stringify(gen3.json).slice(0, 300));
  created.tasks.push(...gen3.json.tasks.map((t) => t.id));
  const moraTask3 = gen3.json.tasks.find((t) => t.materialId === "202");
  ok(
    "Mora task merged: 2 sources, target = char + weapon (stock not double-counted)",
    moraTask3?.id === moraTask.id &&
      moraTask3.origin.sources.length === 2 &&
      moraTask3.target === mora.qty + weaponMora,
    `${moraTask3?.target} vs ${mora.qty + weaponMora}`,
  );

  // ---- Needed ----
  const needed = await call("GET", `/api/instances/${G}/materials/needed`);
  const moraNeed = needed.json.find((n) => n.materialId === "202");
  ok(
    "needed: Mora = task target, have = 100000, described",
    moraNeed?.needed === moraTask3.target &&
      moraNeed.have === 100000 &&
      moraNeed.material?.name === "Mora",
    JSON.stringify(moraNeed),
  );
  ok(
    "needed sorted desc",
    needed.json.every((n, i, a) => i === 0 || a[i - 1].needed >= n.needed),
  );

  // ---- Progress on a material task writes the stock ----
  await call("POST", `/api/tasks/${moraTask.id}/progress`, { progress: 105000 });
  const stock2 = (await call("GET", `/api/instances/${G}/materials`)).json;
  ok(
    "progress → stock 105000",
    stock2.find((s) => s.materialId === "202")?.qty === 105000,
    JSON.stringify(stock2),
  );
  const tasks2 = (await call("GET", `/api/tasks?scope=game&refId=${G}`)).json;
  ok(
    "task list reports progress from stock",
    tasks2.find((t) => t.id === moraTask.id)?.progress === 105000,
  );
  const needed2 = await call("GET", `/api/instances/${G}/materials/needed`);
  ok(
    "needed unchanged, have = 105000",
    needed2.json.find((n) => n.materialId === "202")?.have === 105000 &&
      needed2.json.find((n) => n.materialId === "202")?.needed === moraTask3.target,
  );
  // Stock ≥ target → task reads as complete (progress capped at target).
  await call("PUT", `/api/instances/${G}/materials`, {
    items: [{ materialId: "202", qty: 3000000 }],
  });
  const tasks3 = (await call("GET", `/api/tasks?scope=game&refId=${G}`)).json;
  ok(
    "stock ≥ target caps progress at target",
    tasks3.find((t) => t.id === moraTask.id)?.progress === moraTask3.target,
  );

  // ---- Error paths ----
  const badMat = await call("PUT", `/api/instances/${G}/materials`, {
    items: [{ materialId: "nope", qty: 1 }],
  });
  ok(
    "unknown material → 400",
    badMat.status === 400 && badMat.json.error === "unknown_material_id",
    JSON.stringify(badMat.json),
  );
  const badId = await call("POST", `/api/instances/${G}/plans/preview`, {
    kind: "character",
    catalogId: "nope",
    level: { from: 20, to: 90 },
  });
  ok(
    "unknown catalog id → 404",
    badId.status === 404 && badId.json.error === "unknown_catalog_id",
    JSON.stringify(badId.json),
  );
  const badRange = await call("POST", `/api/instances/${G}/plans/preview`, {
    kind: "character",
    catalogId: amber.id,
    level: { from: 90, to: 20 },
  });
  ok("inverted range → 400", badRange.status === 400, JSON.stringify(badRange.json).slice(0, 200));
  const badQty = await call("PUT", `/api/instances/${G}/materials`, {
    items: [{ materialId: "202", qty: -1 }],
  });
  ok("negative qty → 400", badQty.status === 400);
  const noLevel = await call("POST", `/api/instances/${G}/plans/preview`, {
    kind: "character",
    catalogId: amber.id,
  });
  ok("no goal → empty plan", noLevel.status === 200 && noLevel.json.requirements.length === 0);

  // ---- Catalog-less game (ZZZ) ----
  list = (await call("GET", "/api/instances")).json;
  let zzz = list.find((i) => i.gameKey === "zzz");
  if (!zzz) {
    zzz = (await call("POST", "/api/instances", { gameKey: "zzz" })).json;
    created.zzz = zzz.id;
  }
  const noCat = await call("POST", `/api/instances/${zzz.id}/plans/preview`, {
    kind: "character",
    catalogId: "x",
    level: { from: 20, to: 60 },
  });
  ok(
    "no catalog → 404 no_catalog",
    noCat.status === 404 && noCat.json.error === "no_catalog",
    JSON.stringify(noCat.json),
  );
  const zzzNeeded = await call("GET", `/api/instances/${zzz.id}/materials/needed`);
  ok(
    "needed on catalog-less game → []",
    zzzNeeded.status === 200 && Array.isArray(zzzNeeded.json) && zzzNeeded.json.length === 0,
  );

  // ---- Dashboard still parses (extras optional) ----
  const dash = await call("GET", "/api/dashboard");
  ok(
    "dashboard 200",
    dash.status === 200 && Array.isArray(dash.json.games),
    JSON.stringify(dash.json).slice(0, 200),
  );

  console.log("\nALL CHECKS PASSED");
} catch (err) {
  process.exitCode = 1;
  console.error("\nHARNESS ERROR:", err?.stack ?? err);
} finally {
  console.log("cleanup");
  for (const id of new Set(created.tasks)) await call("DELETE", `/api/tasks/${id}`);
  const list = (await call("GET", "/api/instances")).json;
  const gi = Array.isArray(list) ? list.find((i) => i.gameKey === "genshin") : null;
  if (gi) {
    await call("PUT", `/api/instances/${gi.id}/materials`, {
      items: [{ materialId: "202", qty: 0 }],
    });
    if (created.character) await call("DELETE", `/api/characters/${created.character}`);
    await call("PUT", `/api/instances/${gi.id}/ownership`, {
      items: [{ kind: "character", catalogId: "10000021", owned: false }],
    });
  }
  if (created.zzz) await call("DELETE", `/api/instances/${created.zzz}`);
  server.close();
  process.exit(process.exitCode ?? 0);
}
