// vitest setupFile: runs in each worker BEFORE any test module (and therefore
// before config.ts / prisma.ts are imported). Points the app at the throwaway
// SQLite test DB and fills in the env the routes need. Node's .env loader does
// not override already-set vars, so a stray local .env can't clobber these.
import { generateKeyPairSync } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
// Forward slashes so the file: URL is valid for the Prisma client on Windows.
process.env.DATABASE_URL = `file:${resolve(root, "prisma/test.db").replace(/\\/g, "/")}`;
process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;

// The dev-login user is our admin in tests.
process.env.ADMIN_DISCORD_IDS = "dev-local-user";
process.env.DEV_LOGIN_ENABLED = "true";
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
process.env.COOKIE_SECURE = "false";

// A real Ed25519 keypair so the Discord interactions endpoint mounts and can
// be exercised with valid signatures. The private key is stashed for tests.
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const rawPublic = publicKey.export({ type: "spki", format: "der" }).subarray(-32);
process.env.DISCORD_PUBLIC_KEY = Buffer.from(rawPublic).toString("hex");
(globalThis as { __discordPrivateKey?: unknown }).__discordPrivateKey = privateKey;
