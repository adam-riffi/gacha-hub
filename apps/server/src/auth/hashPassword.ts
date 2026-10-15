import { createInterface } from "node:readline/promises";
import { OwnerPassword } from "./ownerPassword.js";

/**
 * `npm run password:hash` (ADR 0010): reads the owner password and prints the `OWNER_PASSWORD_HASH` line to set in
 * Vercel. Only the hash leaves this terminal.
 */
const MINIMUM_LENGTH = 12;
const reader = createInterface({ input: process.stdin, output: process.stderr });
const password = await reader.question(`Owner password (${MINIMUM_LENGTH} characters at least): `);
reader.close();
if (password.length < MINIMUM_LENGTH) {
  console.error(`Too short: ${MINIMUM_LENGTH} characters at least.`);
  process.exit(1);
}
console.log(`OWNER_PASSWORD_HASH=${await OwnerPassword.hash(password)}`);
