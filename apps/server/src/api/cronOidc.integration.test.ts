import { generateKeyPairSync, sign } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { config } from "../config.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const JWKS = { keys: [{ ...publicKey.export({ format: "jwk" }), kid: "kid-1", alg: "RS256" }] };

const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString("base64url");
const tokenFor = (workflow: string) => {
  const now = Math.floor(Date.now() / 1000);
  const head = encode({ alg: "RS256", kid: "kid-1" });
  const body = encode({
    iss: "https://token.actions.githubusercontent.com",
    aud: config.appBaseUrl,
    repository: config.githubRepository,
    ref: "refs/heads/main",
    workflow_ref: `${config.githubRepository}/.github/workflows/${workflow}@refs/heads/main`,
    nbf: now - 5,
    exp: now + 300,
  });
  return `${head}.${body}.${sign("RSA-SHA256", Buffer.from(`${head}.${body}`), privateKey).toString("base64url")}`;
};

// The R2 art store's keys (ADR 0014), as the host would set them; test values only, not a real account or token.
const R2 = {
  R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  R2_BUCKET: "gacha-hub-art",
  R2_ACCESS_KEY_ID: "fedcba9876543210fedcba9876543210",
  R2_SECRET_ACCESS_KEY: "0".repeat(64),
  R2_PUBLIC_URL: "https://pub-test0000.r2.dev",
  CF_ANALYTICS_TOKEN: "test-only-analytics-token-not-real-00000",
};
const OVERRIDE_BASE = "https://pub-elsewhere.r2.dev/assets";

let ipCounter = 0;

// ADR 0012: the cron and the art mirror run on GitHub with no secret there.
describe("GitHub's workflows call the app with their OIDC proof", () => {
  let app: FastifyInstance;
  let owner: Client;

  beforeAll(async () => {
    app = await makeApp();
    vi.stubGlobal("fetch", async (url: string) =>
      String(url).includes("token.actions.githubusercontent.com") ? { ok: true, json: async () => JWKS } : { ok: false, status: 503, json: async () => ({}), text: async () => "" },
    );
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    owner = await login(app, `10.3.0.${++ipCounter}`);
  });

  const post = (url: string, token: string) => app.inject({ method: "POST", url, headers: { authorization: `Bearer ${token}` } });

  it("runs the tick for the cron workflow, and for no other", async () => {
    expect((await post("/api/cron/tick", tokenFor("cron-tick.yml"))).statusCode).toBe(200);
    expect((await post("/api/cron/tick", tokenFor("ci.yml"))).statusCode).toBe(401);
  });

  // ADR 0014: the art store is an R2 bucket; its keys live in Settings → Keys (or on the host) and go to the mirror workflow alone.
  it("hands the art store's keys to the mirror workflow only; the web reads the art at the bucket's public address unless an override is reported", async () => {
    for (const name of Object.keys(R2)) delete process.env[name];
    expect((await post("/api/cron/art-store", tokenFor("mirror-art.yml"))).statusCode).toBe(404);
    expect((await owner.req<{ assetBase: string | null }>("GET", "/api/me")).json.assetBase).toBeNull();
    Object.assign(process.env, R2);
    try {
      const store = await post("/api/cron/art-store", tokenFor("mirror-art.yml"));
      expect(store.statusCode).toBe(200);
      expect(store.json()).toEqual({
        r2: { accountId: R2.R2_ACCOUNT_ID, bucket: R2.R2_BUCKET, accessKeyId: R2.R2_ACCESS_KEY_ID, secretAccessKey: R2.R2_SECRET_ACCESS_KEY, publicUrl: R2.R2_PUBLIC_URL, analyticsToken: R2.CF_ANALYTICS_TOKEN },
        base: "https://pub-test0000.r2.dev/assets",
      });
      expect((await owner.req<{ assetBase: string | null }>("GET", "/api/me")).json.assetBase).toBe("https://pub-test0000.r2.dev/assets");
      expect((await post("/api/cron/art-store", tokenFor("cron-tick.yml"))).statusCode).toBe(401);
      expect((await app.inject({ method: "POST", url: "/api/cron/art-store" })).statusCode).toBe(401);
      // An override the mirror reports (another address for the pictures): the app reads them from there at once (Settings → Keys, ASSET_BASE).
      const reported = await app.inject({ method: "POST", url: "/api/cron/art-base", headers: { authorization: `Bearer ${tokenFor("mirror-art.yml")}`, "content-type": "application/json" }, payload: JSON.stringify({ base: OVERRIDE_BASE }) });
      expect(reported.statusCode).toBe(200);
      expect((await owner.req<{ assetBase: string | null }>("GET", "/api/me")).json.assetBase).toBe(OVERRIDE_BASE);
      expect((await post("/api/cron/art-store", tokenFor("mirror-art.yml"))).json()).toMatchObject({ base: OVERRIDE_BASE });
      expect((await app.inject({ method: "POST", url: "/api/cron/art-base", headers: { authorization: `Bearer ${tokenFor("cron-tick.yml")}`, "content-type": "application/json" }, payload: JSON.stringify({ base: OVERRIDE_BASE }) })).statusCode).toBe(401);
      expect((await app.inject({ method: "POST", url: "/api/cron/art-base", headers: { authorization: `Bearer ${tokenFor("mirror-art.yml")}`, "content-type": "application/json" }, payload: JSON.stringify({ base: "https://elsewhere.example/x" }) })).statusCode).toBe(400);
    } finally {
      for (const name of Object.keys(R2)) delete process.env[name];
    }
  });
});
