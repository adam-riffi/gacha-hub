import { generateKeyPairSync, sign } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "../config.js";
import { isGithubWorkflow } from "./githubOidc.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const stranger = generateKeyPairSync("rsa", { modulusLength: 2048 });
const NOW = Date.parse("2026-10-16T10:00:00Z");
const seconds = NOW / 1000;

const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString("base64url");
/** A GitHub-shaped OIDC token, signed with our test key unless told otherwise. */
function githubToken(claims: Record<string, unknown> = {}, { header = {}, key = privateKey }: { header?: object; key?: typeof privateKey } = {}) {
  const head = encode({ alg: "RS256", kid: "test-kid", typ: "JWT", ...header });
  const body = encode({
    iss: "https://token.actions.githubusercontent.com",
    aud: config.appBaseUrl,
    repository: config.githubRepository,
    ref: "refs/heads/main",
    workflow_ref: `${config.githubRepository}/.github/workflows/cron-tick.yml@refs/heads/main`,
    iat: seconds - 5,
    nbf: seconds - 5,
    exp: seconds + 300,
    ...claims,
  });
  return `${head}.${body}.${sign("RSA-SHA256", Buffer.from(`${head}.${body}`), key).toString("base64url")}`;
}

// ADR 0012: GitHub's workflows prove who they are with GitHub's OIDC token, so no secret lives on GitHub.
describe("GitHub's OIDC proof", () => {
  beforeAll(() => {
    vi.stubGlobal("fetch", async () => ({ ok: true, json: async () => ({ keys: [{ ...publicKey.export({ format: "jwk" }), kid: "test-kid", alg: "RS256" }] }) }));
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("accepts the named workflow of our repository, run on main", async () => {
    expect(await isGithubWorkflow(githubToken(), "cron-tick.yml", NOW)).toBe(true);
  });

  it("refuses another workflow, branch, repository, audience or issuer", async () => {
    expect(await isGithubWorkflow(githubToken(), "mirror-art.yml", NOW)).toBe(false);
    expect(await isGithubWorkflow(githubToken({ ref: "refs/heads/stack/x", workflow_ref: `${config.githubRepository}/.github/workflows/cron-tick.yml@refs/heads/stack/x` }), "cron-tick.yml", NOW)).toBe(false);
    expect(await isGithubWorkflow(githubToken({ repository: "someone/fork", workflow_ref: "someone/fork/.github/workflows/cron-tick.yml@refs/heads/main" }), "cron-tick.yml", NOW)).toBe(false);
    expect(await isGithubWorkflow(githubToken({ aud: "https://elsewhere.example" }), "cron-tick.yml", NOW)).toBe(false);
    expect(await isGithubWorkflow(githubToken({ iss: "https://token.example" }), "cron-tick.yml", NOW)).toBe(false);
  });

  it("refuses an expired token or one not valid yet", async () => {
    expect(await isGithubWorkflow(githubToken({ exp: seconds - 120 }), "cron-tick.yml", NOW)).toBe(false);
    expect(await isGithubWorkflow(githubToken({ nbf: seconds + 600 }), "cron-tick.yml", NOW)).toBe(false);
  });

  it("refuses a forged signature, another algorithm, an unknown key and garbage", async () => {
    expect(await isGithubWorkflow(githubToken({}, { key: stranger.privateKey }), "cron-tick.yml", NOW)).toBe(false);
    const [head, body] = githubToken().split(".");
    const unsigned = `${encode({ alg: "none", kid: "test-kid" })}.${body}.`;
    expect(await isGithubWorkflow(unsigned, "cron-tick.yml", NOW)).toBe(false);
    expect(await isGithubWorkflow(`${head}.${encode({ ...JSON.parse(Buffer.from(body!, "base64url").toString()), workflow_ref: "x" })}.${githubToken().split(".")[2]}`, "cron-tick.yml", NOW)).toBe(false);
    expect(await isGithubWorkflow(githubToken({}, { header: { kid: "other-kid" } }), "cron-tick.yml", NOW)).toBe(false);
    expect(await isGithubWorkflow("not.a.token", "cron-tick.yml", NOW)).toBe(false);
    expect(await isGithubWorkflow(undefined, "cron-tick.yml", NOW)).toBe(false);
  });
});
