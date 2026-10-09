// Smoke checks against a deployed URL (DESIGN.md §12). No sign-in needed:
// the app shell loads, the database answers, the API refuses anonymous reads,
// and /api/me reports Discord sign-in on and the dev login off (a dev login in
// production would let anyone in). Usage: node scripts/smoke.mjs https://gacha-hub-two.vercel.app
const base = (process.argv[2] ?? process.env.SMOKE_URL ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("usage: node scripts/smoke.mjs <deployment URL>");
  process.exit(2);
}

const get = (path) => fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

const shell = await get("/");
check(shell.status === 200 && (await shell.text()).includes("<title>Gacha Hub</title>"), "GET / serves the app shell");
check((shell.headers.get("content-security-policy") ?? "").includes("frame-ancestors 'none'"), "security headers are sent");

const health = await get("/api/health");
check(health.status === 200 && (await health.json()).database === "ok", "GET /api/health reads through the database");

const me = await get("/api/me");
const meBody = me.status === 200 ? await me.json() : null;
check(meBody?.user === null, "GET /api/me answers anonymously");
check(meBody?.oauth === true, "Discord sign-in is configured");
check(meBody?.devLogin === false, "the dev login is off");

const instances = await get("/api/instances");
check(instances.status === 401, "GET /api/instances refuses anonymous reads");

if (failures.length) {
  console.error(`\n${failures.length} smoke check(s) failed against ${base}`);
  process.exit(1);
}
console.log(`\nall smoke checks passed against ${base}`);
