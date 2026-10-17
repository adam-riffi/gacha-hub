import { createPublicKey, verify, type JsonWebKey } from "node:crypto";
import { config } from "../config.js";

const ISSUER = "https://token.actions.githubusercontent.com";
const KEYS_TTL_MS = 3_600_000;
const SKEW_SECONDS = 60;

type GithubKey = JsonWebKey & { kid?: string };
let cachedKeys: { fetchedAt: number; keys: GithubKey[] } | null = null;

/** GitHub's signing keys, kept an hour; fetched again when a token names a key we do not have. */
async function githubKeys(kid: string, now: number): Promise<GithubKey | undefined> {
  const fresh = cachedKeys && now - cachedKeys.fetchedAt < KEYS_TTL_MS;
  const known = fresh ? cachedKeys!.keys.find((key) => key.kid === kid) : undefined;
  if (known || (cachedKeys && now - cachedKeys.fetchedAt < SKEW_SECONDS * 1000)) return known;
  const response = await fetch(`${ISSUER}/.well-known/jwks`);
  if (!response.ok) return undefined;
  cachedKeys = { fetchedAt: now, keys: ((await response.json()) as { keys: GithubKey[] }).keys };
  return cachedKeys.keys.find((key) => key.kid === kid);
}

/**
 * Whether a bearer token is GitHub's OIDC proof that `workflow` of our
 * repository ran on main, for this app (ADR 0012): RS256 only, GitHub's
 * issuer and keys, our URL as the audience, within its lifetime.
 */
export async function isGithubWorkflow(token: string | undefined, workflow: string, now = Date.now()): Promise<boolean> {
  const [head, body, signature, extra] = (token ?? "").split(".");
  if (!head || !body || !signature || extra !== undefined) return false;
  try {
    const header = JSON.parse(Buffer.from(head, "base64url").toString()) as { alg?: string; kid?: string };
    if (header.alg !== "RS256" || !header.kid) return false;
    const key = await githubKeys(header.kid, now);
    if (!key || !verify("RSA-SHA256", Buffer.from(`${head}.${body}`), createPublicKey({ key, format: "jwk" }), Buffer.from(signature, "base64url"))) return false;
    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as Record<string, unknown>;
    const seconds = now / 1000;
    return (
      claims.iss === ISSUER &&
      claims.aud === config.appBaseUrl &&
      typeof claims.exp === "number" &&
      claims.exp > seconds - SKEW_SECONDS &&
      (typeof claims.nbf !== "number" || claims.nbf <= seconds + SKEW_SECONDS) &&
      claims.repository === config.githubRepository &&
      claims.ref === "refs/heads/main" &&
      claims.workflow_ref === `${config.githubRepository}/.github/workflows/${workflow}@refs/heads/main`
    );
  } catch {
    return false;
  }
}
