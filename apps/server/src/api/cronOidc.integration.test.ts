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

const R2 = {
  R2_ACCOUNT_ID: "a".repeat(32),
  R2_ACCESS_KEY_ID: "b".repeat(32),
  R2_SECRET_ACCESS_KEY: "c".repeat(64),
  R2_BUCKET: "gacha-art",
};

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

  it("hands the art store's keys to the mirror workflow only, once the owner has entered them", async () => {
    expect((await post("/api/cron/art-store", tokenFor("mirror-art.yml"))).statusCode).toBe(404);
    for (const [name, value] of Object.entries(R2)) await owner.req("PUT", `/api/settings/keys/${name}`, { value });
    const keys = await post("/api/cron/art-store", tokenFor("mirror-art.yml"));
    expect(keys.statusCode).toBe(200);
    expect(keys.json()).toEqual({ accountId: R2.R2_ACCOUNT_ID, accessKeyId: R2.R2_ACCESS_KEY_ID, secretAccessKey: R2.R2_SECRET_ACCESS_KEY, bucket: R2.R2_BUCKET });
    expect((await post("/api/cron/art-store", tokenFor("cron-tick.yml"))).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/api/cron/art-store" })).statusCode).toBe(401);
  });
});
