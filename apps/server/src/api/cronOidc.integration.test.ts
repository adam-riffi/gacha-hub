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

const BLOB_TOKEN = "vercel_blob_rw_test_only_not_a_real_token_0123456789";
const BLOB_BASE = "https://abc123.public.blob.vercel-storage.com/assets";

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

  // ADR 0013: the art store is Vercel Blob; its token lives on the host and goes to the mirror workflow alone.
  it("hands the art store's token to the mirror workflow only, and takes the public base the mirror reports", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect((await post("/api/cron/art-store", tokenFor("mirror-art.yml"))).statusCode).toBe(404);
    process.env.BLOB_READ_WRITE_TOKEN = BLOB_TOKEN;
    try {
      const store = await post("/api/cron/art-store", tokenFor("mirror-art.yml"));
      expect(store.statusCode).toBe(200);
      expect(store.json()).toEqual({ blobToken: BLOB_TOKEN, base: null });
      expect((await post("/api/cron/art-store", tokenFor("cron-tick.yml"))).statusCode).toBe(401);
      expect((await app.inject({ method: "POST", url: "/api/cron/art-store" })).statusCode).toBe(401);
      // The mirror reports where the pictures landed: the app reads them from there at once (Settings → Keys, ASSET_BASE).
      const reported = await app.inject({ method: "POST", url: "/api/cron/art-base", headers: { authorization: `Bearer ${tokenFor("mirror-art.yml")}`, "content-type": "application/json" }, payload: JSON.stringify({ base: BLOB_BASE }) });
      expect(reported.statusCode).toBe(200);
      expect((await owner.req<{ assetBase: string | null }>("GET", "/api/me")).json.assetBase).toBe(BLOB_BASE);
      expect((await post("/api/cron/art-store", tokenFor("mirror-art.yml"))).json()).toEqual({ blobToken: BLOB_TOKEN, base: BLOB_BASE });
      expect((await app.inject({ method: "POST", url: "/api/cron/art-base", headers: { authorization: `Bearer ${tokenFor("cron-tick.yml")}`, "content-type": "application/json" }, payload: JSON.stringify({ base: BLOB_BASE }) })).statusCode).toBe(401);
      expect((await app.inject({ method: "POST", url: "/api/cron/art-base", headers: { authorization: `Bearer ${tokenFor("mirror-art.yml")}`, "content-type": "application/json" }, payload: JSON.stringify({ base: "https://elsewhere.example/x" }) })).statusCode).toBe(400);
    } finally {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    }
  });
});
