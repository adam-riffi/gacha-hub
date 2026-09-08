// Phase 8 end-to-end harness: admin payload uploads, banners/events reads,
// dashboard timeline, signed Discord interactions, delete, rate limiting.
// Run `node scripts/build-server-bundle.mjs` first; `npm run harness` does both.
import { createServer } from "node:http";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

// Repo root, derived from this file so the harness runs from any checkout.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..").replace(/\\/g, "/");
process.chdir(ROOT);

// Discord: sign interactions with a throwaway Ed25519 key the server trusts.
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
process.env.DISCORD_PUBLIC_KEY = Buffer.from(
  publicKey.export({ format: "jwk" }).x,
  "base64url",
).toString("hex");
process.env.ADMIN_DISCORD_IDS = "dev-local-user";

const { default: handler } = await import(pathToFileURL(`${ROOT}/dist-server/index.js`).href);
const server = createServer((req, res) => handler(req, res));
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let cookie = "";
async function call(method, path, body, extraHeaders = {}, useCookie = true) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(useCookie ? { cookie } : {}),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
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
async function interaction(payload) {
  const body = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = sign(null, Buffer.from(ts + body), privateKey).toString("hex");
  return call(
    "POST",
    "/api/discord/interactions",
    body,
    { "x-signature-ed25519": sig, "x-signature-timestamp": ts },
    false,
  );
}
const slash = (name, options = {}) =>
  interaction({
    type: 2,
    data: {
      name,
      options: Object.entries(options).map(([n, v]) => ({
        name: n,
        type: typeof v === "boolean" ? 5 : typeof v === "number" ? 10 : 3,
        value: v,
      })),
    },
    member: { user: { id: "dev-local-user" } },
  });
const ok = (label, cond, extra = "") => {
  if (!cond) throw new Error(`FAIL ${label} ${extra}`);
  console.log(`  ✓ ${label}`);
};
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();
const D = 86_400_000;

const KEYS = ["hx-active", "hx-upcoming", "hx-ended"];
const EKEYS = ["hx-ev-active", "hx-ev-upcoming"];
let G;
try {
  console.log("login");
  ok("dev-login", (await call("POST", "/api/auth/dev-login")).status === 200);
  const list = (await call("GET", "/api/instances")).json;
  let gi = list.find((i) => i.gameKey === "genshin");
  if (!gi) gi = (await call("POST", "/api/instances", { gameKey: "genshin" })).json;
  G = gi.id;
  const cat = JSON.parse(
    readFileSync(`${ROOT}/packages/shared/src/games/genshin/catalog.json`, "utf8"),
  );
  const weapon = cat.weapons.find((w) => w.rarity === 5);
  const kaeya = cat.characters.find((c) => c.name === "Kaeya");
  ok("catalog picks", weapon && kaeya);

  // ---- Admin guard + schema ----
  const anon = await call(
    "POST",
    "/api/admin/payload",
    { kind: "banners", gameKey: "genshin", items: [] },
    {},
    false,
  );
  ok("anonymous admin → 401", anon.status === 401, JSON.stringify(anon.json));
  const schema = await call("GET", "/api/admin/payload/schema");
  ok(
    "JSON schema served",
    schema.status === 200 &&
      (schema.json.definitions?.AdminPayload || schema.json.anyOf || schema.json.oneOf),
    JSON.stringify(schema.json).slice(0, 200),
  );

  // ---- Rejections ----
  const bad1 = await call("POST", "/api/admin/payload", {
    kind: "banners",
    gameKey: "genshin",
    items: [{ key: "x", name: "X", kind: "character", startsAt: iso(D), endsAt: iso(-D) }],
  });
  ok(
    "inverted dates → 400 validation_error with issues",
    bad1.status === 400 &&
      bad1.json.error === "validation_error" &&
      Array.isArray(bad1.json.issues),
    JSON.stringify(bad1.json).slice(0, 200),
  );
  const bad2 = await call("POST", "/api/admin/payload", {
    kind: "banners",
    gameKey: "genshin",
    items: [
      { key: "dup", name: "A", kind: "character", startsAt: iso(-D), endsAt: iso(D) },
      { key: "dup", name: "B", kind: "character", startsAt: iso(-D), endsAt: iso(D) },
    ],
  });
  ok(
    "duplicate keys → 400",
    bad2.status === 400 && bad2.json.error === "duplicate_keys" && bad2.json.keys[0] === "dup",
    JSON.stringify(bad2.json),
  );
  const bad3 = await call("POST", "/api/admin/payload", {
    kind: "banners",
    gameKey: "genshin",
    items: [
      {
        key: "unk",
        name: "A",
        kind: "character",
        startsAt: iso(-D),
        endsAt: iso(D),
        featured: [{ catalogId: "nope", kind: "character" }],
      },
    ],
  });
  ok(
    "unknown featured id → 400",
    bad3.status === 400 && bad3.json.error === "unknown_catalog_id" && bad3.json.ids[0] === "nope",
    JSON.stringify(bad3.json),
  );
  const bad4 = await call("POST", "/api/admin/payload", {
    kind: "banners",
    gameKey: "nogame",
    items: [{ key: "a", name: "A", kind: "character", startsAt: iso(-D), endsAt: iso(D) }],
  });
  ok("unknown game → 404", bad4.status === 404);
  const bad5 = await call("POST", "/api/admin/payload", {
    kind: "catalog-patch",
    gameKey: "genshin",
    items: [{ a: 1 }],
  });
  ok("catalog-patch → 501", bad5.status === 501);
  const bad6 = await call("POST", "/api/admin/payload", {
    kind: "banners",
    gameKey: "genshin",
    items: [{ key: "bad key!", name: "A", kind: "character", startsAt: iso(-D), endsAt: iso(D) }],
  });
  ok("bad slug → 400", bad6.status === 400);

  // ---- Create banners ----
  const banners = {
    kind: "banners",
    gameKey: "genshin",
    items: [
      {
        key: "hx-active",
        name: "Harness Active",
        kind: "character",
        startsAt: iso(-D),
        endsAt: iso(10 * D),
        featured: [
          { catalogId: "10000021", kind: "character", rateUp: true },
          { catalogId: weapon.id, kind: "weapon" },
        ],
        payload: { note: "hi" },
      },
      {
        key: "hx-upcoming",
        name: "Harness Upcoming",
        kind: "weapon",
        startsAt: iso(3 * D),
        endsAt: iso(20 * D),
      },
      {
        key: "hx-ended",
        name: "Harness Ended",
        kind: "other",
        startsAt: iso(-30 * D),
        endsAt: iso(-10 * D),
      },
    ],
  };
  const up1 = await call("POST", "/api/admin/payload", banners);
  ok(
    "banners created 3",
    up1.status === 200 && up1.json.created === 3 && up1.json.updated === 0,
    JSON.stringify(up1.json),
  );

  // ---- Read side ----
  const cur = await call("GET", "/api/games/genshin/banners");
  ok(
    "default filter = active + upcoming, ordered",
    cur.status === 200 &&
      cur.json.length === 2 &&
      cur.json[0].key === "hx-active" &&
      cur.json[0].status === "active" &&
      cur.json[1].status === "upcoming",
    JSON.stringify(cur.json.map((b) => [b.key, b.status])),
  );
  ok(
    "featured + payload round out",
    cur.json[0].featured.length === 2 &&
      cur.json[0].payload?.note === "hi" &&
      cur.json[0].version === 1,
  );
  ok(
    "?status=active → 1",
    (await call("GET", "/api/games/genshin/banners?status=active")).json.length === 1,
  );
  ok(
    "?status=ended → 1",
    (await call("GET", "/api/games/genshin/banners?status=ended")).json.length === 1,
  );
  ok(
    "?status=all → 3",
    (await call("GET", "/api/games/genshin/banners?status=all")).json.length === 3,
  );
  ok("unknown game → 404", (await call("GET", "/api/games/nogame/banners")).status === 404);

  // ---- Events ----
  const events = {
    kind: "events",
    gameKey: "genshin",
    items: [
      {
        key: "hx-ev-active",
        name: "Harness Event",
        startsAt: iso(-D),
        endsAt: iso(5 * D),
        description: "Do the thing",
        rewards: [{ label: "Primogems", qty: 420 }],
        url: "https://example.com/e",
      },
      {
        key: "hx-ev-upcoming",
        name: "Harness Event Two",
        startsAt: iso(2 * D),
        endsAt: iso(9 * D),
      },
    ],
  };
  const up2 = await call("POST", "/api/admin/payload", events);
  ok("events created 2", up2.status === 200 && up2.json.created === 2, JSON.stringify(up2.json));
  const ev = await call("GET", "/api/games/genshin/events");
  ok(
    "events read with rewards/url/status",
    ev.json.length === 2 &&
      ev.json[0].rewards[0].qty === 420 &&
      ev.json[0].url === "https://example.com/e" &&
      ev.json[0].status === "active",
    JSON.stringify(ev.json).slice(0, 300),
  );

  // ---- Export round-trip ----
  const exp = await call("GET", "/api/admin/export?kind=banners&gameKey=genshin");
  ok(
    "export = upload shape",
    exp.status === 200 &&
      exp.json.kind === "banners" &&
      exp.json.items.length === 3 &&
      exp.json.items.find((i) => i.key === "hx-active").featured[0].catalogId === "10000021" &&
      !("id" in exp.json.items[0]),
    JSON.stringify(exp.json).slice(0, 300),
  );
  const re = await call("POST", "/api/admin/payload", exp.json);
  ok(
    "re-upload of export: 0 created, 3 updated",
    re.status === 200 && re.json.created === 0 && re.json.updated === 3,
    JSON.stringify(re.json),
  );
  const expEv = await call("GET", "/api/admin/export?kind=events&gameKey=genshin");
  const reEv = await call("POST", "/api/admin/payload", expEv.json);
  ok(
    "events export round-trips",
    reEv.json.updated === 2 && expEv.json.items[0].rewards[0].label === "Primogems",
  );

  // ---- Update by key ----
  const up3 = await call("POST", "/api/admin/payload", {
    kind: "banners",
    gameKey: "genshin",
    items: [{ ...banners.items[0], name: "Harness Active v2", version: 2 }],
  });
  ok("update by key", up3.json.updated === 1 && up3.json.created === 0);
  const after = (await call("GET", "/api/games/genshin/banners?status=active")).json[0];
  ok(
    "updated name + version visible",
    after.name === "Harness Active v2" && after.version === 2,
    JSON.stringify(after),
  );

  // ---- Audit ----
  const audit = await call("GET", "/api/admin/audit?limit=50");
  ok(
    "audit rows with actor + diff",
    audit.status === 200 &&
      audit.json[0].actorName === "Dev User" &&
      audit.json[0].action === "update" &&
      audit.json[0].targetKey === "genshin/hx-active" &&
      audit.json[0].diff.before.name === "Harness Active" &&
      audit.json[0].diff.after.name === "Harness Active v2",
    JSON.stringify(audit.json[0]).slice(0, 300),
  );
  ok(
    "audit has creates",
    audit.json.some((a) => a.action === "create" && a.targetKind === "event"),
  );

  // ---- Dashboard timeline ----
  const dash = await call("GET", "/api/dashboard");
  ok(
    "dashboard timeline",
    dash.status === 200 &&
      dash.json.timeline.banners.length === 2 &&
      dash.json.timeline.events.length === 2,
    JSON.stringify(dash.json.timeline).slice(0, 200),
  );

  // ---- Discord interactions (signed) ----
  ok("PING → PONG", (await interaction({ type: 1 })).json.type === 1);
  const badSig = await call(
    "POST",
    "/api/discord/interactions",
    JSON.stringify({ type: 1 }),
    { "x-signature-ed25519": "00".repeat(64), "x-signature-timestamp": "1" },
    false,
  );
  ok("bad signature → 401", badSig.status === 401);
  const b = await slash("banner", { game: "genshin" });
  ok(
    "/banner lists active + featured names",
    b.status === 200 &&
      b.json.type === 4 &&
      b.json.data.flags === 64 &&
      b.json.data.content.includes("Harness Active v2") &&
      b.json.data.content.includes("Amber") &&
      b.json.data.content.includes("ends in") &&
      b.json.data.content.includes("starts in"),
    b.json.data?.content,
  );
  const e = await slash("events");
  ok("/events lists events", e.json.data.content.includes("Harness Event"), e.json.data.content);
  const own = await slash("own", { game: "genshin", character: "kaeya" });
  ok(
    "/own marks owned",
    own.json.data.content.includes("you now own") && own.json.data.content.includes("Kaeya"),
    own.json.data.content,
  );
  const owned = (await call("GET", `/api/instances/${G}/ownership`)).json;
  ok(
    "ownership row created",
    owned.some((o) => o.kind === "character" && o.catalogId === kaeya.id),
  );
  const unown = await slash("own", { game: "genshin", character: "kaeya", owned: false });
  ok(
    "/own owned:false removes",
    unown.json.data.content.includes("not owned") &&
      !(await call("GET", `/api/instances/${G}/ownership`)).json.some(
        (o) => o.catalogId === kaeya.id,
      ),
    unown.json.data.content,
  );
  const farm = await slash("farm");
  ok(
    "/farm answers",
    farm.status === 200 &&
      typeof farm.json.data.content === "string" &&
      farm.json.data.content.length > 0,
    farm.json.data?.content,
  );
  const unknown = await slash("nope");
  ok("unknown command", unknown.json.data.content === "Unknown command.");

  // ---- Delete ----
  const del = await call("DELETE", "/api/admin/banners/genshin/hx-ended");
  ok(
    "delete banner",
    del.status === 200 &&
      (await call("GET", "/api/games/genshin/banners?status=all")).json.length === 2,
  );
  ok(
    "delete unknown → 404",
    (await call("DELETE", "/api/admin/banners/genshin/hx-ended")).status === 404,
  );
  ok(
    "delete audited",
    (await call("GET", "/api/admin/audit?limit=5")).json.some(
      (a) => a.action === "delete" && a.targetKey === "genshin/hx-ended",
    ),
  );

  // ---- Rate limit (30/min on admin writes) ----
  let limited = 0;
  for (let i = 0; i < 40; i++) {
    const r = await call("POST", "/api/admin/payload", {
      kind: "banners",
      gameKey: "genshin",
      items: [],
    });
    if (r.status === 429) limited += 1;
  }
  ok("admin writes rate-limited", limited > 0, `429s: ${limited}`);

  console.log("\nALL CHECKS PASSED");
} catch (err) {
  process.exitCode = 1;
  console.error("\nHARNESS ERROR:", err?.stack ?? err);
} finally {
  console.log("cleanup");
  // Rate limit may still be active; deletes share the limiter, so wait it out if needed.
  for (const key of KEYS) {
    const r = await call("DELETE", `/api/admin/banners/genshin/${key}`);
    if (r.status === 429) {
      await new Promise((res) => setTimeout(res, 61_000));
      await call("DELETE", `/api/admin/banners/genshin/${key}`);
    }
  }
  for (const key of EKEYS) await call("DELETE", `/api/admin/events/genshin/${key}`);
  const left = (await call("GET", "/api/games/genshin/banners?status=all")).json;
  console.log(
    "  banners left:",
    Array.isArray(left) ? left.filter((b) => b.key.startsWith("hx-")).length : left,
  );
  server.close();
  process.exit(process.exitCode ?? 0);
}
