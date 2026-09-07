import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyDiscordSignature } from "./interactions.js";

// Discord signs `timestamp + body` with Ed25519 and sends the raw 32-byte
// public key as hex. Reproduce that locally to prove verification works.
function makeKeys() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  // SPKI DER = 12-byte prefix + 32-byte raw key.
  const raw = publicKey.export({ type: "spki", format: "der" }).subarray(-32);
  return { privateKey, publicKeyHex: Buffer.from(raw).toString("hex") };
}

describe("verifyDiscordSignature", () => {
  const { privateKey, publicKeyHex } = makeKeys();
  const timestamp = "1700000000";
  const body = JSON.stringify({ type: 1 });
  const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString("hex");

  it("accepts a valid signature", async () => {
    expect(await verifyDiscordSignature(body, signature, timestamp, publicKeyHex)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const tampered = JSON.stringify({ type: 2 });
    expect(await verifyDiscordSignature(tampered, signature, timestamp, publicKeyHex)).toBe(false);
  });

  it("rejects a wrong key", async () => {
    const other = makeKeys().publicKeyHex;
    expect(await verifyDiscordSignature(body, signature, timestamp, other)).toBe(false);
  });

  it("rejects missing headers", async () => {
    expect(await verifyDiscordSignature(body, undefined, timestamp, publicKeyHex)).toBe(false);
    expect(await verifyDiscordSignature(body, signature, undefined, publicKeyHex)).toBe(false);
  });
});
